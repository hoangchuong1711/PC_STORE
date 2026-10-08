"""Generate the T22 Builder spec seed from the sourced T09 catalog JSON."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/data/t09_catalog.json"
TARGET = ROOT / "backend/src/main/resources/db/seed/t22_builder_specs.sql"

TABLES = {
    "CPU": ("cpu_specs", ["socketCode", "cores", "threads", "baseClockGhz", "boostClockGhz", "tdpWatts"]),
    "MOTHERBOARD": ("motherboard_specs", ["socketCode", "chipset", "ramType", "pcieVersion", "formFactorCode", "ramSlots", "maxRamGb"]),
    "RAM": ("ram_specs", ["ramType", "capacityGb", "speedMhz", "moduleCount"]),
    "GPU": ("gpu_specs", ["vramGb", "memoryType", "interfaceType", "lengthMm", "powerConsumptionW", "recommendedPsuW"]),
    "STORAGE": ("storage_specs", ["storageType", "interfaceType", "capacityGb", "readSpeedMBps", "writeSpeedMBps"]),
    "PSU": ("psu_specs", ["wattage", "efficiencyRating", "modularType"]),
    "CASE": ("case_specs", ["maxGpuLengthMm", "maxCoolerHeightMm", "maxRadiatorSizeMm"]),
    "COOLER": ("cooler_specs", ["coolerType", "maxTdpW", "heightMm", "radiatorSizeMm"]),
}


def snake(name):
    return {"readSpeedMBps": "read_speed_mbps", "writeSpeedMBps": "write_speed_mbps"}.get(
        name, "".join(("_" + c.lower()) if c.isupper() else c for c in name).lstrip("_")
    )


def quote(value):
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def main():
    products = json.loads(SOURCE.read_text(encoding="utf-8"))["products"]
    selected = [p for p in products if p["componentType"] in TABLES]
    if len(selected) != 40 or any(sum(p["componentType"] == kind for p in selected) != 5 for kind in TABLES):
        raise ValueError("Expected five sourced T09 products for each of eight Builder groups")
    lines = [
        "-- T22 Builder specs. Generated from docs/data/t09_catalog.json by scripts/generate_t22_seed.py.",
        "-- Run after Flyway V3+ and t09_catalog.sql; use a disposable DB to validate first.",
        "-- Existing spec rows are preserved. This is demo data, not a migration.",
        "BEGIN;",
        "SET LOCAL client_encoding = 'UTF8';",
        "CREATE TEMP TABLE t22_catalog(name text, brand text, component_type text, spec jsonb, support jsonb) ON COMMIT DROP;",
        "INSERT INTO t22_catalog VALUES",
    ]
    rows = []
    for p in selected:
        spec = p["spec"]
        required = [field for field in TABLES[p["componentType"]][1] if field != "radiatorSizeMm"]
        if not p.get("sources") or any(field not in spec or spec[field] is None for field in required):
            raise ValueError("Missing source or mandatory spec: " + p["catalogCode"])
        rows.append("  (" + ", ".join(quote(x) for x in (
            p["name"], p["brand"], p["componentType"],
            json.dumps(spec, ensure_ascii=False, separators=(",", ":")),
            json.dumps(p.get("support", {}), ensure_ascii=False, separators=(",", ":")),
        )) + ")")
    lines.append(",\n".join(rows) + ";")
    lines += [
        "DO $check$ BEGIN",
        "  IF EXISTS (SELECT 1 FROM t22_catalog s LEFT JOIN products p ON p.name=s.name",
        "    LEFT JOIN brands b ON b.brand_id=p.brand_id LEFT JOIN categories c ON c.category_id=p.category_id",
        "    GROUP BY s.name,s.brand,s.component_type HAVING count(p.product_id)<>1",
        "      OR bool_or(b.name IS DISTINCT FROM s.brand OR c.name IS DISTINCT FROM s.component_type",
        "        OR c.component_type::text IS DISTINCT FROM s.component_type)) THEN",
        "    RAISE EXCEPTION 'T22: T09 catalog missing, ambiguous, or changed';",
        "  END IF;",
        "END $check$;",
        "INSERT INTO sockets(socket_code,name) SELECT DISTINCT spec->>'socketCode', spec->>'socketCode'",
        "  FROM t22_catalog WHERE component_type IN ('CPU','MOTHERBOARD') ON CONFLICT DO NOTHING;",
        "INSERT INTO form_factors(form_factor_code,name)",
        "  SELECT DISTINCT f.code,f.code FROM t22_catalog s",
        "  CROSS JOIN LATERAL jsonb_array_elements_text(s.support->'supportedFormFactorCodes') f(code)",
        "  WHERE s.component_type='CASE' ON CONFLICT DO NOTHING;",
    ]
    for kind, (table, fields) in TABLES.items():
        columns = [snake(f) for f in fields]
        expressions = []
        for field in fields:
            value = "s.spec->>" + quote(field)
            if field in {"cores", "threads", "tdpWatts", "ramSlots", "maxRamGb", "capacityGb", "speedMhz", "moduleCount", "vramGb", "lengthMm", "powerConsumptionW", "recommendedPsuW", "readSpeedMBps", "writeSpeedMBps", "wattage", "maxGpuLengthMm", "maxCoolerHeightMm", "maxRadiatorSizeMm", "maxTdpW", "heightMm", "radiatorSizeMm"}:
                value = "(" + value + ")::integer"
            elif field in {"baseClockGhz", "boostClockGhz"}:
                value = "(" + value + ")::double precision"
            expressions.append(value)
        lines.append(f"INSERT INTO {table}(product_id,{','.join(columns)})")
        lines.append("  SELECT p.product_id," + ",".join(expressions))
        lines.append("  FROM t22_catalog s JOIN products p ON p.name=s.name")
        lines.append(f"  WHERE s.component_type={quote(kind)} ON CONFLICT (product_id) DO NOTHING;")
    lines += [
        "INSERT INTO case_supported_form_factors(case_product_id,form_factor_code)",
        "  SELECT p.product_id, f.code FROM t22_catalog s JOIN products p ON p.name=s.name",
        "  CROSS JOIN LATERAL jsonb_array_elements_text(s.support->'supportedFormFactorCodes') f(code)",
        "  WHERE s.component_type='CASE' ON CONFLICT DO NOTHING;",
        "INSERT INTO cooler_supported_sockets(cooler_product_id,socket_code)",
        "  SELECT p.product_id, sk.code FROM t22_catalog s JOIN products p ON p.name=s.name",
        "  CROSS JOIN LATERAL jsonb_array_elements_text(s.support->'supportedSocketCodes') sk(code)",
        "  WHERE s.component_type='COOLER' ON CONFLICT DO NOTHING;",
        "COMMIT;",
    ]
    TARGET.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

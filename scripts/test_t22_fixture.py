"""Contract checks for the T22 hand-reviewed Builder examples."""

import json
from copy import deepcopy
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "docs/data/t09_catalog.json"
CASES = ROOT / "docs/data/t22_builder_cases.json"
RULES = {
    "cpu_main_socket", "cpu_cooler_socket", "ram_type", "ram_slots", "ram_capacity",
    "main_case_form_factor", "gpu_case_length", "cooler_case_height", "psu_gpu_wattage",
}
SLOTS = {"CPU", "MOTHERBOARD", "RAM", "GPU", "STORAGE", "PSU", "CASE", "COOLER"}


def status(build, rule):
    def read(slot, section, field):
        return build[slot]["product"].get(section, {}).get(field)

    def compare(left, right, operation):
        if left is None or right is None:
            return "UNKNOWN"
        return "PASS" if operation(left, right) else "FAIL"

    if rule == "cpu_main_socket":
        return compare(read("CPU", "spec", "socketCode"), read("MOTHERBOARD", "spec", "socketCode"), lambda a, b: a == b)
    if rule == "cpu_cooler_socket":
        return compare(read("CPU", "spec", "socketCode"), read("COOLER", "support", "supportedSocketCodes"), lambda a, b: a in b)
    if rule == "ram_type":
        return compare(read("RAM", "spec", "ramType"), read("MOTHERBOARD", "spec", "ramType"), lambda a, b: a == b)
    if rule == "ram_slots":
        modules = read("RAM", "spec", "moduleCount")
        used = None if modules is None else modules * build["RAM"]["quantity"]
        return compare(used, read("MOTHERBOARD", "spec", "ramSlots"), lambda a, b: a <= b)
    if rule == "ram_capacity":
        capacity = read("RAM", "spec", "capacityGb")
        total = None if capacity is None else capacity * build["RAM"]["quantity"]
        return compare(total, read("MOTHERBOARD", "spec", "maxRamGb"), lambda a, b: a <= b)
    if rule == "main_case_form_factor":
        return compare(read("MOTHERBOARD", "spec", "formFactorCode"), read("CASE", "support", "supportedFormFactorCodes"), lambda a, b: a in b)
    if rule == "gpu_case_length":
        return compare(read("GPU", "spec", "lengthMm"), read("CASE", "spec", "maxGpuLengthMm"), lambda a, b: a <= b)
    if rule == "cooler_case_height":
        return compare(read("COOLER", "spec", "heightMm"), read("CASE", "spec", "maxCoolerHeightMm"), lambda a, b: a <= b)
    if rule == "psu_gpu_wattage":
        return compare(read("PSU", "spec", "wattage"), read("GPU", "spec", "recommendedPsuW"), lambda a, b: a >= b)
    raise ValueError(rule)


def materialize(selection, catalog, replace=None, overrides=None):
    selection = {**selection, **(replace or {})}
    build = {slot: {"product": deepcopy(catalog[item["catalogCode"]]), "quantity": item["quantity"]}
             for slot, item in selection.items()}
    for path, value in (overrides or {}).items():
        slot, section, field = path.split(".")
        build[slot]["product"][section][field] = value
    return build


class BuilderFixtureTest(unittest.TestCase):
    def test_fixture_exists(self):
        self.assertTrue(CASES.is_file(), "T22 expected-result fixture is missing")

    def test_two_complete_real_builds_and_fail_unknown_per_rule(self):
        self.assertTrue(CASES.is_file(), "T22 expected-result fixture is missing")
        catalog = {p["catalogCode"]: p for p in json.loads(CATALOG.read_text(encoding="utf-8"))["products"]}
        fixture = json.loads(CASES.read_text(encoding="utf-8"))
        builds = fixture["builds"]
        self.assertGreaterEqual(len(builds), 2)
        for build in builds:
            self.assertEqual(SLOTS, set(build["selection"]))
            for slot, item in build["selection"].items():
                product = catalog[item["catalogCode"]]
                self.assertEqual(slot, product["componentType"])
                self.assertGreater(item["quantity"], 0)
                self.assertTrue(product["sources"])
            self.assertEqual({rule: "PASS" for rule in RULES}, build["expected"])
            actual = materialize(build["selection"], catalog)
            for rule in RULES:
                self.assertEqual("PASS", status(actual, rule), (build["id"], rule))
        seen = {(case["rule"], case["expected"]) for case in fixture["cases"]}
        self.assertEqual({(rule, state) for rule in RULES for state in ("FAIL", "UNKNOWN")}, seen)
        ids = {build["id"] for build in builds}
        by_id = {build["id"]: build for build in builds}
        for case in fixture["cases"]:
            self.assertIn(case["baseBuild"], ids)
            self.assertTrue(case["reason"].strip())
            self.assertTrue(case.get("replace") or case.get("overrides"))
            for slot, item in case.get("replace", {}).items():
                self.assertEqual(slot, catalog[item["catalogCode"]]["componentType"])
                self.assertGreater(item["quantity"], 0)
            actual = materialize(by_id[case["baseBuild"]]["selection"], catalog,
                                 case.get("replace"), case.get("overrides"))
            self.assertEqual(case["expected"], status(actual, case["rule"]), case["id"])


if __name__ == "__main__":
    unittest.main()

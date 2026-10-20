export type ProductComponentType =
  | "CPU" | "MOTHERBOARD" | "RAM" | "GPU" | "STORAGE" | "PSU" | "CASE" | "COOLER";

export type ProductSpecField = {
  key: string;
  label: string;
  kind: "text" | "integer" | "decimal" | "codes";
  min?: number;
  optional?: boolean;
  hint?: string;
  unit?: string;
  options?: string[];
};

const t = (key: string, label: string, options?: string[], hint?: string): ProductSpecField => ({
  key, label, kind: "text", options, hint,
});
const i = (key: string, label: string, min = 1, unit?: string, hint?: string): ProductSpecField => ({
  key, label, kind: "integer", min, unit, hint,
});
const d = (key: string, label: string, unit?: string, hint?: string): ProductSpecField => ({
  key, label, kind: "decimal", min: 0.01, unit, hint,
});

const STANDARD_SOCKETS = ["LGA1700", "AM5", "AM4", "LGA1200", "LGA1151"];
const STANDARD_FORM_FACTORS = ["ATX", "Micro-ATX", "Mini-ITX", "E-ATX"];
const STANDARD_RAM_TYPES = ["DDR5", "DDR4"];

export const productSpecFields: Record<ProductComponentType, ProductSpecField[]> = {
  CPU: [
    t("socketCode", "Socket", STANDARD_SOCKETS),
    i("cores", "Số nhân", 1, "Nhân"),
    i("threads", "Số luồng", 1, "Luồng"),
    d("baseClockGhz", "Xung cơ bản", "GHz"),
    d("boostClockGhz", "Xung boost", "GHz"),
    i("tdpWatts", "Công suất TDP", 0, "W"),
  ],
  MOTHERBOARD: [
    t("socketCode", "Socket", STANDARD_SOCKETS),
    t("chipset", "Chipset", undefined, "Ví dụ: B760, Z790, B650"),
    t("ramType", "Chuẩn RAM", STANDARD_RAM_TYPES),
    t("pcieVersion", "Phiên bản PCIe", ["PCIe 5.0", "PCIe 4.0", "PCIe 3.0"]),
    t("formFactorCode", "Kích thước (Form factor)", STANDARD_FORM_FACTORS),
    i("ramSlots", "Số khe RAM", 1, "Khe"),
    i("maxRamGb", "RAM tối đa", 1, "GB"),
  ],
  RAM: [
    t("ramType", "Chuẩn RAM", STANDARD_RAM_TYPES),
    i("capacityGb", "Dung lượng", 1, "GB"),
    i("speedMhz", "Tốc độ", 1, "MHz"),
    i("moduleCount", "Số thanh RAM", 1, "Thanh"),
  ],
  GPU: [
    i("vramGb", "Dung lượng VRAM", 1, "GB"),
    t("memoryType", "Loại bộ nhớ", ["GDDR6X", "GDDR6", "GDDR5"]),
    t("interfaceType", "Giao tiếp", ["PCIe 4.0 x16", "PCIe 5.0 x16", "PCIe 3.0 x16"]),
    i("lengthMm", "Chiều dài", 1, "mm"),
    i("powerConsumptionW", "Điện tiêu thụ", 0, "W"),
    i("recommendedPsuW", "Nguồn đề xuất", 1, "W"),
  ],
  STORAGE: [
    t("storageType", "Loại ổ", ["SSD M.2 NVMe", "SSD 2.5 SATA", "HDD 3.5 SATA"]),
    t("interfaceType", "Giao tiếp", ["PCIe 4.0 NVMe", "PCIe 3.0 NVMe", "SATA 3"]),
    i("capacityGb", "Dung lượng", 1, "GB"),
    i("readSpeedMBps", "Tốc độ đọc", 0, "MB/s"),
    i("writeSpeedMBps", "Tốc độ ghi", 0, "MB/s"),
  ],
  PSU: [
    i("wattage", "Công suất", 1, "W"),
    t("efficiencyRating", "Chuẩn hiệu suất", [
      "80 Plus Titanium",
      "80 Plus Platinum",
      "80 Plus Gold",
      "80 Plus Silver",
      "80 Plus Bronze",
      "80 Plus Standard",
    ]),
    t("modularType", "Kiểu dây nguồn", ["Full Modular", "Semi-Modular", "Non-Modular"]),
  ],
  CASE: [
    i("maxGpuLengthMm", "VGA dài tối đa", 1, "mm"),
    i("maxCoolerHeightMm", "Tản khí cao tối đa", 1, "mm"),
    i("maxRadiatorSizeMm", "Radiator tối đa", 0, "mm"),
    {
      key: "supportedFormFactors",
      label: "Form factor hỗ trợ",
      kind: "codes",
      hint: "Chọn các kích cỡ case hỗ trợ",
      options: STANDARD_FORM_FACTORS,
    },
  ],
  COOLER: [
    t("coolerType", "Loại tản nhiệt", ["AIR", "AIO", "LIQUID"]),
    i("maxTdpW", "TDP tối đa", 1, "W"),
    { ...i("heightMm", "Chiều cao", 1, "mm"), optional: true },
    { ...i("radiatorSizeMm", "Radiator", 1, "mm"), optional: true },
    {
      key: "supportedSockets",
      label: "Socket hỗ trợ",
      kind: "codes",
      hint: "Chọn các socket tản nhiệt hỗ trợ",
      options: STANDARD_SOCKETS,
    },
  ],
};

export function isProductComponentType(value: string | null | undefined): value is ProductComponentType {
  return !!value && Object.prototype.hasOwnProperty.call(productSpecFields, value);
}

export function collectProductSpec(
  type: ProductComponentType,
  draft: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const spec: Record<string, unknown> = {};
  for (const field of productSpecFields[type]) {
    const raw = draft?.[field.key];
    if (raw === undefined || raw === null || raw === "") {
      if (field.optional) continue;
      throw new Error(`Vui lòng nhập ${field.label}.`);
    }
    if (field.kind === "codes") {
      const codes = (Array.isArray(raw) ? raw : String(raw).split(","))
        .map((code) => String(code).trim()).filter(Boolean);
      if (codes.length === 0 || new Set(codes).size !== codes.length) {
        throw new Error(`${field.label} phải có mã hợp lệ, không trùng.`);
      }
      spec[field.key] = codes;
    } else if (field.kind === "integer" || field.kind === "decimal") {
      const number = Number(raw);
      if (!Number.isFinite(number) || number < (field.min ?? 0) ||
          (field.kind === "integer" && !Number.isSafeInteger(number))) {
        throw new Error(`${field.label} phải là số hợp lệ.`);
      }
      spec[field.key] = number;
    } else {
      const text = String(raw).trim();
      if (!text) throw new Error(`Vui lòng nhập ${field.label}.`);
      spec[field.key] = text;
    }
  }
  return spec;
}

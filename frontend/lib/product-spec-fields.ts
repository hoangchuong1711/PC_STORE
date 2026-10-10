export type ProductComponentType =
  | "CPU" | "MOTHERBOARD" | "RAM" | "GPU" | "STORAGE" | "PSU" | "CASE" | "COOLER";

export type ProductSpecField = {
  key: string;
  label: string;
  kind: "text" | "integer" | "decimal" | "codes";
  min?: number;
  optional?: boolean;
  hint?: string;
};

const t = (key: string, label: string): ProductSpecField => ({ key, label, kind: "text" });
const i = (key: string, label: string, min = 1): ProductSpecField => ({ key, label, kind: "integer", min });
const d = (key: string, label: string): ProductSpecField => ({ key, label, kind: "decimal", min: 0.01 });

export const productSpecFields: Record<ProductComponentType, ProductSpecField[]> = {
  CPU: [t("socketCode", "Socket"), i("cores", "Số nhân"), i("threads", "Số luồng"),
    d("baseClockGhz", "Xung cơ bản (GHz)"), d("boostClockGhz", "Xung boost (GHz)"), i("tdpWatts", "TDP (W)", 0)],
  MOTHERBOARD: [t("socketCode", "Socket"), t("chipset", "Chipset"), t("ramType", "Chuẩn RAM"),
    t("pcieVersion", "Phiên bản PCIe"), t("formFactorCode", "Form factor"),
    i("ramSlots", "Số khe RAM"), i("maxRamGb", "RAM tối đa (GB)")],
  RAM: [t("ramType", "Chuẩn RAM"), i("capacityGb", "Dung lượng (GB)"),
    i("speedMhz", "Tốc độ (MHz)"), i("moduleCount", "Số thanh RAM")],
  GPU: [i("vramGb", "VRAM (GB)"), t("memoryType", "Loại bộ nhớ"),
    t("interfaceType", "Giao tiếp"), i("lengthMm", "Chiều dài (mm)"),
    i("powerConsumptionW", "Điện tiêu thụ (W)", 0), i("recommendedPsuW", "Nguồn đề xuất (W)")],
  STORAGE: [t("storageType", "Loại ổ"), t("interfaceType", "Giao tiếp"),
    i("capacityGb", "Dung lượng (GB)"), i("readSpeedMBps", "Đọc (MB/s)", 0),
    i("writeSpeedMBps", "Ghi (MB/s)", 0)],
  PSU: [i("wattage", "Công suất (W)"), t("efficiencyRating", "Chuẩn hiệu suất"),
    t("modularType", "Kiểu dây nguồn")],
  CASE: [i("maxGpuLengthMm", "VGA dài tối đa (mm)"), i("maxCoolerHeightMm", "Tản khí cao tối đa (mm)"),
    i("maxRadiatorSizeMm", "Radiator tối đa (mm)", 0),
    { key: "supportedFormFactors", label: "Form factor hỗ trợ", kind: "codes", hint: "Ví dụ: ATX, Micro-ATX" }],
  COOLER: [t("coolerType", "Loại tản nhiệt (AIR/AIO/LIQUID)"), i("maxTdpW", "TDP tối đa (W)"),
    { ...i("heightMm", "Chiều cao (mm)"), optional: true },
    { ...i("radiatorSizeMm", "Radiator (mm)"), optional: true },
    { key: "supportedSockets", label: "Socket hỗ trợ", kind: "codes", hint: "Ví dụ: AM5, LGA1700" }],
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

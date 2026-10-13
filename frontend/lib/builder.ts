export type ComponentSlot =
  | "cpu"
  | "motherboard"
  | "ram"
  | "gpu"
  | "storage"
  | "psu"
  | "case"
  | "cooler";

export type BuilderProduct = {
  id: string;
  slot: ComponentSlot;
  name: string;
  brand: string;
  price: number;
  stock: number;
  accent: string;
  image?: string;
  specs: {
    socket?: string; // e.g. "LGA1700", "AM5"
    formFactor?: string; // e.g. "ATX", "Micro-ATX", "Mini-ITX"
    ramType?: string; // e.g. "DDR5", "DDR4"
    ramSlots?: number; // e.g. 4
    capacityGb?: number; // e.g. 32
    tdpWatts?: number; // e.g. 125, 65
    vramGb?: number; // e.g. 12, 16
    recommendedPsuW?: number; // e.g. 650, 750, 850
    wattage?: number; // for PSU, e.g. 750, 850, 1000
    efficiency?: string; // e.g. "80 Plus Gold"
    maxGpuLengthMm?: number; // for case, e.g. 380
    coolerType?: string; // "AIO 360", "Air Cooler"
    supportedSockets?: string[]; // for cooler
  };
};

export type CompatibilityStatus = "PASS" | "FAIL" | "UNKNOWN";

export type CompatibilityRuleResult = {
  id: string;
  name: string;
  status: CompatibilityStatus;
  message: string;
};

export const slotLabels: Record<ComponentSlot, { label: string; desc: string }> = {
  cpu: { label: "Bộ vi xử lý (CPU)", desc: "Bộ não xử lý mọi phép tính và khung hình game" },
  motherboard: { label: "Bo mạch chủ (Mainboard)", desc: "Xương sống kết nối tất cả linh kiện" },
  ram: { label: "Bộ nhớ trong (RAM)", desc: "Chạy đa nhiệm và duy trì ứng dụng mượt mà" },
  gpu: { label: "Card màn hình (VGA)", desc: "Xử lý đồ họa 3D, khử răng cưa và Ray Tracing" },
  storage: { label: "Ổ cứng (SSD NVMe)", desc: "Tốc độ khởi động máy và load màn game" },
  psu: { label: "Nguồn máy tính (PSU)", desc: "Trái tim cung cấp nguồn điện ổn định, an toàn" },
  case: { label: "Vỏ máy tính (Case)", desc: "Bảo vệ linh kiện và đối lưu luồng khí tản nhiệt" },
  cooler: { label: "Tản nhiệt CPU (Cooler)", desc: "Giữ nhiệt độ CPU mát mẻ khi tải nặng" },
};

export type PcBuildSelection = Partial<Record<ComponentSlot, BuilderProduct>>;

export function calculateEstimatedWattage(selection: PcBuildSelection): number {
  const cpuWatts = selection.cpu?.specs.tdpWatts ?? 65;
  const gpuWatts = selection.gpu?.specs.tdpWatts ?? 75;
  const systemBase = 60; // Motherboard, RAM, Fans, SSD
  return cpuWatts + gpuWatts + systemBase;
}

export function validateCompatibility(selection: PcBuildSelection): CompatibilityRuleResult[] {
  const results: CompatibilityRuleResult[] = [];

  // Rule 1: CPU <-> Motherboard Socket
  if (!selection.cpu || !selection.motherboard) {
    results.push({
      id: "socket-match",
      name: "Tương thích Chân cắm (Socket CPU & Mainboard)",
      status: "UNKNOWN",
      message: "Cần chọn cả CPU và Bo mạch chủ để kiểm tra socket.",
    });
  } else if (selection.cpu.specs.socket === selection.motherboard.specs.socket) {
    results.push({
      id: "socket-match",
      name: "Tương thích Chân cắm (Socket CPU & Mainboard)",
      status: "PASS",
      message: `Hoàn hảo! Cả CPU và Mainboard đều dùng socket ${selection.cpu.specs.socket}.`,
    });
  } else {
    results.push({
      id: "socket-match",
      name: "Tương thích Chân cắm (Socket CPU & Mainboard)",
      status: "FAIL",
      message: `Xung đột socket: CPU dùng ${selection.cpu.specs.socket} nhưng Bo mạch chủ dùng ${selection.motherboard.specs.socket}.`,
    });
  }

  // Rule 2: Motherboard <-> RAM
  if (!selection.motherboard || !selection.ram) {
    results.push({
      id: "ram-match",
      name: "Chuẩn Bộ nhớ (RAM & Mainboard)",
      status: "UNKNOWN",
      message: "Cần chọn Bo mạch chủ và RAM để kiểm tra chuẩn DDR.",
    });
  } else if (selection.motherboard.specs.ramType === selection.ram.specs.ramType) {
    results.push({
      id: "ram-match",
      name: "Chuẩn Bộ nhớ (RAM & Mainboard)",
      status: "PASS",
      message: `Chính xác! Chuẩn bộ nhớ ${selection.ram.specs.ramType} tương thích với khe cắm trên bo mạch.`,
    });
  } else {
    results.push({
      id: "ram-match",
      name: "Chuẩn Bộ nhớ (RAM & Mainboard)",
      status: "FAIL",
      message: `Không tương thích: Bo mạch chủ dùng ${selection.motherboard.specs.ramType} nhưng RAM là ${selection.ram.specs.ramType}.`,
    });
  }

  // Rule 3: PSU Wattage
  const estimatedW = calculateEstimatedWattage(selection);
  const recommendedW = selection.gpu?.specs.recommendedPsuW ?? (estimatedW + 150);

  if (!selection.psu) {
    results.push({
      id: "psu-match",
      name: "Công suất Nguồn điện (PSU Wattage)",
      status: "UNKNOWN",
      message: `Dàn máy ước tính tiêu thụ khoảng ${estimatedW}W. Khuyến nghị nguồn từ ${recommendedW}W trở lên.`,
    });
  } else if ((selection.psu.specs.wattage ?? 0) >= recommendedW) {
    results.push({
      id: "psu-match",
      name: "Công suất Nguồn điện (PSU Wattage)",
      status: "PASS",
      message: `Nguồn ${selection.psu.specs.wattage}W dư tải an toàn cho cấu hình (ước tính ${estimatedW}W).`,
    });
  } else {
    results.push({
      id: "psu-match",
      name: "Công suất Nguồn điện (PSU Wattage)",
      status: "FAIL",
      message: `Công suất nguồn chưa đủ: Nguồn ${selection.psu.specs.wattage}W thấp hơn mức khuyến nghị (${recommendedW}W) cho card đồ họa.`,
    });
  }

  // Rule 4: Case <-> Motherboard Form Factor
  if (!selection.case || !selection.motherboard) {
    results.push({
      id: "case-mb-match",
      name: "Kích cỡ Thùng máy (Case & Mainboard)",
      status: "UNKNOWN",
      message: "Cần chọn Vỏ case và Bo mạch chủ để kiểm tra form factor.",
    });
  } else {
    const caseFF = selection.case.specs.formFactor;
    const mbFF = selection.motherboard.specs.formFactor;
    // ATX case fits ATX and Micro-ATX. Micro-ATX case only fits Micro-ATX
    if (caseFF === "ATX" || caseFF === mbFF) {
      results.push({
        id: "case-mb-match",
        name: "Kích cỡ Thùng máy (Case & Mainboard)",
        status: "PASS",
        message: `Vỏ case ${caseFF} lắp vừa vặn bo mạch chủ kích thước ${mbFF}.`,
      });
    } else {
      results.push({
        id: "case-mb-match",
        name: "Kích cỡ Thùng máy (Case & Mainboard)",
        status: "FAIL",
        message: `Kích thước không vừa: Vỏ case ${caseFF} quá nhỏ để lắp bo mạch chủ ${mbFF}.`,
      });
    }
  }

  // Rule 5: CPU <-> Cooler Socket
  if (!selection.cpu || !selection.cooler) {
    results.push({
      id: "cooler-cpu-match",
      name: "Ngàm tản nhiệt (Cooler & CPU Socket)",
      status: "UNKNOWN",
      message: "Cần chọn CPU và Tản nhiệt để kiểm tra gông ngàm hỗ trợ.",
    });
  } else if (
    selection.cooler.specs.supportedSockets?.includes(selection.cpu.specs.socket ?? "")
  ) {
    results.push({
      id: "cooler-cpu-match",
      name: "Ngàm tản nhiệt (Cooler & CPU Socket)",
      status: "PASS",
      message: `Tản nhiệt hỗ trợ sẵn ngàm cho socket ${selection.cpu.specs.socket}.`,
    });
  } else {
    results.push({
      id: "cooler-cpu-match",
      name: "Ngàm tản nhiệt (Cooler & CPU Socket)",
      status: "FAIL",
      message: `Tản nhiệt không hỗ trợ chân cắm ${selection.cpu.specs.socket}.`,
    });
  }

  return results;
}

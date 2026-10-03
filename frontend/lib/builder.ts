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

export const builderCatalog: BuilderProduct[] = [
  // CPU
  {
    id: "cpu-1",
    slot: "cpu",
    name: "Intel Core i7-14700K",
    brand: "Intel",
    price: 10490000,
    stock: 14,
    accent: "#0071c5",
    specs: { socket: "LGA1700", tdpWatts: 125, ramType: "DDR5" },
  },
  {
    id: "cpu-2",
    slot: "cpu",
    name: "Intel Core i5-14600K",
    brand: "Intel",
    price: 7890000,
    stock: 20,
    accent: "#0071c5",
    specs: { socket: "LGA1700", tdpWatts: 125, ramType: "DDR5" },
  },
  {
    id: "cpu-3",
    slot: "cpu",
    name: "AMD Ryzen 7 7800X3D",
    brand: "AMD",
    price: 10890000,
    stock: 7,
    accent: "#ed1c24",
    specs: { socket: "AM5", tdpWatts: 120, ramType: "DDR5" },
  },
  {
    id: "cpu-4",
    slot: "cpu",
    name: "AMD Ryzen 5 7600X",
    brand: "AMD",
    price: 5490000,
    stock: 15,
    accent: "#ed1c24",
    specs: { socket: "AM5", tdpWatts: 105, ramType: "DDR5" },
  },

  // Motherboard
  {
    id: "mb-1",
    slot: "motherboard",
    name: "ASUS ROG STRIX B760-F Gaming WiFi",
    brand: "ASUS",
    price: 5690000,
    stock: 8,
    accent: "#6f55ff",
    specs: { socket: "LGA1700", formFactor: "ATX", ramType: "DDR5", ramSlots: 4 },
  },
  {
    id: "mb-2",
    slot: "motherboard",
    name: "MSI MAG B760M Mortar WiFi",
    brand: "MSI",
    price: 4390000,
    stock: 12,
    accent: "#ff0000",
    specs: { socket: "LGA1700", formFactor: "Micro-ATX", ramType: "DDR5", ramSlots: 4 },
  },
  {
    id: "mb-3",
    slot: "motherboard",
    name: "GIGABYTE B650 AORUS Elite AX",
    brand: "GIGABYTE",
    price: 5290000,
    stock: 9,
    accent: "#f5b700",
    specs: { socket: "AM5", formFactor: "ATX", ramType: "DDR5", ramSlots: 4 },
  },
  {
    id: "mb-4",
    slot: "motherboard",
    name: "ASUS TUF GAMING B650M-PLUS",
    brand: "ASUS",
    price: 4190000,
    stock: 11,
    accent: "#19b5fe",
    specs: { socket: "AM5", formFactor: "Micro-ATX", ramType: "DDR5", ramSlots: 4 },
  },

  // RAM
  {
    id: "ram-1",
    slot: "ram",
    name: "Kingston Fury Beast 32GB (2x16GB) DDR5 6000MHz",
    brand: "Kingston",
    price: 2690000,
    stock: 25,
    accent: "#a5dc36",
    specs: { ramType: "DDR5", capacityGb: 32 },
  },
  {
    id: "ram-2",
    slot: "ram",
    name: "Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz",
    brand: "Corsair",
    price: 3190000,
    stock: 18,
    accent: "#f9a825",
    specs: { ramType: "DDR5", capacityGb: 32 },
  },
  {
    id: "ram-3",
    slot: "ram",
    name: "G.Skill Trident Z5 RGB 64GB (2x32GB) DDR5 6400MHz",
    brand: "G.Skill",
    price: 5890000,
    stock: 6,
    accent: "#ec4899",
    specs: { ramType: "DDR5", capacityGb: 64 },
  },

  // GPU
  {
    id: "gpu-1",
    slot: "gpu",
    name: "GIGABYTE GeForce RTX 4070 Super Windforce 12GB",
    brand: "GIGABYTE",
    price: 16990000,
    stock: 12,
    accent: "#f5b700",
    specs: { vramGb: 12, recommendedPsuW: 650, tdpWatts: 220 },
  },
  {
    id: "gpu-2",
    slot: "gpu",
    name: "ASUS TUF Gaming GeForce RTX 4080 Super 16GB",
    brand: "ASUS",
    price: 31990000,
    stock: 5,
    accent: "#6f55ff",
    specs: { vramGb: 16, recommendedPsuW: 750, tdpWatts: 320 },
  },
  {
    id: "gpu-3",
    slot: "gpu",
    name: "MSI GeForce RTX 4060 Ventus 2X Black 8GB",
    brand: "MSI",
    price: 8490000,
    stock: 22,
    accent: "#ff0000",
    specs: { vramGb: 8, recommendedPsuW: 550, tdpWatts: 115 },
  },

  // Storage
  {
    id: "ssd-1",
    slot: "storage",
    name: "Samsung 990 Pro 2TB PCIe Gen 4.0 NVMe",
    brand: "Samsung",
    price: 4390000,
    stock: 14,
    accent: "#ec4899",
    specs: { capacityGb: 2000 },
  },
  {
    id: "ssd-2",
    slot: "storage",
    name: "Kingston KC3000 1TB PCIe Gen 4.0 NVMe",
    brand: "Kingston",
    price: 2490000,
    stock: 30,
    accent: "#a5dc36",
    specs: { capacityGb: 1000 },
  },

  // PSU
  {
    id: "psu-1",
    slot: "psu",
    name: "Corsair RM850e 850W 80 Plus Gold ATX 3.0",
    brand: "Corsair",
    price: 3290000,
    stock: 15,
    accent: "#f9a825",
    specs: { wattage: 850, efficiency: "80 Plus Gold" },
  },
  {
    id: "psu-2",
    slot: "psu",
    name: "MSI MAG A750GL 750W 80 Plus Gold PCIe 5.0",
    brand: "MSI",
    price: 2590000,
    stock: 19,
    accent: "#ff0000",
    specs: { wattage: 750, efficiency: "80 Plus Gold" },
  },
  {
    id: "psu-3",
    slot: "psu",
    name: "DeepCool PK650D 650W 80 Plus Bronze",
    brand: "DeepCool",
    price: 1390000,
    stock: 24,
    accent: "#0ea5e9",
    specs: { wattage: 650, efficiency: "80 Plus Bronze" },
  },

  // Case
  {
    id: "case-1",
    slot: "case",
    name: "NZXT H5 Flow RGB Matte Black (Kèm 2 Fan RGB)",
    brand: "NZXT",
    price: 2390000,
    stock: 8,
    accent: "#64748b",
    specs: { formFactor: "ATX", maxGpuLengthMm: 365 },
  },
  {
    id: "case-2",
    slot: "case",
    name: "Corsair 4000D Airflow Tempered Glass Black",
    brand: "Corsair",
    price: 2090000,
    stock: 10,
    accent: "#f9a825",
    specs: { formFactor: "ATX", maxGpuLengthMm: 360 },
  },
  {
    id: "case-3",
    slot: "case",
    name: "Montech AIR 100 ARGB Black (Micro-ATX)",
    brand: "Montech",
    price: 1290000,
    stock: 12,
    accent: "#3b82f6",
    specs: { formFactor: "Micro-ATX", maxGpuLengthMm: 330 },
  },

  // Cooler
  {
    id: "cooler-1",
    slot: "cooler",
    name: "DeepCool LT720 AIO 360mm ARGB",
    brand: "DeepCool",
    price: 2890000,
    stock: 9,
    accent: "#0ea5e9",
    specs: { coolerType: "AIO 360", supportedSockets: ["LGA1700", "AM5", "AM4"] },
  },
  {
    id: "cooler-2",
    slot: "cooler",
    name: "Thermalright Peerless Assassin 120 SE ARGB",
    brand: "Thermalright",
    price: 890000,
    stock: 25,
    accent: "#6366f1",
    specs: { coolerType: "Air Cooler", supportedSockets: ["LGA1700", "AM5", "AM4"] },
  },
];

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

export const presetBuilds: {
  name: string;
  tag: string;
  desc: string;
  selection: PcBuildSelection;
}[] = [
  {
    name: "Dàn Gaming Esport 2026",
    tag: "Phổ biến",
    desc: "Cân mọi tựa game Esport và AAA 1440p mượt mà với Intel Gen 14th và RTX 4070 Super.",
    selection: {
      cpu: builderCatalog.find((i) => i.id === "cpu-1"),
      motherboard: builderCatalog.find((i) => i.id === "mb-1"),
      ram: builderCatalog.find((i) => i.id === "ram-1"),
      gpu: builderCatalog.find((i) => i.id === "gpu-1"),
      storage: builderCatalog.find((i) => i.id === "ssd-2"),
      psu: builderCatalog.find((i) => i.id === "psu-1"),
      case: builderCatalog.find((i) => i.id === "case-1"),
      cooler: builderCatalog.find((i) => i.id === "cooler-1"),
    },
  },
  {
    name: "Dàn AMD High-End Creator",
    tag: "Đỉnh cao",
    desc: "Vua gaming Ryzen 7 7800X3D kết hợp RTX 4080 Super 16GB cho render 4K và Ray Tracing cực đỉnh.",
    selection: {
      cpu: builderCatalog.find((i) => i.id === "cpu-3"),
      motherboard: builderCatalog.find((i) => i.id === "mb-3"),
      ram: builderCatalog.find((i) => i.id === "ram-3"),
      gpu: builderCatalog.find((i) => i.id === "gpu-2"),
      storage: builderCatalog.find((i) => i.id === "ssd-1"),
      psu: builderCatalog.find((i) => i.id === "psu-1"),
      case: builderCatalog.find((i) => i.id === "case-2"),
      cooler: builderCatalog.find((i) => i.id === "cooler-1"),
    },
  },
];

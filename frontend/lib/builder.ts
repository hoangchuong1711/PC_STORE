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
  image?: string;
  specs: {
    socket?: string;
    formFactor?: string;
    ramType?: string;
    capacityGb?: number;
    wattage?: number;
    efficiency?: string;
  };
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

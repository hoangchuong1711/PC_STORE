export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  oldPrice?: number;
  stock: number;
  description: string;
  specs: Record<string, string>;
  accent: string;
  badge?: string;
  featured?: boolean;
};

export const categories = [
  { name: "Laptop", count: "24 sản phẩm", tone: "violet" },
  { name: "PC Gaming", count: "18 sản phẩm", tone: "cyan" },
  { name: "Linh kiện", count: "96 sản phẩm", tone: "orange" },
  { name: "Phụ kiện", count: "42 sản phẩm", tone: "lime" },
];

export const products: Product[] = [
  { id: "p1", slug: "rog-strix-g16-2025", name: "ROG Strix G16 2025", brand: "ASUS", category: "Laptop", price: 38990000, oldPrice: 41990000, stock: 8, description: "Laptop gaming cân bằng giữa hiệu năng mạnh và kiểu dáng sắc gọn cho những phiên chơi dài.", specs: { CPU: "Intel Core Ultra 9", GPU: "RTX 5070 8GB", RAM: "32GB DDR5", SSD: "1TB NVMe", Screen: "16 inch · 240Hz" }, accent: "#6f55ff", badge: "Mới về", featured: true },
  { id: "p2", slug: "tuf-gaming-a15", name: "TUF Gaming A15", brand: "ASUS", category: "Laptop", price: 24990000, oldPrice: 27990000, stock: 5, description: "Thiết kế bền bỉ, màn hình nhanh và pin đủ lâu cho học tập lẫn gaming.", specs: { CPU: "Ryzen 7 8845HS", GPU: "RTX 4060 8GB", RAM: "16GB DDR5", SSD: "512GB NVMe", Screen: "15.6 inch · 144Hz" }, accent: "#19b5fe", badge: "-11%", featured: true },
  { id: "p3", slug: "pc-creator-pro-x", name: "PC Creator Pro X", brand: "PC Store", category: "PC Gaming", price: 52990000, stock: 3, description: "Cỗ máy hiệu suất cao cho dựng phim, render và chơi game ở độ phân giải lớn.", specs: { CPU: "Core i9-14900K", GPU: "RTX 4080 Super", RAM: "64GB DDR5", SSD: "2TB NVMe", PSU: "850W Gold" }, accent: "#ff6a3d", badge: "Bán chạy", featured: true },
  { id: "p4", slug: "rtx-4070-super-dual", name: "RTX 4070 Super Dual", brand: "GIGABYTE", category: "Linh kiện", price: 16990000, stock: 12, description: "GPU mát, yên tĩnh và sẵn sàng cho game 1440p.", specs: { Chip: "Ada Lovelace", VRAM: "12GB GDDR6X", Ports: "3x DP · 1x HDMI", Power: "650W" }, accent: "#f5b700" },
  { id: "p5", slug: "kingston-fury-32gb", name: "Kingston Fury 32GB", brand: "Kingston", category: "Linh kiện", price: 2190000, stock: 20, description: "Bộ nhớ DDR5 ổn định, tốc độ cao cho hệ thống đa nhiệm.", specs: { Capacity: "32GB (2x16GB)", Speed: "DDR5-6000", Latency: "CL36", Warranty: "36 tháng" }, accent: "#a5dc36" },
  { id: "p6", slug: "ssd-nvme-990-pro", name: "990 Pro NVMe 2TB", brand: "Samsung", category: "Linh kiện", price: 4390000, oldPrice: 4990000, stock: 0, description: "Ổ cứng NVMe tốc độ đọc cao cho hệ điều hành và thư viện game.", specs: { Capacity: "2TB", Interface: "PCIe 4.0", Read: "7,450 MB/s", Warranty: "60 tháng" }, accent: "#ec4899", badge: "Hết hàng" },
  { id: "p7", slug: "mechanical-keyboard-k75", name: "Mechanical Keyboard K75", brand: "Keychron", category: "Phụ kiện", price: 2890000, stock: 9, description: "Bàn phím cơ compact với layout 75% và cảm giác gõ chắc tay.", specs: { Layout: "75%", Switch: "K Pro Brown", Connection: "Tri-mode", Battery: "4000mAh" }, accent: "#27c3a2" },
  { id: "p8", slug: "ultrawide-monitor-34", name: "Ultrawide Monitor 34", brand: "LG", category: "Phụ kiện", price: 11990000, stock: 4, description: "Không gian hiển thị rộng cho công việc sáng tạo và chơi game nhập vai.", specs: { Size: "34 inch", Resolution: "3440 × 1440", Refresh: "165Hz", Panel: "IPS" }, accent: "#3788ff" },
];

export function formatPrice(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}

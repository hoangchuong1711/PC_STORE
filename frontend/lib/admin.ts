export const adminCategories = ["Laptop", "PC Gaming", "Linh kiện", "Phụ kiện"] as const;
export const adminBrands = [
  "ASUS",
  "PC Store",
  "GIGABYTE",
  "Kingston",
  "Samsung",
  "Keychron",
  "LG",
  "Corsair",
] as const;

export const adminProductStatuses = [
  "ACTIVE",
  "DRAFT",
  "HIDDEN",
  "OUT_OF_STOCK",
  "DISCONTINUED",
] as const;

export type AdminProductStatus = (typeof adminProductStatuses)[number];
export type AdminProductStockFilter = "ALL" | "LOW" | "OUT";

export type AdminProductSpecs = {
  slot?: "cpu" | "motherboard" | "ram" | "gpu" | "storage" | "psu" | "case" | "cooler";
  socket?: string;
  formFactor?: string;
  ramType?: string;
  ramSlots?: number;
  capacityGb?: number;
  tdpWatts?: number;
  vramGb?: number;
  recommendedPsuW?: number;
  wattage?: number;
  efficiency?: string;
  maxGpuLengthMm?: number;
  coolerType?: string;
};

export type AdminProduct = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  stock: number;
  status: AdminProductStatus;
  imageUrl: string;
  images?: string[];
  description?: string;
  imageColor: string;
  updatedAt: string;
  builderSpecs?: AdminProductSpecs;
  spec?: Record<string, unknown> | null;
};

export type AdminProductFilters = {
  query: string;
  category?: "ALL" | string;
  brand?: "ALL" | string;
  status: "ALL" | AdminProductStatus;
  stock: AdminProductStockFilter;
};

export const adminOrderStatuses = [
  "PENDING",
  "CONFIRMED",
  "SHIPPING",
  "DELIVERED",
  "CANCELLED",
] as const;

export type AdminOrderStatus = (typeof adminOrderStatuses)[number];
export type AdminPaymentMethod = "COD" | "BANK_TRANSFER";
export type AdminPaymentStatus = "PENDING" | "PAID";
export type AdminOrderDateFilter = "ALL" | "TODAY" | "7DAYS" | "30DAYS";

export const orderDateFilterLabels: Record<AdminOrderDateFilter, string> = {
  ALL: "Tất cả thời gian",
  TODAY: "Hôm nay",
  "7DAYS": "7 ngày qua",
  "30DAYS": "30 ngày qua",
};

export type AdminOrderLine = {
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type AdminOrder = {
  id: string;
  code: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  createdAt: string;
  total: number;
  status: AdminOrderStatus;
  paymentMethod: AdminPaymentMethod;
  paymentStatus: AdminPaymentStatus;
  itemCount: number;
  lines: AdminOrderLine[];
  staffNotes?: string;
  cancellationReason?: string;
};

export type AdminOrderFilters = {
  query: string;
  status: "ALL" | AdminOrderStatus;
  paymentStatus: "ALL" | AdminPaymentStatus;
  dateRange?: AdminOrderDateFilter;
};

export type AdminNotification = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "order" | "stock" | "community";
  unread: boolean;
  href: string;
};

export type DashboardChartPoint = {
  label: string;
  fullDate: string;
  revenue: number;
  orders: number;
};

type ProductFilterable = Pick<AdminProduct, "name" | "brand" | "category" | "status" | "stock">;
type OrderFilterable = Pick<AdminOrder, "code" | "customerName" | "customerEmail" | "status" | "paymentStatus"> & {
  createdAt?: string;
};

export function filterAdminProducts<T extends ProductFilterable>(
  items: readonly T[],
  filters: AdminProductFilters,
) {
  const query = filters.query.trim().toLowerCase();
  const category = filters.category ?? "ALL";
  const brand = filters.brand ?? "ALL";

  return items.filter((product) => {
    const matchesQuery =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.brand.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query);
    const matchesCategory = category === "ALL" || product.category === category;
    const matchesBrand = brand === "ALL" || product.brand === brand;
    const matchesStatus = filters.status === "ALL" || product.status === filters.status;
    const matchesStock =
      filters.stock === "ALL" ||
      (filters.stock === "LOW" && product.stock > 0 && product.stock <= 5) ||
      (filters.stock === "OUT" && product.stock === 0);
    return matchesQuery && matchesCategory && matchesBrand && matchesStatus && matchesStock;
  });
}

export function filterAdminOrders<T extends OrderFilterable>(
  items: readonly T[],
  filters: AdminOrderFilters,
) {
  const query = filters.query.trim().toLowerCase();
  const dateRange = filters.dateRange ?? "ALL";
  const now = new Date("2026-10-06T12:00:00+07:00");

  return items.filter((order) => {
    const matchesQuery =
      !query ||
      order.code.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query) ||
      order.customerEmail.toLowerCase().includes(query);
    const matchesStatus = filters.status === "ALL" || order.status === filters.status;
    const matchesPayment =
      filters.paymentStatus === "ALL" || order.paymentStatus === filters.paymentStatus;

    let matchesDate = true;
    if (dateRange !== "ALL" && order.createdAt) {
      const orderTime = new Date(order.createdAt).getTime();
      const diffDays = Math.max(0, (now.getTime() - orderTime) / (1000 * 60 * 60 * 24));
      if (dateRange === "TODAY") {
        matchesDate = diffDays <= 1;
      } else if (dateRange === "7DAYS") {
        matchesDate = diffDays <= 7;
      } else if (dateRange === "30DAYS") {
        matchesDate = diffDays <= 30;
      }
    }

    return matchesQuery && matchesStatus && matchesPayment && matchesDate;
  });
}

export function getNextOrderStatuses(status: AdminOrderStatus): AdminOrderStatus[] {
  if (status === "PENDING") return ["CONFIRMED", "CANCELLED"];
  if (status === "CONFIRMED") return ["SHIPPING", "CANCELLED"];
  if (status === "SHIPPING") return ["DELIVERED"];
  return [];
}

export const productStatusLabels: Record<AdminProductStatus, string> = {
  ACTIVE: "Đang bán",
  DRAFT: "Bản nháp",
  HIDDEN: "Đã ẩn",
  OUT_OF_STOCK: "Hết hàng",
  DISCONTINUED: "Ngừng bán",
};

export const orderStatusLabels: Record<AdminOrderStatus, string> = {
  PENDING: "Chờ xử lý",
  CONFIRMED: "Đã xác nhận",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã hủy",
};

export const paymentStatusLabels: Record<AdminPaymentStatus, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
};

export const paymentMethodLabels: Record<AdminPaymentMethod, string> = {
  COD: "COD",
  BANK_TRANSFER: "Chuyển khoản",
};

export const initialAdminProducts: AdminProduct[] = [
  { id: "p1", sku: "PCS-LAP-001", name: "ROG Strix G16 2025", brand: "ASUS", category: "Laptop", price: 38_990_000, stock: 8, status: "ACTIVE", imageUrl: "/admin/products/laptop.svg", imageColor: "#dfe7ff", updatedAt: "2026-10-02" },
  { id: "p2", sku: "PCS-LAP-002", name: "TUF Gaming A15", brand: "ASUS", category: "Laptop", price: 24_990_000, stock: 5, status: "ACTIVE", imageUrl: "/admin/products/laptop.svg", imageColor: "#e6eef4", updatedAt: "2026-09-28" },
  { id: "p3", sku: "PCS-PC-001", name: "PC Creator Pro X", brand: "PC Store", category: "PC Gaming", price: 52_990_000, stock: 3, status: "ACTIVE", imageUrl: "/admin/products/pc.svg", imageColor: "#eee5dc", updatedAt: "2026-09-25" },
  { id: "p4", sku: "PCS-GPU-001", name: "RTX 4070 Super Dual", brand: "GIGABYTE", category: "Linh kiện", price: 16_990_000, stock: 0, status: "OUT_OF_STOCK", imageUrl: "/admin/products/gpu.svg", imageColor: "#e8e6f4", updatedAt: "2026-09-23", builderSpecs: { slot: "gpu", vramGb: 12, recommendedPsuW: 650, maxGpuLengthMm: 269 } },
  { id: "p5", sku: "PCS-RAM-001", name: "Kingston Fury 32GB", brand: "Kingston", category: "Linh kiện", price: 2_190_000, stock: 18, status: "ACTIVE", imageUrl: "/admin/products/ram.svg", imageColor: "#e2eee4", updatedAt: "2026-09-21", builderSpecs: { slot: "ram", ramType: "DDR5", capacityGb: 32 } },
  { id: "p6", sku: "PCS-SSD-001", name: "Samsung 990 Pro 2TB", brand: "Samsung", category: "Linh kiện", price: 4_590_000, stock: 2, status: "ACTIVE", imageUrl: "/admin/products/ssd.svg", imageColor: "#e6edf2", updatedAt: "2026-09-19", builderSpecs: { slot: "storage", capacityGb: 2000 } },
  { id: "p7", sku: "PCS-KEY-001", name: "Mechanical Keyboard K75", brand: "Keychron", category: "Phụ kiện", price: 2_890_000, stock: 12, status: "DRAFT", imageUrl: "/admin/products/keyboard.svg", imageColor: "#eee8df", updatedAt: "2026-09-16" },
  { id: "p8", sku: "PCS-MON-001", name: "Ultrawide Monitor 34", brand: "LG", category: "Phụ kiện", price: 11_990_000, stock: 4, status: "ACTIVE", imageUrl: "/admin/products/monitor.svg", imageColor: "#e4e8f2", updatedAt: "2026-09-12" },
  { id: "p9", sku: "PCS-PSU-001", name: "RM850x Gold", brand: "Corsair", category: "Linh kiện", price: 3_990_000, stock: 0, status: "HIDDEN", imageUrl: "/admin/products/psu.svg", imageColor: "#e8e8e8", updatedAt: "2026-09-08", builderSpecs: { slot: "psu", wattage: 850, efficiency: "80 Plus Gold" } },
];

export const initialAdminOrders: AdminOrder[] = [
  {
    id: "ord-01",
    code: "PCS-261001-01",
    customerName: "Nguyễn Minh Anh",
    customerEmail: "minhanh@example.com",
    customerPhone: "090 123 4567",
    shippingAddress: "24 Nguyễn Văn Linh, Hải Châu, Đà Nẵng",
    createdAt: "2026-10-01T09:30:00+07:00",
    total: 41_880_000,
    status: "PENDING",
    paymentMethod: "BANK_TRANSFER",
    paymentStatus: "PENDING",
    itemCount: 2,
    lines: [
      { productName: "ROG Strix G16 2025", quantity: 1, unitPrice: 38_990_000 },
      { productName: "Mechanical Keyboard K75", quantity: 1, unitPrice: 2_890_000 },
    ],
  },
  {
    id: "ord-02",
    code: "PCS-260930-02",
    customerName: "Trần Hoàng Quân",
    customerEmail: "quan.tran@example.com",
    customerPhone: "091 223 8899",
    shippingAddress: "18 Lê Lợi, Ninh Kiều, Cần Thơ",
    createdAt: "2026-09-30T14:15:00+07:00",
    total: 16_990_000,
    status: "CONFIRMED",
    paymentMethod: "COD",
    paymentStatus: "PENDING",
    itemCount: 1,
    lines: [{ productName: "RTX 4070 Super Dual", quantity: 1, unitPrice: 16_990_000 }],
  },
  {
    id: "ord-03",
    code: "PCS-260928-03",
    customerName: "Lê Minh Tuấn",
    customerEmail: "tuan.le@example.com",
    customerPhone: "098 557 2233",
    shippingAddress: "72 Trần Phú, Ba Đình, Hà Nội",
    createdAt: "2026-09-28T11:05:00+07:00",
    total: 16_370_000,
    status: "SHIPPING",
    paymentMethod: "BANK_TRANSFER",
    paymentStatus: "PAID",
    itemCount: 3,
    lines: [
      { productName: "Kingston Fury 32GB", quantity: 2, unitPrice: 2_190_000 },
      { productName: "Ultrawide Monitor 34", quantity: 1, unitPrice: 11_990_000 },
    ],
  },
  {
    id: "ord-04",
    code: "PCS-260924-04",
    customerName: "Phạm Quốc Bảo",
    customerEmail: "bao.pham@example.com",
    customerPhone: "093 667 9012",
    shippingAddress: "55 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
    createdAt: "2026-09-24T16:40:00+07:00",
    total: 52_990_000,
    status: "DELIVERED",
    paymentMethod: "BANK_TRANSFER",
    paymentStatus: "PAID",
    itemCount: 1,
    lines: [{ productName: "PC Creator Pro X", quantity: 1, unitPrice: 52_990_000 }],
  },
  {
    id: "ord-05",
    code: "PCS-260921-05",
    customerName: "Vũ Thanh Tùng",
    customerEmail: "tung.vu@example.com",
    customerPhone: "097 111 8246",
    shippingAddress: "09 Hoàng Diệu, Hải Châu, Đà Nẵng",
    createdAt: "2026-09-21T08:20:00+07:00",
    total: 24_990_000,
    status: "CANCELLED",
    paymentMethod: "COD",
    paymentStatus: "PENDING",
    itemCount: 1,
    lines: [{ productName: "TUF Gaming A15", quantity: 1, unitPrice: 24_990_000 }],
  },
];

export function formatAdminPrice(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatAdminDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export const initialAdminNotifications: AdminNotification[] = [
  {
    id: "notif-1",
    title: "Đơn hàng mới cần xử lý",
    message: "Đơn #PCS-261001-01 (41.880.000₫) đang chờ kiểm tra.",
    time: "10 phút trước",
    type: "order",
    unread: true,
    href: "/admin/orders",
  },
  {
    id: "notif-2",
    title: "Cảnh báo hết hàng",
    message: "RTX 4070 Super Dual và RM850x Gold đã về mức 0.",
    time: "1 giờ trước",
    type: "stock",
    unread: true,
    href: "/admin/products",
  },
  {
    id: "notif-3",
    title: "Bài setup cộng đồng mới",
    message: "Minh Anh vừa đăng bài setup phong cách Tối giản.",
    time: "3 giờ trước",
    type: "community",
    unread: false,
    href: "/admin/community",
  },
];

export const dashboardRevenueTrend: DashboardChartPoint[] = [
  { label: "25/09", fullDate: "25 Tháng 9", revenue: 52_990_000, orders: 1 },
  { label: "26/09", fullDate: "26 Tháng 9", revenue: 0, orders: 0 },
  { label: "27/09", fullDate: "27 Tháng 9", revenue: 18_500_000, orders: 2 },
  { label: "28/09", fullDate: "28 Tháng 9", revenue: 16_370_000, orders: 1 },
  { label: "29/09", fullDate: "29 Tháng 9", revenue: 9_490_000, orders: 1 },
  { label: "30/09", fullDate: "30 Tháng 9", revenue: 16_990_000, orders: 1 },
  { label: "01/10", fullDate: "01 Tháng 10", revenue: 41_880_000, orders: 2 },
];


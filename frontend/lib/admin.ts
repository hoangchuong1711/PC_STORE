export const adminProductStatuses = [
  "ACTIVE",
  "DRAFT",
  "HIDDEN",
  "OUT_OF_STOCK",
  "DISCONTINUED",
] as const;

export type AdminProductStatus = (typeof adminProductStatuses)[number];
export type AdminProductStockFilter = "ALL" | "LOW" | "OUT";

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
  imageColor: string;
  updatedAt: string;
};

export type AdminProductFilters = {
  query: string;
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
};

export type AdminOrderFilters = {
  query: string;
  status: "ALL" | AdminOrderStatus;
  paymentStatus: "ALL" | AdminPaymentStatus;
};

type ProductFilterable = Pick<AdminProduct, "name" | "brand" | "category" | "status" | "stock">;
type OrderFilterable = Pick<AdminOrder, "code" | "customerName" | "customerEmail" | "status" | "paymentStatus">;

export function filterAdminProducts<T extends ProductFilterable>(
  items: readonly T[],
  filters: AdminProductFilters,
) {
  const query = filters.query.trim().toLowerCase();
  return items.filter((product) => {
    const matchesQuery =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.brand.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query);
    const matchesStatus = filters.status === "ALL" || product.status === filters.status;
    const matchesStock =
      filters.stock === "ALL" ||
      (filters.stock === "LOW" && product.stock > 0 && product.stock <= 5) ||
      (filters.stock === "OUT" && product.stock === 0);
    return matchesQuery && matchesStatus && matchesStock;
  });
}

export function filterAdminOrders<T extends OrderFilterable>(
  items: readonly T[],
  filters: AdminOrderFilters,
) {
  const query = filters.query.trim().toLowerCase();
  return items.filter((order) => {
    const matchesQuery =
      !query ||
      order.code.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query) ||
      order.customerEmail.toLowerCase().includes(query);
    const matchesStatus = filters.status === "ALL" || order.status === filters.status;
    const matchesPayment =
      filters.paymentStatus === "ALL" || order.paymentStatus === filters.paymentStatus;
    return matchesQuery && matchesStatus && matchesPayment;
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
  { id: "p4", sku: "PCS-GPU-001", name: "RTX 4070 Super Dual", brand: "GIGABYTE", category: "Linh kiện", price: 16_990_000, stock: 0, status: "OUT_OF_STOCK", imageUrl: "/admin/products/gpu.svg", imageColor: "#e8e6f4", updatedAt: "2026-09-23" },
  { id: "p5", sku: "PCS-RAM-001", name: "Kingston Fury 32GB", brand: "Kingston", category: "Linh kiện", price: 2_190_000, stock: 18, status: "ACTIVE", imageUrl: "/admin/products/ram.svg", imageColor: "#e2eee4", updatedAt: "2026-09-21" },
  { id: "p6", sku: "PCS-SSD-001", name: "Samsung 990 Pro 2TB", brand: "Samsung", category: "Linh kiện", price: 4_590_000, stock: 2, status: "ACTIVE", imageUrl: "/admin/products/ssd.svg", imageColor: "#e6edf2", updatedAt: "2026-09-19" },
  { id: "p7", sku: "PCS-KEY-001", name: "Mechanical Keyboard K75", brand: "Keychron", category: "Phụ kiện", price: 2_890_000, stock: 12, status: "DRAFT", imageUrl: "/admin/products/keyboard.svg", imageColor: "#eee8df", updatedAt: "2026-09-16" },
  { id: "p8", sku: "PCS-MON-001", name: "Ultrawide Monitor 34", brand: "LG", category: "Phụ kiện", price: 11_990_000, stock: 4, status: "ACTIVE", imageUrl: "/admin/products/monitor.svg", imageColor: "#e4e8f2", updatedAt: "2026-09-12" },
  { id: "p9", sku: "PCS-PSU-001", name: "RM850x Gold", brand: "Corsair", category: "Linh kiện", price: 3_990_000, stock: 0, status: "HIDDEN", imageUrl: "/admin/products/psu.svg", imageColor: "#e8e8e8", updatedAt: "2026-09-08" },
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

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
  "EXPIRED_PENDING_RECONCILIATION",
] as const;

export type AdminOrderStatus = (typeof adminOrderStatuses)[number];
export type AdminPaymentMethod = "COD" | "VNPAY";
export type AdminPaymentStatus = "PENDING" | "PAID" | "FAILED";
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
  if (status === "EXPIRED_PENDING_RECONCILIATION") return ["CANCELLED"];
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
  EXPIRED_PENDING_RECONCILIATION: "Hết hạn chờ đối soát",
};

export const paymentStatusLabels: Record<AdminPaymentStatus, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thất bại",
};

export const paymentMethodLabels: Record<AdminPaymentMethod, string> = {
  COD: "COD",
  VNPAY: "VNPAY",
};

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


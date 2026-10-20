import type { OrderResponse } from "./order-api";

export const orderStatuses = [
  "PENDING",
  "CONFIRMED",
  "SHIPPING",
  "DELIVERED",
  "CANCELLED",
  "EXPIRED_PENDING_RECONCILIATION",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];
export type OrderFilter = "ALL" | OrderStatus;
export type PaymentMethod = "COD" | "VNPAY";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED";

export type OrderLine = {
  orderItemId?: number;
  productId: string;
  slug: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
};

export type Order = {
  id: string;
  code: string;
  createdAt: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentExpiresAt?: string | null;
  cancelReason?: string;
  recipient: {
    name: string;
    phone: string;
    address: string;
    note?: string;
  };
  lines: OrderLine[];
  total: number;
};

export function filterOrders(items: Order[], filter: OrderFilter) {
  return filter === "ALL"
    ? items
    : items.filter((order) => order.status === filter);
}

export function getOrderProgress(status: OrderStatus): OrderStatus[] {
  if (status === "CANCELLED" || status === "EXPIRED_PENDING_RECONCILIATION") return [];
  const flow: OrderStatus[] = ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED"];
  return flow.slice(0, flow.indexOf(status) + 1);
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã hủy",
  EXPIRED_PENDING_RECONCILIATION: "Hết hạn chờ đối soát",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  COD: "Thanh toán khi nhận hàng (COD)",
  VNPAY: "Cổng thanh toán VNPAY Sandbox",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thanh toán thất bại",
};

export function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function toOrderModel(res: OrderResponse): Order {
  const method = (res.payment?.method === "VNPAY" ? "VNPAY" : "COD") as PaymentMethod;
  const payStatus = (res.payment?.status === "PAID"
    ? "PAID"
    : res.payment?.status === "FAILED"
      ? "FAILED"
      : "PENDING") as PaymentStatus;
  const validStatuses: OrderStatus[] = [
    "PENDING",
    "CONFIRMED",
    "SHIPPING",
    "DELIVERED",
    "CANCELLED",
    "EXPIRED_PENDING_RECONCILIATION",
  ];
  const status = (validStatuses.includes(res.status as OrderStatus) ? res.status : "PENDING") as OrderStatus;

  return {
    id: String(res.orderId),
    code: `#${res.orderId}`,
    createdAt: res.orderDate,
    status,
    paymentMethod: method,
    paymentStatus: payStatus,
    paymentExpiresAt: res.paymentExpiresAt ?? null,
    recipient: {
      name: res.shippingName,
      phone: res.shippingPhone,
      address: res.shippingAddressText,
    },
    lines: (res.items || []).map((item) => ({
      orderItemId: item.orderItemId,
      productId: String(item.productId),
      slug: String(item.productId),
      name: item.productName,
      category: "Linh kiện",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    total: res.totalAmount,
  };
}

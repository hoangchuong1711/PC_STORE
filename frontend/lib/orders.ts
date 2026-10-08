import type { OrderResponse } from "./order-api";

export const orderStatuses = [
  "PENDING",
  "CONFIRMED",
  "SHIPPING",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];
export type OrderFilter = "ALL" | OrderStatus;
export type PaymentMethod = "COD" | "BANK_TRANSFER";
export type PaymentStatus = "PENDING" | "PAID";

export type OrderLine = {
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

const recipient = {
  name: "Nguyễn Minh Anh",
  phone: "090 123 4567",
  address: "24 Nguyễn Văn Linh, Hải Châu, Đà Nẵng",
};

export const orders: Order[] = [
  {
    id: "ord-20251018-01",
    code: "PCS-251018-01",
    createdAt: "2025-10-18T09:30:00+07:00",
    status: "SHIPPING",
    paymentMethod: "BANK_TRANSFER",
    paymentStatus: "PAID",
    recipient,
    lines: [
      {
        productId: "p1",
        slug: "rog-strix-g16-2025",
        name: "ROG Strix G16 2025",
        category: "Laptop",
        quantity: 1,
        unitPrice: 38990000,
      },
      {
        productId: "p7",
        slug: "mechanical-keyboard-k75",
        name: "Mechanical Keyboard K75",
        category: "Phụ kiện",
        quantity: 1,
        unitPrice: 2890000,
      },
    ],
    total: 41880000,
  },
  {
    id: "ord-20251012-02",
    code: "PCS-251012-02",
    createdAt: "2025-10-12T14:15:00+07:00",
    status: "CONFIRMED",
    paymentMethod: "COD",
    paymentStatus: "PENDING",
    recipient,
    lines: [
      {
        productId: "p4",
        slug: "rtx-4070-super-dual",
        name: "RTX 4070 Super Dual",
        category: "Linh kiện",
        quantity: 1,
        unitPrice: 16990000,
      },
    ],
    total: 16990000,
  },
  {
    id: "ord-20250927-03",
    code: "PCS-250927-03",
    createdAt: "2025-09-27T11:05:00+07:00",
    status: "DELIVERED",
    paymentMethod: "BANK_TRANSFER",
    paymentStatus: "PAID",
    recipient,
    lines: [
      {
        productId: "p5",
        slug: "kingston-fury-32gb",
        name: "Kingston Fury 32GB",
        category: "Linh kiện",
        quantity: 2,
        unitPrice: 2190000,
      },
      {
        productId: "p8",
        slug: "ultrawide-monitor-34",
        name: "Ultrawide Monitor 34",
        category: "Phụ kiện",
        quantity: 1,
        unitPrice: 11990000,
      },
    ],
    total: 16370000,
  },
  {
    id: "ord-20250904-04",
    code: "PCS-250904-04",
    createdAt: "2025-09-04T16:40:00+07:00",
    status: "CANCELLED",
    paymentMethod: "COD",
    paymentStatus: "PENDING",
    cancelReason: "Khách hàng đổi ý, muốn nâng cấp lên dòng card cao hơn.",
    recipient,
    lines: [
      {
        productId: "p2",
        slug: "tuf-gaming-a15",
        name: "TUF Gaming A15",
        category: "Laptop",
        quantity: 1,
        unitPrice: 24990000,
      },
    ],
    total: 24990000,
  },
];

export function filterOrders(items: Order[], filter: OrderFilter) {
  return filter === "ALL"
    ? items
    : items.filter((order) => order.status === filter);
}

export function getOrder(id: string) {
  return orders.find((order) => order.id === id);
}

export function getOrderProgress(status: OrderStatus): OrderStatus[] {
  if (status === "CANCELLED") return [];
  const flow: OrderStatus[] = ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED"];
  return flow.slice(0, flow.indexOf(status) + 1);
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã hủy",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  COD: "Thanh toán khi nhận hàng (COD)",
  BANK_TRANSFER: "Chuyển khoản ngân hàng (VietQR)",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
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
  const method = (res.payment?.method === "BANK_TRANSFER" ? "BANK_TRANSFER" : "COD") as PaymentMethod;
  const payStatus = (res.payment?.status === "PAID" ? "PAID" : "PENDING") as PaymentStatus;
  const validStatuses: OrderStatus[] = ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED"];
  const status = (validStatuses.includes(res.status as OrderStatus) ? res.status : "PENDING") as OrderStatus;

  return {
    id: String(res.orderId),
    code: `#${res.orderId}`,
    createdAt: res.orderDate,
    status,
    paymentMethod: method,
    paymentStatus: payStatus,
    recipient: {
      name: res.shippingName,
      phone: res.shippingPhone,
      address: res.shippingAddressText,
    },
    lines: (res.items || []).map((item) => ({
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

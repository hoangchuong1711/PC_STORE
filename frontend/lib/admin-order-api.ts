import type { OrderResponse } from "./order-api";

export type AdminOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPING"
  | "DELIVERED"
  | "CANCELLED";

export class AdminOrderApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function money(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function nullableDate(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function validOrder(value: unknown): value is OrderResponse {
  if (!value || typeof value !== "object") return false;
  const order = value as Partial<OrderResponse>;
  return (
    positiveInteger(order.orderId) &&
    typeof order.status === "string" &&
    typeof order.orderDate === "string" &&
    money(order.totalAmount) &&
    nullableDate(order.deliveredAt) &&
    typeof order.shippingName === "string" &&
    typeof order.shippingPhone === "string" &&
    typeof order.shippingAddressText === "string" &&
    Array.isArray(order.items) &&
    order.items.every(
      (item) =>
        item &&
        typeof item === "object" &&
        positiveInteger(item.orderItemId) &&
        positiveInteger(item.productId) &&
        typeof item.productName === "string" &&
        positiveInteger(item.quantity) &&
        money(item.baseUnitPrice) &&
        money(item.unitPrice) &&
        money(item.lineTotal),
    ) &&
    (order.payment === null ||
      (!!order.payment &&
        typeof order.payment === "object" &&
        positiveInteger(order.payment.paymentId) &&
        typeof order.payment.method === "string" &&
        typeof order.payment.status === "string" &&
        money(order.payment.amount) &&
        nullableDate(order.payment.paidAt)))
  );
}

export function createAdminOrderApi(transport: typeof fetch = fetch) {
  async function read(path: string, method: string, body?: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await transport(path, {
        method,
        credentials: "same-origin",
        cache: "no-store",
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new AdminOrderApiError(0, "NETWORK_ERROR", "Không thể kết nối máy chủ. Vui lòng thử lại.");
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new AdminOrderApiError(
        response.status,
        data?.code ?? "HTTP_ERROR",
        data?.message ?? `Máy chủ trả lỗi ${response.status}.`,
      );
    }
    return data;
  }

  function requireId(id: number): void {
    if (!positiveInteger(id)) {
      throw new AdminOrderApiError(400, "INVALID_ID", "Mã đơn hàng không hợp lệ.");
    }
  }

  return {
    async list(): Promise<OrderResponse[]> {
      const data = await read("/api/admin/orders", "GET");
      if (!Array.isArray(data)) {
        throw new AdminOrderApiError(502, "INVALID_RESPONSE", "Danh sách đơn hàng không hợp lệ.");
      }
      return data.map((item) => {
        if (!validOrder(item)) {
          throw new AdminOrderApiError(502, "INVALID_RESPONSE", "Dữ liệu đơn hàng không hợp lệ.");
        }
        return item;
      });
    },

    async getById(orderId: number): Promise<OrderResponse> {
      requireId(orderId);
      const data = await read(`/api/admin/orders/${orderId}`, "GET");
      if (!validOrder(data)) {
        throw new AdminOrderApiError(502, "INVALID_RESPONSE", "Dữ liệu đơn hàng không hợp lệ.");
      }
      return data;
    },

    async updateStatus(orderId: number, status: AdminOrderStatus): Promise<OrderResponse> {
      requireId(orderId);
      const data = await read(`/api/admin/orders/${orderId}/status`, "PUT", { status });
      if (!validOrder(data)) {
        throw new AdminOrderApiError(502, "INVALID_RESPONSE", "Phản hồi cập nhật đơn hàng không hợp lệ.");
      }
      return data;
    },
  };
}

export const adminOrderApi = createAdminOrderApi();

export type PaymentMethod = "COD" | "VNPAY";
export type CheckoutInput = { shippingName: string; shippingPhone: string; shippingAddressText: string; paymentMethod: PaymentMethod };
export type VNPayUrlResponse = {
  orderId: number;
  paymentMethod: string;
  referenceCode: string;
  paymentUrl: string;
  expiresAt: string;
};
export type OrderResponse = {
  orderId: number; orderDate: string; status: string; totalAmount: number;
  shippingName: string; shippingPhone: string; shippingAddressText: string;
  deliveredAt: string | null; paymentExpiresAt?: string | null;
  items: Array<{ orderItemId: number; productId: number; productName: string; quantity: number; baseUnitPrice: number; unitPrice: number; lineTotal: number }>;
  payment: { paymentId: number; method: string; status: string; amount: number; paidAt: string | null } | null;
};
export class OrderApiError extends Error {
  status: number; code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
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
  return positiveInteger(order.orderId) && typeof order.status === "string" && typeof order.orderDate === "string"
    && money(order.totalAmount) && nullableDate(order.deliveredAt)
    && typeof order.shippingName === "string" && typeof order.shippingPhone === "string"
    && typeof order.shippingAddressText === "string" && Array.isArray(order.items)
    && order.items.every(item => item && typeof item === "object"
      && positiveInteger(item.orderItemId) && positiveInteger(item.productId)
      && typeof item.productName === "string" && positiveInteger(item.quantity)
      && money(item.baseUnitPrice) && money(item.unitPrice) && money(item.lineTotal))
    && (order.payment === null || (!!order.payment && typeof order.payment === "object"
      && positiveInteger(order.payment.paymentId) && typeof order.payment.method === "string"
      && typeof order.payment.status === "string" && money(order.payment.amount)
      && nullableDate(order.payment.paidAt)));
}

export function createOrderApi(transport: typeof fetch = fetch) {
  async function read(path: string, method: string): Promise<unknown> {
    let response: Response;
    try {
      response = await transport(path, { method, credentials: "same-origin", cache: "no-store" });
    } catch { throw new OrderApiError(0, "NETWORK_ERROR", "Không thể kết nối máy chủ. Vui lòng thử lại."); }
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new OrderApiError(response.status, data?.code ?? "HTTP_ERROR", data?.message ?? `Máy chủ trả lỗi ${response.status}.`);
    return data;
  }

  function requireOrder(data: unknown): OrderResponse {
    if (!validOrder(data)) throw new OrderApiError(502, "INVALID_RESPONSE", "Phản hồi đơn hàng không hợp lệ.");
    return data;
  }

  function requireId(id: number): void {
    if (!positiveInteger(id)) throw new OrderApiError(400, "INVALID_ID", "Mã đơn hàng không hợp lệ.");
  }

  return {
    async list(): Promise<OrderResponse[]> {
      const data = await read("/api/orders", "GET");
      if (!Array.isArray(data)) throw new OrderApiError(502, "INVALID_RESPONSE", "Danh sách đơn hàng không hợp lệ.");
      return data.map(requireOrder);
    },
    async getById(orderId: number): Promise<OrderResponse> {
      requireId(orderId);
      return requireOrder(await read(`/api/orders/${orderId}`, "GET"));
    },
    async cancel(orderId: number): Promise<OrderResponse> {
      requireId(orderId);
      return requireOrder(await read(`/api/orders/${orderId}/cancel`, "POST"));
    },
    async createVNPayUrl(orderId: number): Promise<VNPayUrlResponse> {
      requireId(orderId);
      const data = await read(`/api/orders/${orderId}/payment/vnpay-url`, "POST");
      if (!data || typeof data !== "object") throw new OrderApiError(502, "INVALID_RESPONSE", "Phản hồi tạo URL VNPay không hợp lệ.");
      const res = data as Partial<VNPayUrlResponse>;
      if (!res.paymentUrl || !res.referenceCode || !res.expiresAt) {
        throw new OrderApiError(502, "INVALID_RESPONSE", "Thiếu thông tin URL thanh toán VNPay.");
      }
      return data as VNPayUrlResponse;
    },
    async syncPayment(orderId: number): Promise<OrderResponse> {
      requireId(orderId);
      return requireOrder(await read(`/api/orders/${orderId}/payment/sync`, "POST"));
    },
    async checkout(input: CheckoutInput, idempotencyKey: string): Promise<{ order: OrderResponse; replayed: boolean }> {
      if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
        throw new OrderApiError(400, "INVALID_IDEMPOTENCY_KEY", "Idempotency-Key phải dài 8–128 ký tự hợp lệ.");
      }
      let response: Response;
      try {
        response = await transport("/api/orders", {
          method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
          body: JSON.stringify(input),
        });
      } catch { throw new OrderApiError(0, "NETWORK_ERROR", "Không thể kết nối máy chủ. Vui lòng thử lại."); }
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new OrderApiError(response.status, data?.code ?? "HTTP_ERROR", data?.message ?? `Máy chủ trả lỗi ${response.status}.`);
      if (!validOrder(data)) throw new OrderApiError(502, "INVALID_RESPONSE", "Phản hồi đơn hàng không hợp lệ.");
      return { order: data, replayed: response.headers.get("Idempotent-Replayed") === "true" };
    },
  };
}

export const orderApi = createOrderApi();

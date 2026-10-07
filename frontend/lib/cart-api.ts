export type CartItemResponse = {
  cartItemId: number;
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  availableQuantity: number;
  available: boolean;
};

export type CartResponse = {
  cartId: number | null;
  items: CartItemResponse[];
  totalAmount: number;
};

export class CartApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function isCart(value: unknown): value is CartResponse {
  if (!value || typeof value !== "object") return false;
  const cart = value as Partial<CartResponse>;
  return (cart.cartId === null || Number.isInteger(cart.cartId)) && Array.isArray(cart.items)
    && typeof cart.totalAmount === "number" && Number.isFinite(cart.totalAmount)
    && cart.items.every((item) => {
      if (!item || typeof item !== "object") return false;
      const line = item as Partial<CartItemResponse>;
      return Number.isInteger(line.cartItemId) && Number.isInteger(line.productId)
        && typeof line.name === "string" && Number.isInteger(line.quantity) && typeof line.quantity === "number" && line.quantity > 0
        && typeof line.unitPrice === "number" && Number.isFinite(line.unitPrice)
        && typeof line.lineTotal === "number" && Number.isFinite(line.lineTotal)
        && Number.isInteger(line.availableQuantity) && typeof line.availableQuantity === "number" && line.availableQuantity >= 0
        && typeof line.available === "boolean";
    });
}

export function createCartApi(transport: typeof fetch = fetch) {
  async function request(path: string, method: string, body?: unknown): Promise<CartResponse> {
    let response: Response;
    try {
      response = await transport(path, {
        method,
        credentials: "same-origin",
        cache: "no-store",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch { throw new CartApiError(0, "NETWORK_ERROR", "Không thể kết nối máy chủ. Vui lòng thử lại."); }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new CartApiError(response.status, data?.code ?? "HTTP_ERROR", data?.message ?? `Máy chủ trả lỗi ${response.status}.`);
    }
    if (!isCart(data)) throw new CartApiError(502, "INVALID_RESPONSE", "Phản hồi giỏ hàng không hợp lệ.");
    return data;
  }
  return {
    get: () => request("/api/customer/cart", "GET"),
    add: (productId: number, quantity: number) => request("/api/customer/cart/items", "POST", { productId, quantity }),
    update: (cartItemId: number, quantity: number) => request(`/api/customer/cart/items/${cartItemId}`, "PATCH", { quantity }),
    remove: async (cartItemId: number) => {
      let response: Response;
      try {
        response = await transport(`/api/customer/cart/items/${cartItemId}`, { method: "DELETE", credentials: "same-origin", cache: "no-store" });
      } catch { throw new CartApiError(0, "NETWORK_ERROR", "Không thể kết nối máy chủ. Vui lòng thử lại."); }
      if (!response.ok && response.status !== 204) {
        const data = await response.json().catch(() => null);
        throw new CartApiError(response.status, data?.code ?? "HTTP_ERROR", data?.message ?? `Máy chủ trả lỗi ${response.status}.`);
      }
    },
  };
}

export const cartApi = createCartApi();


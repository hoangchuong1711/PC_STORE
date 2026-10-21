import type { CartResponse } from "./cart-api";

export type BuilderCatalogProduct = {
  productId: number;
  name: string;
  brand: string;
  componentType: string;
  price: number;
  availableQuantity: number;
  imageUrl: string | null;
  spec: Record<string, unknown> | null;
};
export type BuildSelection = { productId: number; quantity: number };
export type CompatibilityStatus = "PASS" | "FAIL" | "UNKNOWN";
export type CompatibilityReport = {
  status: CompatibilityStatus;
  rules: { id: string; status: CompatibilityStatus; reason: string }[];
};
export type SavedBuild = {
  buildId: number;
  name: string;
  sourceType: string;
  items: { productId: number; productName: string; quantity: number; unitPrice: number; lineTotal: number }[];
  totalAmount: number;
  compatibility: CompatibilityReport;
};
export type BuildInput = { name: string; items: BuildSelection[] };

export class BuilderApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function createBuilderApi(transport: typeof fetch = fetch) {
  async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await transport(path, {
        method, credentials: "same-origin", cache: "no-store",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch { throw new BuilderApiError(0, "NETWORK_ERROR", "Không thể kết nối máy chủ."); }
    if (response.status === 204) return null as T;
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const error = data as { code?: string; message?: string } | null;
      throw new BuilderApiError(response.status, error?.code ?? "HTTP_ERROR", error?.message ?? `Máy chủ trả lỗi ${response.status}.`);
    }
    return data as T;
  }
  return {
    products: () => request<BuilderCatalogProduct[]>("/api/builder/products", "GET"),
    compatibility: (items: BuildSelection[]) =>
      request<CompatibilityReport>("/api/builder/compatibility", "POST", { items }),
    list: () => request<SavedBuild[]>("/api/customer/builds", "GET"),
    create: (input: BuildInput) => request<SavedBuild>("/api/customer/builds", "POST", input),
    update: (id: number, input: BuildInput) =>
      request<SavedBuild>(`/api/customer/builds/${id}`, "PUT", input),
    remove: async (id: number) => { await request<null>(`/api/customer/builds/${id}`, "DELETE"); },
    addToCart: (id: number) => request<CartResponse>(`/api/customer/builds/${id}/cart`, "POST"),
  };
}

export const builderApi = createBuilderApi();

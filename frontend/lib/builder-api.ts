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

function validReport(value: unknown): value is CompatibilityReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<CompatibilityReport>;
  const validStatus = (status: unknown) => status === "PASS" || status === "FAIL" || status === "UNKNOWN";
  return validStatus(report.status) && Array.isArray(report.rules) && report.rules.every((rule) =>
    typeof rule.id === "string" && validStatus(rule.status) && typeof rule.reason === "string");
}

function validBuild(value: unknown): value is SavedBuild {
  if (!value || typeof value !== "object") return false;
  const build = value as Partial<SavedBuild>;
  return Number.isInteger(build.buildId) && typeof build.name === "string" && typeof build.sourceType === "string"
    && Array.isArray(build.items) && typeof build.totalAmount === "number" && validReport(build.compatibility);
}

function validProduct(value: unknown): value is BuilderCatalogProduct {
  if (!value || typeof value !== "object") return false;
  const product = value as Partial<BuilderCatalogProduct>;
  return Number.isInteger(product.productId) && typeof product.name === "string"
    && typeof product.brand === "string" && typeof product.componentType === "string"
    && typeof product.price === "number" && Number.isFinite(product.price)
    && Number.isInteger(product.availableQuantity)
    && (product.imageUrl === null || typeof product.imageUrl === "string")
    && (product.spec === null || (typeof product.spec === "object" && !Array.isArray(product.spec)));
}

export function createBuilderApi(transport: typeof fetch = fetch) {
  async function request(path: string, method: string, body?: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await transport(path, {
        method, credentials: "same-origin", cache: "no-store",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch { throw new BuilderApiError(0, "NETWORK_ERROR", "Không thể kết nối máy chủ."); }
    if (response.status === 204) return null;
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const error = data as { code?: string; message?: string } | null;
      throw new BuilderApiError(response.status, error?.code ?? "HTTP_ERROR", error?.message ?? `Máy chủ trả lỗi ${response.status}.`);
    }
    return data;
  }
  function ensure<T>(value: unknown, predicate: (value: unknown) => value is T): T {
    if (!predicate(value)) throw new BuilderApiError(502, "INVALID_RESPONSE", "Phản hồi Builder không hợp lệ.");
    return value;
  }
  return {
    products: async () => ensure(await request("/api/builder/products", "GET"),
      (value): value is BuilderCatalogProduct[] => Array.isArray(value) && value.every(validProduct)),
    compatibility: async (items: BuildSelection[]) => ensure(await request("/api/builder/compatibility", "POST", { items }), validReport),
    list: async () => ensure(await request("/api/customer/builds", "GET"),
      (value): value is SavedBuild[] => Array.isArray(value) && value.every(validBuild)),
    create: async (input: BuildInput) => ensure(await request("/api/customer/builds", "POST", input), validBuild),
    update: async (id: number, input: BuildInput) => ensure(await request(`/api/customer/builds/${id}`, "PUT", input), validBuild),
    remove: async (id: number) => { await request(`/api/customer/builds/${id}`, "DELETE"); },
    addToCart: async (id: number) => ensure(await request(`/api/customer/builds/${id}/cart`, "POST"),
      (value): value is CartResponse => !!value && typeof value === "object" && Array.isArray((value as CartResponse).items)),
  };
}

export const builderApi = createBuilderApi();

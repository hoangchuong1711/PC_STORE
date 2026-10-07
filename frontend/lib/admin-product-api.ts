export type AdminProductStatus =
  | "ACTIVE"
  | "DRAFT"
  | "HIDDEN"
  | "OUT_OF_STOCK"
  | "DISCONTINUED";

export type CreateProductInput = {
  name: string;
  description?: string | null;
  price: number;
  categoryId: number;
  brandId: number;
  status?: AdminProductStatus;
  quantityOnHand: number;
};

export type UpdateProductInput = {
  name?: string;
  description?: string | null;
  price?: number;
  categoryId?: number;
  brandId?: number;
  status?: AdminProductStatus;
};

export type UpdateInventoryInput = {
  quantityOnHand: number;
};

export type AdminProductItem = {
  productId: number;
  name: string;
  description: string | null;
  price: number;
  status: AdminProductStatus;
  categoryId: number;
  categoryName: string;
  brandId: number;
  brandName: string;
  quantityOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
};

export class AdminProductApiError extends Error {
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

function nonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function validProductItem(value: unknown): value is AdminProductItem {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<AdminProductItem>;
  return (
    positiveInteger(p.productId) &&
    typeof p.name === "string" &&
    typeof p.price === "number" &&
    p.price >= 0 &&
    typeof p.status === "string" &&
    positiveInteger(p.categoryId) &&
    typeof p.categoryName === "string" &&
    positiveInteger(p.brandId) &&
    typeof p.brandName === "string" &&
    nonNegativeInteger(p.quantityOnHand) &&
    nonNegativeInteger(p.reservedQuantity) &&
    typeof p.availableQuantity === "number"
  );
}

export function createAdminProductApi(transport: typeof fetch = fetch) {
  async function request(path: string, method: string, body?: unknown): Promise<unknown> {
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
      throw new AdminProductApiError(0, "NETWORK_ERROR", "Không thể kết nối máy chủ. Vui lòng thử lại.");
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new AdminProductApiError(
        response.status,
        data?.code ?? "HTTP_ERROR",
        data?.message ?? `Máy chủ trả lỗi ${response.status}.`,
      );
    }
    return data;
  }

  function requireId(id: number): void {
    if (!positiveInteger(id)) {
      throw new AdminProductApiError(400, "INVALID_ID", "Product ID không hợp lệ.");
    }
  }

  return {
    async create(input: CreateProductInput): Promise<AdminProductItem> {
      if (!input.name || input.name.trim().length === 0) {
        throw new AdminProductApiError(400, "INVALID_INPUT", "Tên sản phẩm không được để trống.");
      }
      if (typeof input.price !== "number" || input.price < 0) {
        throw new AdminProductApiError(400, "INVALID_INPUT", "Giá sản phẩm không hợp lệ.");
      }
      if (!positiveInteger(input.categoryId)) {
        throw new AdminProductApiError(400, "INVALID_INPUT", "Danh mục là bắt buộc.");
      }
      if (!positiveInteger(input.brandId)) {
        throw new AdminProductApiError(400, "INVALID_INPUT", "Thương hiệu là bắt buộc.");
      }
      if (!nonNegativeInteger(input.quantityOnHand)) {
        throw new AdminProductApiError(400, "INVALID_INPUT", "Số lượng tồn kho ban đầu không hợp lệ.");
      }

      const res = await request("/api/admin/products", "POST", input);
      if (!validProductItem(res)) {
        throw new AdminProductApiError(502, "INVALID_RESPONSE", "Phản hồi tạo sản phẩm không hợp lệ.");
      }
      return res;
    },

    async update(productId: number, input: UpdateProductInput): Promise<AdminProductItem> {
      requireId(productId);
      const res = await request(`/api/admin/products/${productId}`, "PATCH", input);
      if (!validProductItem(res)) {
        throw new AdminProductApiError(502, "INVALID_RESPONSE", "Phản hồi cập nhật sản phẩm không hợp lệ.");
      }
      return res;
    },

    async updateInventory(productId: number, input: UpdateInventoryInput): Promise<{
      productId: number;
      quantityOnHand: number;
      reservedQuantity: number;
      availableQuantity: number;
    }> {
      requireId(productId);
      if (!nonNegativeInteger(input.quantityOnHand)) {
        throw new AdminProductApiError(400, "INVALID_INPUT", "Số lượng tồn kho không hợp lệ.");
      }
      const res = (await request(
        `/api/admin/products/${productId}/inventory`,
        "PATCH",
        input,
      )) as {
        productId: number;
        quantityOnHand: number;
        reservedQuantity: number;
        availableQuantity: number;
      };
      return res;
    },

    async setStatus(productId: number, status: AdminProductStatus): Promise<AdminProductItem> {
      return this.update(productId, { status });
    },

    async list(): Promise<AdminProductItem[]> {
      const res = await request("/api/admin/products", "GET");
      if (!Array.isArray(res) || !res.every(validProductItem)) {
        throw new AdminProductApiError(502, "INVALID_RESPONSE", "Danh sách sản phẩm không hợp lệ.");
      }
      return res;
    },
  };
}

export const adminProductApi = createAdminProductApi();

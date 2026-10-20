/**
 * Admin Product API Client: Module kết nối và gọi các API quản lý Sản phẩm và Tồn kho cho Admin.
 * Tương ứng với Backend: AdminProductServlet (/api/admin/products/*).
 */

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
  spec?: Record<string, unknown>;
};

export type UpdateProductInput = {
  name?: string;
  description?: string | null;
  price?: number;
  categoryId?: number;
  brandId?: number;
  status?: AdminProductStatus;
  spec?: Record<string, unknown>;
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
  spec?: Record<string, unknown> | null;
};

/**
 * Lớp lỗi chuẩn hóa cho các API Admin Product
 */
export class AdminProductApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "AdminProductApiError";
    this.status = status;
    this.code = code;
  }
}

// =============================================================================
// CÁC HÀM VALIDATE DỮ LIỆU ĐẦU VÀO & PHẢN HỒI JSON
// =============================================================================

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isValidProductItem(value: unknown): value is AdminProductItem {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<AdminProductItem>;
  return (
    isPositiveInteger(p.productId) &&
    typeof p.name === "string" &&
    typeof p.price === "number" &&
    p.price >= 0 &&
    typeof p.status === "string" &&
    isPositiveInteger(p.categoryId) &&
    typeof p.categoryName === "string" &&
    isPositiveInteger(p.brandId) &&
    typeof p.brandName === "string" &&
    isNonNegativeInteger(p.quantityOnHand) &&
    isNonNegativeInteger(p.reservedQuantity) &&
    typeof p.availableQuantity === "number"
  );
}

// =============================================================================
// ADMIN PRODUCT API FACTORY
// =============================================================================

export function createAdminProductApi(transport: typeof fetch = fetch) {
  /**
   * Hàm phụ trợ gửi request HTTP tới máy chủ backend
   */
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
      const code = typeof data?.code === "string" ? data.code : "HTTP_ERROR";
      const message = typeof data?.message === "string" ? data.message : `Máy chủ trả lỗi ${response.status}.`;
      throw new AdminProductApiError(response.status, code, message);
    }
    return data;
  }

  function requireValidId(productId: number): void {
    if (!isPositiveInteger(productId)) {
      throw new AdminProductApiError(400, "INVALID_ID", "Product ID không hợp lệ.");
    }
  }

  return {
    /**
     * Lấy thông tin chi tiết của một sản phẩm theo ID
     */
    async get(productId: number): Promise<AdminProductItem> {
      requireValidId(productId);
      const res = await request(`/api/admin/products/${productId}`, "GET");
      if (!isValidProductItem(res)) {
        throw new AdminProductApiError(502, "INVALID_RESPONSE", "Phản hồi sản phẩm không hợp lệ.");
      }
      return res;
    },

    /**
     * Tạo mới một sản phẩm (kèm tồn kho và thông số kỹ thuật Specs ban đầu)
     */
    async create(input: CreateProductInput): Promise<AdminProductItem> {
      if (!input.name || input.name.trim().length === 0) {
        throw new AdminProductApiError(400, "INVALID_INPUT", "Tên sản phẩm không được để trống.");
      }
      if (typeof input.price !== "number" || input.price < 0) {
        throw new AdminProductApiError(400, "INVALID_INPUT", "Giá sản phẩm không hợp lệ.");
      }
      if (!isPositiveInteger(input.categoryId)) {
        throw new AdminProductApiError(400, "INVALID_INPUT", "Danh mục là bắt buộc.");
      }
      if (!isPositiveInteger(input.brandId)) {
        throw new AdminProductApiError(400, "INVALID_INPUT", "Thương hiệu là bắt buộc.");
      }
      if (!isNonNegativeInteger(input.quantityOnHand)) {
        throw new AdminProductApiError(400, "INVALID_INPUT", "Số lượng tồn kho ban đầu không hợp lệ.");
      }

      const res = await request("/api/admin/products", "POST", input);
      if (!isValidProductItem(res)) {
        throw new AdminProductApiError(502, "INVALID_RESPONSE", "Phản hồi tạo sản phẩm không hợp lệ.");
      }
      return res;
    },

    /**
     * Cập nhật thông tin chi tiết của sản phẩm (PATCH /api/admin/products/{id})
     */
    async update(productId: number, input: UpdateProductInput): Promise<AdminProductItem> {
      requireValidId(productId);
      const res = await request(`/api/admin/products/${productId}`, "PATCH", input);
      if (!isValidProductItem(res)) {
        throw new AdminProductApiError(502, "INVALID_RESPONSE", "Phản hồi cập nhật sản phẩm không hợp lệ.");
      }
      return res;
    },

    /**
     * Cập nhật số lượng tồn kho thực tế của sản phẩm (PATCH /api/admin/products/{id}/inventory)
     */
    async updateInventory(
      productId: number,
      input: UpdateInventoryInput
    ): Promise<{
      productId: number;
      quantityOnHand: number;
      reservedQuantity: number;
      availableQuantity: number;
    }> {
      requireValidId(productId);
      if (!isNonNegativeInteger(input.quantityOnHand)) {
        throw new AdminProductApiError(400, "INVALID_INPUT", "Số lượng tồn kho không hợp lệ.");
      }
      const res = (await request(
        `/api/admin/products/${productId}/inventory`,
        "PATCH",
        input
      )) as {
        productId: number;
        quantityOnHand: number;
        reservedQuantity: number;
        availableQuantity: number;
      };
      return res;
    },

    /**
     * Đổi trạng thái hiển thị của sản phẩm (ACTIVE / DRAFT / HIDDEN...)
     */
    async setStatus(productId: number, status: AdminProductStatus): Promise<AdminProductItem> {
      return this.update(productId, { status });
    },

    /**
     * Lấy danh sách toàn bộ sản phẩm cho bảng quản trị Dashboard
     */
    async list(): Promise<AdminProductItem[]> {
      const res = await request("/api/admin/products", "GET");
      if (!Array.isArray(res) || !res.every(isValidProductItem)) {
        throw new AdminProductApiError(502, "INVALID_RESPONSE", "Danh sách sản phẩm không hợp lệ.");
      }
      return res;
    },
  };
}

export const adminProductApi = createAdminProductApi();

/**
 * Catalog API Client: Module kết nối và giao tiếp với Backend ProductServlet (/api/products).
 * Cung cấp các hàm tra cứu danh mục, tìm kiếm và xem chi tiết sản phẩm phía khách hàng.
 */

export type CatalogCategory = {
  categoryId: number;
  name: string;
  componentType: string | null;
};

export type CatalogBrand = {
  brandId: number;
  name: string;
  logoUrl: string | null;
};

export type CatalogCategoryOption = CatalogCategory & {
  description: string | null;
};

export type CatalogBrandOption = CatalogBrand & {
  description: string | null;
};

export type CatalogProduct = {
  productId: number;
  name: string;
  description: string | null;
  price: number;
  status: string;
  category: CatalogCategory | null;
  brand: CatalogBrand | null;
  imageUrls: string[];
  availableQuantity: number;
  inStock: boolean;
};

export type CatalogPage = {
  items: CatalogProduct[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

export type CatalogQuery = {
  q?: string;
  categoryId?: number;
  brandId?: number;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  size?: number;
  sort?: string;
};

/**
 * Lớp ngoại lệ chuẩn hóa cho các lỗi phát sinh từ Catalog API
 */
export class CatalogApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string, code = "HTTP_ERROR") {
    super(message);
    this.name = "CatalogApiError";
    this.status = status;
    this.code = code;
  }
}

// =============================================================================
// CÁC HÀM VALIDATE DỮ LIỆU ĐẦU VÀO & PHẢN HỒI JSON TỪ SERVER
// =============================================================================

function createInvalidResponseError(): CatalogApiError {
  return new CatalogApiError(502, "Phản hồi catalog không hợp lệ.", "INVALID_RESPONSE");
}

function parseProductItem(raw: unknown): CatalogProduct {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw createInvalidResponseError();
  }

  const p = raw as Record<string, unknown>;

  // Kiểm tra tính hợp lệ của các trường bắt buộc
  if (typeof p.productId !== "number" || !Number.isInteger(p.productId) || p.productId < 1) {
    throw createInvalidResponseError();
  }
  if (typeof p.name !== "string" || typeof p.price !== "number" || !Number.isFinite(p.price) || p.price < 0) {
    throw createInvalidResponseError();
  }
  if (typeof p.status !== "string") {
    throw createInvalidResponseError();
  }
  if (typeof p.availableQuantity !== "number" || !Number.isInteger(p.availableQuantity) || p.availableQuantity < 0) {
    throw createInvalidResponseError();
  }
  if (typeof p.inStock !== "boolean") {
    throw createInvalidResponseError();
  }
  if (!Array.isArray(p.imageUrls) || !p.imageUrls.every((url) => typeof url === "string")) {
    throw createInvalidResponseError();
  }

  // Parse Danh mục
  let category: CatalogCategory | null = null;
  if (p.category && typeof p.category === "object" && !Array.isArray(p.category)) {
    const c = p.category as Record<string, unknown>;
    if (typeof c.categoryId === "number" && typeof c.name === "string") {
      category = {
        categoryId: c.categoryId,
        name: c.name,
        componentType: typeof c.componentType === "string" ? c.componentType : null,
      };
    }
  }

  // Parse Hãng
  let brand: CatalogBrand | null = null;
  if (p.brand && typeof p.brand === "object" && !Array.isArray(p.brand)) {
    const b = p.brand as Record<string, unknown>;
    if (typeof b.brandId === "number" && typeof b.name === "string") {
      brand = {
        brandId: b.brandId,
        name: b.name,
        logoUrl: typeof b.logoUrl === "string" ? b.logoUrl : null,
      };
    }
  }

  return {
    productId: p.productId,
    name: p.name,
    description: typeof p.description === "string" ? p.description : null,
    price: p.price,
    status: p.status,
    category,
    brand,
    imageUrls: [...p.imageUrls],
    availableQuantity: p.availableQuantity,
    inStock: p.inStock,
  };
}

function parsePageResult(raw: unknown): CatalogPage {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw createInvalidResponseError();
  }

  const pageObj = raw as Record<string, unknown>;
  if (!Array.isArray(pageObj.items)) {
    throw createInvalidResponseError();
  }

  const page = typeof pageObj.page === "number" && Number.isInteger(pageObj.page) ? pageObj.page : null;
  const size = typeof pageObj.size === "number" && Number.isInteger(pageObj.size) ? pageObj.size : null;
  const totalItems = typeof pageObj.totalItems === "number" && Number.isInteger(pageObj.totalItems) ? pageObj.totalItems : null;
  const totalPages = typeof pageObj.totalPages === "number" && Number.isInteger(pageObj.totalPages) ? pageObj.totalPages : null;

  if (page === null || page < 0 || size === null || size < 1 || totalItems === null || totalItems < 0 || totalPages === null || totalPages < 0) {
    throw createInvalidResponseError();
  }

  return {
    items: pageObj.items.map(parseProductItem),
    page,
    size,
    totalItems,
    totalPages,
  };
}

function buildQueryString(query: CatalogQuery = {}): string {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.categoryId !== undefined) params.set("categoryId", String(query.categoryId));
  if (query.brandId !== undefined) params.set("brandId", String(query.brandId));
  if (query.minPrice !== undefined) params.set("minPrice", String(query.minPrice));
  if (query.maxPrice !== undefined) params.set("maxPrice", String(query.maxPrice));
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.size !== undefined) params.set("size", String(query.size));
  if (query.sort?.trim()) params.set("sort", query.sort.trim());

  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

function normalizeProductName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi-VN");
}

// =============================================================================
// CATALOG API FACTORY
// =============================================================================

export function createCatalogApi(transport: typeof fetch = fetch) {
  /**
   * Hàm phụ trợ gửi yêu cầu HTTP GET đến máy chủ backend
   */
  async function sendGetRequest(endpoint: string): Promise<unknown> {
    let response: Response;
    try {
      response = await transport(endpoint, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
    } catch {
      throw new CatalogApiError(0, "Không thể kết nối máy chủ catalog. Vui lòng thử lại.", "NETWORK_ERROR");
    }

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      const err = responseData && typeof responseData === "object" ? responseData as Record<string, unknown> : {};
      const message = typeof err.message === "string" ? err.message : `Máy chủ trả lỗi ${response.status}. Vui lòng thử lại.`;
      const code = typeof err.code === "string" ? err.code : "HTTP_ERROR";
      throw new CatalogApiError(response.status, message, code);
    }

    return responseData;
  }

  return {
    /**
     * Lấy danh sách sản phẩm theo bộ lọc (từ khóa, danh mục, hãng, khoảng giá, sắp xếp, phân trang)
     */
    async list(query?: CatalogQuery): Promise<CatalogPage> {
      const url = `/api/products${buildQueryString(query)}`;
      const data = await sendGetRequest(url);
      return parsePageResult(data);
    },

    /**
     * Lấy thông tin chi tiết một sản phẩm theo ID
     */
    async getById(productId: number): Promise<CatalogProduct> {
      if (!Number.isInteger(productId) || productId < 1) {
        throw new CatalogApiError(400, "Product id không hợp lệ.", "INVALID_ID");
      }
      const data = await sendGetRequest(`/api/products/${productId}`);
      return parseProductItem(data);
    },

    /**
     * Tìm chính xác một sản phẩm theo tên (so khớp toàn bộ chuỗi)
     */
    async findExactByName(name: string): Promise<CatalogProduct | null> {
      const trimmed = name.trim().replace(/\s+/g, " ");
      const normalized = normalizeProductName(trimmed);
      if (!normalized) return null;

      const resultPage = await this.list({ q: trimmed, page: 0, size: 50 });
      for (const item of resultPage.items) {
        if (normalizeProductName(item.name) === normalized) {
          return item;
        }
      }
      return null;
    },

    /**
     * Lấy danh sách toàn bộ danh mục đang hoạt động (ACTIVE)
     */
    async listCategories(): Promise<CatalogCategoryOption[]> {
      const data = await sendGetRequest("/api/categories");
      if (!Array.isArray(data)) {
        throw createInvalidResponseError();
      }
      return data.map((item) => {
        if (!item || typeof item !== "object") throw createInvalidResponseError();
        const obj = item as Record<string, unknown>;
        if (typeof obj.categoryId !== "number" || typeof obj.name !== "string") {
          throw createInvalidResponseError();
        }
        return {
          categoryId: obj.categoryId,
          name: obj.name,
          componentType: typeof obj.componentType === "string" ? obj.componentType : null,
          description: typeof obj.description === "string" ? obj.description : null,
        };
      });
    },

    /**
     * Lấy danh sách toàn bộ thương hiệu đang hoạt động (ACTIVE)
     */
    async listBrands(): Promise<CatalogBrandOption[]> {
      const data = await sendGetRequest("/api/brands");
      if (!Array.isArray(data)) {
        throw createInvalidResponseError();
      }
      return data.map((item) => {
        if (!item || typeof item !== "object") throw createInvalidResponseError();
        const obj = item as Record<string, unknown>;
        if (typeof obj.brandId !== "number" || typeof obj.name !== "string") {
          throw createInvalidResponseError();
        }
        return {
          brandId: obj.brandId,
          name: obj.name,
          logoUrl: typeof obj.logoUrl === "string" ? obj.logoUrl : null,
          description: typeof obj.description === "string" ? obj.description : null,
        };
      });
    },
  };
}

export const catalogApi = createCatalogApi();

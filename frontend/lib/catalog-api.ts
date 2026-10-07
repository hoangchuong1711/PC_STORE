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

/** Product shape returned by the public Java catalog API. */
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
};

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

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function integerValue(value: unknown): number | null {
  const parsed = numberValue(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  throw invalidResponse();
}

function invalidResponse(): CatalogApiError {
  return new CatalogApiError(502, "Phản hồi catalog không hợp lệ.", "INVALID_RESPONSE");
}

function parseCategory(value: unknown): CatalogCategory | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) throw invalidResponse();
  const categoryId = integerValue(value.categoryId);
  if (categoryId === null || categoryId < 1 || typeof value.name !== "string") throw invalidResponse();
  return {
    categoryId,
    name: value.name,
    componentType: nullableString(value.componentType),
  };
}

function parseBrand(value: unknown): CatalogBrand | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) throw invalidResponse();
  const brandId = integerValue(value.brandId);
  if (brandId === null || brandId < 1 || typeof value.name !== "string") throw invalidResponse();
  return {
    brandId,
    name: value.name,
    logoUrl: nullableString(value.logoUrl),
  };
}

function parseCategoryOption(value: unknown): CatalogCategoryOption {
  if (!isRecord(value)) throw invalidResponse();
  const category = parseCategory(value);
  if (!category) throw invalidResponse();
  return {
    ...category,
    description: nullableString(value.description),
  };
}

function parseBrandOption(value: unknown): CatalogBrandOption {
  if (!isRecord(value)) throw invalidResponse();
  const brand = parseBrand(value);
  if (!brand) throw invalidResponse();
  return {
    ...brand,
    description: nullableString(value.description),
  };
}

function parseProduct(value: unknown): CatalogProduct {
  if (!isRecord(value)) throw invalidResponse();
  const productId = integerValue(value.productId);
  const price = numberValue(value.price);
  const availableQuantity = integerValue(value.availableQuantity);
  if (
    productId === null || productId < 1
    || typeof value.name !== "string"
    || (value.description !== null && typeof value.description !== "string")
    || price === null || price < 0
    || typeof value.status !== "string"
    || !Array.isArray(value.imageUrls) || !value.imageUrls.every((url) => typeof url === "string")
    || availableQuantity === null || availableQuantity < 0
    || typeof value.inStock !== "boolean"
  ) throw invalidResponse();

  return {
    productId,
    name: value.name,
    description: value.description as string | null,
    price,
    status: value.status,
    category: parseCategory(value.category),
    brand: parseBrand(value.brand),
    imageUrls: [...value.imageUrls] as string[],
    availableQuantity,
    inStock: value.inStock,
  };
}

function parsePage(value: unknown): CatalogPage {
  if (!isRecord(value) || !Array.isArray(value.items)) throw invalidResponse();
  const page = integerValue(value.page);
  const size = integerValue(value.size);
  const totalItems = integerValue(value.totalItems);
  const totalPages = integerValue(value.totalPages);
  if (
    page === null || page < 0 || size === null || size < 1
    || totalItems === null || totalItems < 0 || totalPages === null || totalPages < 0
  ) throw invalidResponse();

  return {
    items: value.items.map(parseProduct),
    page,
    size,
    totalItems,
    totalPages,
  };
}

function queryString(query: CatalogQuery = {}): string {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.categoryId !== undefined) params.set("categoryId", String(query.categoryId));
  if (query.brandId !== undefined) params.set("brandId", String(query.brandId));
  if (query.minPrice !== undefined) params.set("minPrice", String(query.minPrice));
  if (query.maxPrice !== undefined) params.set("maxPrice", String(query.maxPrice));
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.size !== undefined) params.set("size", String(query.size));
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

export function createCatalogApi(transport: typeof fetch = fetch) {
  async function request(endpoint: string): Promise<unknown> {
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

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const body = isRecord(data) ? data : {};
      throw new CatalogApiError(
        response.status,
        typeof body.message === "string" ? body.message : `Máy chủ trả lỗi ${response.status}. Vui lòng thử lại.`,
        typeof body.code === "string" ? body.code : "HTTP_ERROR",
      );
    }
    return data;
  }

  return {
    async list(query?: CatalogQuery): Promise<CatalogPage> {
      return parsePage(await request(`/api/products${queryString(query)}`));
    },
    async getById(productId: number): Promise<CatalogProduct> {
      if (!Number.isInteger(productId) || productId < 1) {
        throw new CatalogApiError(400, "Product id không hợp lệ.", "INVALID_ID");
      }
      return parseProduct(await request(`/api/products/${productId}`));
    },
    async listCategories(): Promise<CatalogCategoryOption[]> {
      const data = await request("/api/categories");
      if (!Array.isArray(data)) throw invalidResponse();
      return data.map(parseCategoryOption);
    },
    async listBrands(): Promise<CatalogBrandOption[]> {
      const data = await request("/api/brands");
      if (!Array.isArray(data)) throw invalidResponse();
      return data.map(parseBrandOption);
    },
  };
}

export const catalogApi = createCatalogApi();



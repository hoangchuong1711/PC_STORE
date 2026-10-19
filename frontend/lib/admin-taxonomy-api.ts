/**
 * Admin Taxonomy API Client: Module kết nối và gọi các API quản lý Danh mục (Categories)
 * và Thương hiệu (Brands) cho bảng quản trị Admin.
 * Tương ứng với Backend: AdminTaxonomyServlet (/api/admin/categories/*, /api/admin/brands/*).
 */

export type TaxonomyKind = "categories" | "brands";
export type TaxonomyStatus = "ACTIVE" | "INACTIVE";

export const componentTypes = [
  "CPU",
  "MOTHERBOARD",
  "RAM",
  "GPU",
  "STORAGE",
  "PSU",
  "CASE",
  "COOLER",
] as const;

export type ComponentType = typeof componentTypes[number];

export type TaxonomyInput = {
  name: string;
  description: string | null;
  status: TaxonomyStatus;
  componentType: ComponentType | null;
  logoUrl: string | null;
};

export type TaxonomyEntry = TaxonomyInput & {
  id: number;
  productCount: number;
};

/**
 * Lớp lỗi chuẩn hóa cho các API Taxonomy Admin
 */
export class TaxonomyApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "TaxonomyApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Hàm kiểm tra và chuyển đổi dữ liệu phản hồi từ server thành đối tượng TaxonomyEntry
 */
function parseEntry(value: unknown): TaxonomyEntry {
  const row = value as Partial<TaxonomyEntry> | null;
  if (
    !row ||
    typeof row !== "object" ||
    !Number.isSafeInteger(row.id) ||
    (row.id ?? 0) < 1 ||
    typeof row.name !== "string" ||
    (row.description !== null && typeof row.description !== "string") ||
    !["ACTIVE", "INACTIVE"].includes(row.status ?? "") ||
    !Number.isSafeInteger(row.productCount) ||
    (row.productCount ?? -1) < 0 ||
    (row.componentType !== null && !componentTypes.includes(row.componentType as ComponentType)) ||
    (row.logoUrl !== null && typeof row.logoUrl !== "string")
  ) {
    throw new TaxonomyApiError(502, "INVALID_RESPONSE", "Dữ liệu danh mục/hãng không hợp lệ.");
  }
  return row as TaxonomyEntry;
}

export function createAdminTaxonomyApi(transport: typeof fetch = fetch) {
  /**
   * Hàm phụ trợ gửi request HTTP tới máy chủ backend
   */
  async function request(path: string, method: string, body?: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await transport(`/api/admin/${path}`, {
        method,
        credentials: "same-origin",
        cache: "no-store",
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new TaxonomyApiError(0, "NETWORK_ERROR", "Không thể kết nối máy chủ. Vui lòng thử lại.");
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const code = typeof data?.code === "string" ? data.code : "HTTP_ERROR";
      const message = typeof data?.message === "string" ? data.message : `Máy chủ trả lỗi ${response.status}.`;
      throw new TaxonomyApiError(response.status, code, message);
    }
    return data;
  }

  function formatIdPath(kind: TaxonomyKind, id: number): string {
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new TaxonomyApiError(400, "INVALID_ID", "ID không hợp lệ.");
    }
    return `${kind}/${id}`;
  }

  return {
    /**
     * Lấy danh sách toàn bộ danh mục hoặc thương hiệu
     */
    async list(kind: TaxonomyKind): Promise<TaxonomyEntry[]> {
      const data = await request(kind, "GET");
      if (!Array.isArray(data)) {
        throw new TaxonomyApiError(502, "INVALID_RESPONSE", "Danh sách phản hồi không hợp lệ.");
      }
      return data.map(parseEntry);
    },

    /**
     * Tạo mới hoặc cập nhật thông tin một danh mục hoặc thương hiệu
     */
    async save(kind: TaxonomyKind, id: number | null, input: TaxonomyInput): Promise<TaxonomyEntry> {
      const { name, description, status, componentType, logoUrl } = input;
      const body =
        kind === "categories"
          ? { name, description, status, componentType }
          : { name, description, status, logoUrl };

      const urlPath = id === null ? kind : formatIdPath(kind, id);
      const method = id === null ? "POST" : "PUT";

      const result = await request(urlPath, method, body);
      return parseEntry(result);
    },

    /**
     * Cập nhật trạng thái hiển thị (ACTIVE / INACTIVE) của danh mục hoặc thương hiệu
     */
    async setStatus(kind: TaxonomyKind, id: number, status: TaxonomyStatus): Promise<TaxonomyEntry> {
      const urlPath = `${formatIdPath(kind, id)}/status`;
      const result = await request(urlPath, "PUT", { status });
      return parseEntry(result);
    },
  };
}

export const adminTaxonomyApi = createAdminTaxonomyApi();

// Các kiểu bên dưới mô tả JSON gửi/nhận. View gọi các hàm API ở cuối file.
export type SetupProduct = {
  productId: number;
  name: string;
};

// Sản phẩm dùng trong form đăng Setup; không phải dữ liệu dùng để tính giá đơn hàng.
export type SetupProductOption = {
  productId: number;
  name: string;
  price: number;
  category: string;
};

export type SetupPost = {
  postId: number;
  authorId: number;
  title: string;
  description: string;
  status: "PUBLISHED" | "HIDDEN" | string;
  createdAt: string;
  updatedAt: string;
  mediaIds: string[];
  products: SetupProduct[];
};

export type SetupEligibility = {
  eligible: boolean;
  reason: string | null;
};

export type SetupLikeResult = {
  postId: number;
  likeCount: number;
  liked: boolean;
};

export type SetupRankedItem = {
  post: SetupPost;
  likeCount: number;
  liked: boolean;
};

export type CreateSetupInput = {
  title: string;
  description: string;
  mediaIds: string[];
  productIds: number[];
};

export type UpdateSetupInput = {
  title: string;
  description: string;
  mediaIds: string[];
  productIds: number[];
};

export type SetupModerationInput = {
  status: "PUBLISHED" | "HIDDEN";
  reason?: string;
};

export type SetupModeratedItem = {
  post: SetupPost;
  likeCount: number;
  moderationReason: string | null;
  moderatedBy: number | null;
  moderatedAt: string | null;
};

export class CommunityApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Mặc định dùng fetch của trình duyệt; transport cho phép kiểm thử bằng response giả.
export function createCommunityApi(transport: typeof fetch = fetch) {
  // T là kiểu dữ liệu JSON mà hàm gọi muốn nhận (ví dụ ReviewItem hoặc SetupPost).
  async function sendRequest<T>(path: string, method: string = "GET", body?: unknown): Promise<T> {
    // 1. Chuẩn bị HTTP method, cookie đăng nhập và JSON body (nếu có).
    const options: RequestInit = {
      method,
      credentials: "same-origin",
      cache: "no-store",
    };
    if (body !== undefined) {
      options.headers = { "Content-Type": "application/json" };
      options.body = JSON.stringify(body);
    }

    // 2. Gửi tới /api; next.config.ts chuyển tiếp request sang Java backend.
    let response: Response;
    try {
      response = await transport(path, options);
    } catch {
      throw new CommunityApiError(0, "NETWORK_ERROR", "Không thể kết nối đến máy chủ cộng đồng.");
    }

    // 3. HTTP 204 không có body; các response khác được đọc thành dữ liệu JavaScript.
    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json().catch(() => null);
    // 4. HTTP lỗi đi vào catch của view; thành công thì trả dữ liệu cho view cập nhật state.
    if (!response.ok) {
      throw new CommunityApiError(
        response.status,
        data?.code ?? "COMMUNITY_ERROR",
        data?.message ?? `Lỗi máy chủ (${response.status}).`
      );
    }
    return data as T;
  }

  return {
    // Form đăng Setup: GET /api/products?size=50 → ProductServlet.doGet → các nút chọn linh kiện.
    async listSetupProducts(): Promise<SetupProductOption[]> {
      type Product = { productId: number; name: string; price?: number; category?: { name?: string } };
      const response = await sendRequest<Product[] | { items?: Product[] } | null>("/api/products?size=50", "GET");
      if (!response) return [];
      const products = Array.isArray(response) ? response : response.items || [];
      return products.map((product) => ({
        productId: product.productId,
        name: product.name,
        price: product.price ?? 0,
        category: product.category?.name || "Linh kiện",
      }));
    },

    // GET /api/setups → SetupServlet.doGet: danh sách bài công khai.
    async feed(offset: number = 0, limit: number = 20): Promise<SetupPost[]> {
      const res = await sendRequest<SetupPost[]>(`/api/setups?offset=${offset}&limit=${limit}`, "GET");
      return Array.isArray(res) ? res : [];
    },

    // GET /api/setups/ranking → SetupSocialServlet.doGet: bài đăng kèm số like.
    async ranking(offset: number = 0, limit: number = 20): Promise<SetupRankedItem[]> {
      const res = await sendRequest<SetupRankedItem[]>(`/api/setups/ranking?offset=${offset}&limit=${limit}`, "GET");
      return Array.isArray(res) ? res : [];
    },

    // GET /api/setups/{id} → SetupServlet.doGet: một bài công khai.
    async getById(id: number): Promise<SetupPost | null> {
      try {
        return await sendRequest<SetupPost>(`/api/setups/${id}`, "GET");
      } catch (err) {
        if (err instanceof CommunityApiError && (err.status === 404 || err.code === "SETUP_NOT_FOUND")) {
          return null;
        }
        throw err;
      }
    },

    // GET bài của người đăng nhập → SetupServlet.doGet.
    async getOwn(id: number): Promise<SetupPost | null> {
      try {
        return await sendRequest<SetupPost>(`/api/customer/setups/${id}`, "GET");
      } catch (err) {
        if (err instanceof CommunityApiError && (err.status === 404 || err.code === "SETUP_NOT_FOUND")) {
          return null;
        }
        throw err;
      }
    },

    // GET danh sách bài của người đăng nhập → SetupServlet.doGet.
    async listOwn(offset: number = 0, limit: number = 20): Promise<SetupPost[]> {
      const res = await sendRequest<SetupPost[]>(`/api/customer/setups?offset=${offset}&limit=${limit}`, "GET");
      return Array.isArray(res) ? res : [];
    },

    // Khi mở form → GET /api/customer/setups/eligibility → SetupServlet.doGet: quyền đăng bài.
    async checkEligibility(): Promise<SetupEligibility> {
      return sendRequest<SetupEligibility>("/api/customer/setups/eligibility", "GET");
    },

    // Form Đăng Setup → POST /api/customer/setups → SetupServlet.doPost; nhận bài mới có postId.
    async create(body: CreateSetupInput): Promise<SetupPost> {
      return sendRequest<SetupPost>("/api/customer/setups", "POST", body);
    },

    // PUT bài Setup → SetupServlet.doPut (API sẵn có, chưa có form sửa riêng).
    async update(id: number, body: UpdateSetupInput): Promise<SetupPost> {
      return sendRequest<SetupPost>(`/api/customer/setups/${id}`, "PUT", body);
    },

    // DELETE bài Setup → SetupServlet.doDelete; HTTP 204 không có JSON.
    async remove(id: number): Promise<void> {
      return sendRequest<void>(`/api/customer/setups/${id}`, "DELETE");
    },

    // GET /api/setup-likes/{id} → SetupSocialServlet.doGet: likeCount và liked.
    async getLike(id: number): Promise<SetupLikeResult> {
      return sendRequest<SetupLikeResult>(`/api/setup-likes/${id}`, "GET");
    },

    // PUT /api/setup-likes/{id} → SetupSocialServlet.doPut: thích bài.
    async like(id: number): Promise<SetupLikeResult> {
      return sendRequest<SetupLikeResult>(`/api/setup-likes/${id}`, "PUT");
    },

    // DELETE /api/setup-likes/{id} → SetupSocialServlet.doDelete: bỏ thích.
    async unlike(id: number): Promise<SetupLikeResult> {
      return sendRequest<SetupLikeResult>(`/api/setup-likes/${id}`, "DELETE");
    },

    // GET /api/admin/setups → SetupSocialServlet.doGet: danh sách dành cho quản trị.
    async adminList(params?: { status?: string; offset?: number; limit?: number }): Promise<SetupModeratedItem[]> {
      const p = new URLSearchParams();
      if (params?.status) p.set("status", params.status);
      if (params?.offset !== undefined) p.set("offset", String(params.offset));
      if (params?.limit !== undefined) p.set("limit", String(params.limit));
      const qs = p.toString() ? `?${p.toString()}` : "";
      const res = await sendRequest<SetupModeratedItem[]>(`/api/admin/setups${qs}`, "GET");
      return Array.isArray(res) ? res : [];
    },

    // Admin ẩn/hiện → PUT /api/admin/setups/{id}/status → SetupSocialServlet.doPut.
    async adminModerate(id: number, body: SetupModerationInput): Promise<SetupModeratedItem> {
      return sendRequest<SetupModeratedItem>(`/api/admin/setups/${id}/status`, "PUT", body);
    },
  };
}

export const communityApi = createCommunityApi();

export type SetupProduct = {
  productId: number;
  name: string;
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

export function createCommunityApi(transport: typeof fetch = fetch) {
  async function request<T>(path: string, method: string = "GET", body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await transport(path, {
        method,
        credentials: "same-origin",
        cache: "no-store",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new CommunityApiError(0, "NETWORK_ERROR", "Không thể kết nối đến máy chủ cộng đồng.");
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json().catch(() => null);
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
    async feed(offset: number = 0, limit: number = 20): Promise<SetupPost[]> {
      const res = await request<SetupPost[]>(`/api/setups?offset=${offset}&limit=${limit}`, "GET");
      return Array.isArray(res) ? res : [];
    },

    async ranking(offset: number = 0, limit: number = 20): Promise<SetupRankedItem[]> {
      const res = await request<SetupRankedItem[]>(`/api/setups/ranking?offset=${offset}&limit=${limit}`, "GET");
      return Array.isArray(res) ? res : [];
    },

    async getById(id: number): Promise<SetupPost | null> {
      try {
        return await request<SetupPost>(`/api/setups/${id}`, "GET");
      } catch (err) {
        if (err instanceof CommunityApiError && (err.status === 404 || err.code === "SETUP_NOT_FOUND")) {
          return null;
        }
        throw err;
      }
    },

    async getOwn(id: number): Promise<SetupPost | null> {
      try {
        return await request<SetupPost>(`/api/customer/setups/${id}`, "GET");
      } catch (err) {
        if (err instanceof CommunityApiError && (err.status === 404 || err.code === "SETUP_NOT_FOUND")) {
          return null;
        }
        throw err;
      }
    },

    async listOwn(offset: number = 0, limit: number = 20): Promise<SetupPost[]> {
      const res = await request<SetupPost[]>(`/api/customer/setups?offset=${offset}&limit=${limit}`, "GET");
      return Array.isArray(res) ? res : [];
    },

    async checkEligibility(): Promise<SetupEligibility> {
      return request<SetupEligibility>("/api/customer/setups/eligibility", "GET");
    },

    async create(body: CreateSetupInput): Promise<SetupPost> {
      return request<SetupPost>("/api/customer/setups", "POST", body);
    },

    async update(id: number, body: UpdateSetupInput): Promise<SetupPost> {
      return request<SetupPost>(`/api/customer/setups/${id}`, "PUT", body);
    },

    async remove(id: number): Promise<void> {
      return request<void>(`/api/customer/setups/${id}`, "DELETE");
    },

    async getLike(id: number): Promise<SetupLikeResult> {
      return request<SetupLikeResult>(`/api/setup-likes/${id}`, "GET");
    },

    async like(id: number): Promise<SetupLikeResult> {
      return request<SetupLikeResult>(`/api/setup-likes/${id}`, "PUT");
    },

    async unlike(id: number): Promise<SetupLikeResult> {
      return request<SetupLikeResult>(`/api/setup-likes/${id}`, "DELETE");
    },

    async adminList(params?: { status?: string; offset?: number; limit?: number }): Promise<SetupModeratedItem[]> {
      const p = new URLSearchParams();
      if (params?.status) p.set("status", params.status);
      if (params?.offset !== undefined) p.set("offset", String(params.offset));
      if (params?.limit !== undefined) p.set("limit", String(params.limit));
      const qs = p.toString() ? `?${p.toString()}` : "";
      const res = await request<SetupModeratedItem[]>(`/api/admin/setups${qs}`, "GET");
      return Array.isArray(res) ? res : [];
    },

    async adminModerate(id: number, body: SetupModerationInput): Promise<SetupModeratedItem> {
      return request<SetupModeratedItem>(`/api/admin/setups/${id}/status`, "PUT", body);
    },
  };
}

export const communityApi = createCommunityApi();

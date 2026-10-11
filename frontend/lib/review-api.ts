export type ReviewSort = "NEWEST" | "OLDEST" | "RATING_DESC" | "RATING_ASC" | "HELPFUL";

export type ReviewAuthor = {
  userId: number;
  fullName: string;
};

export type ReviewMedia = {
  mediaId: string;
  mediaType: string;
  mimeType: string;
  sizeBytes: number;
  durationSecond: number | null;
  sortOrder: number;
  contentUrl: string;
};

export type ReviewItem = {
  reviewId: number;
  orderItemId: number;
  orderId: number;
  productId: number;
  productName: string;
  author: ReviewAuthor;
  rating: number; // 1 to 5
  content: string;
  status: "PUBLISHED" | "HIDDEN" | "DELETED" | string;
  media: ReviewMedia[];
  likeCount: number;
  likedByCurrentUser: boolean;
  verifiedPurchase: boolean;
};

export type RatingDistribution = {
  rating: number;
  count: number;
  percentage: number;
};

export type ReviewSummary = {
  productId: number;
  averageRating: number;
  totalReviews: number;
  distribution: RatingDistribution[];
};

export type ReviewPageResponse = {
  items: ReviewItem[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  summary: ReviewSummary;
};

export type CreateReviewInput = {
  orderItemId: number;
  productId: number;
  rating: number;
  content: string;
  mediaIds?: string[];
};

export type UpdateReviewInput = {
  rating?: number;
  content?: string;
  mediaIds?: string[];
};

export type ReviewQuery = {
  productId: number;
  page?: number;
  size?: number;
  rating?: number;
  hasMedia?: boolean;
  sort?: ReviewSort | string;
};

export type ReviewLikeResult = {
  reviewId: number;
  likesCount: number;
  isLiked: boolean;
};

export type ModerateReviewInput = {
  status: "PUBLISHED" | "HIDDEN";
  moderationReason?: string;
};

export type ModerateReviewResult = {
  reviewId: number;
  status: string;
  moderationReason: string | null;
  moderatedBy: number | null;
  moderatedAt: string | null;
};

export type AdminReviewApiItem = {
  reviewId: number;
  orderItemId: number;
  orderId: number;
  productId: number;
  productName: string;
  userId: number;
  userName: string;
  rating: number;
  content: string;
  status: "PUBLISHED" | "HIDDEN" | "DELETED" | string;
  moderationReason?: string | null;
  moderatedBy?: number | null;
  moderatedAt?: string | null;
  likesCount: number;
  images: string[];
  verifiedBuyer: boolean;
};

export class ReviewApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function createReviewApi(transport: typeof fetch = fetch) {
  async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
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
      throw new ReviewApiError(0, "NETWORK_ERROR", "Không thể kết nối đến máy chủ đánh giá.");
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ReviewApiError(
        response.status,
        data?.code ?? "HTTP_ERROR",
        data?.message ?? `Máy chủ trả lỗi ${response.status}.`
      );
    }
    return data as T;
  }

  return {
    async list(query: ReviewQuery): Promise<ReviewPageResponse> {
      const params = new URLSearchParams();
      params.set("productId", String(query.productId));
      if (query.page !== undefined) params.set("page", String(query.page));
      if (query.size !== undefined) params.set("size", String(query.size));
      if (query.rating !== undefined) params.set("rating", String(query.rating));
      if (query.hasMedia !== undefined) params.set("hasMedia", String(query.hasMedia));
      if (query.sort) params.set("sort", String(query.sort).toLowerCase());

      return request<ReviewPageResponse>(`/api/reviews?${params.toString()}`, "GET");
    },

    async summary(productId: number): Promise<ReviewSummary> {
      return request<ReviewSummary>(`/api/reviews/summary?productId=${productId}`, "GET");
    },

    async create(input: CreateReviewInput): Promise<ReviewItem> {
      return request<ReviewItem>("/api/customer/reviews", "POST", input);
    },

    async getMine(reviewId: number): Promise<ReviewItem> {
      return request<ReviewItem>(`/api/customer/reviews/${reviewId}`, "GET");
    },

    async getByOrderItem(orderItemId: number): Promise<ReviewItem | null> {
      try {
        return await request<ReviewItem>(`/api/customer/reviews/order-items/${orderItemId}`, "GET");
      } catch (err) {
        if (err instanceof ReviewApiError && (err.status === 404 || err.code === "NOT_FOUND" || err.code === "REVIEW_NOT_FOUND")) {
          return null;
        }
        throw err;
      }
    },

    async update(reviewId: number, input: UpdateReviewInput): Promise<ReviewItem> {
      return request<ReviewItem>(`/api/customer/reviews/${reviewId}`, "PATCH", input);
    },

    async remove(reviewId: number): Promise<void> {
      return request<void>(`/api/customer/reviews/${reviewId}`, "DELETE");
    },

    async restore(reviewId: number): Promise<ReviewItem> {
      return request<ReviewItem>(`/api/customer/reviews/${reviewId}/restore`, "POST");
    },

    async like(reviewId: number): Promise<ReviewLikeResult> {
      return request<ReviewLikeResult>(`/api/customer/reviews/${reviewId}/like`, "PUT");
    },

    async unlike(reviewId: number): Promise<ReviewLikeResult> {
      return request<ReviewLikeResult>(`/api/customer/reviews/${reviewId}/like`, "DELETE");
    },

    async moderate(reviewId: number, input: ModerateReviewInput): Promise<ModerateReviewResult> {
      return request<ModerateReviewResult>(`/api/admin/reviews/${reviewId}/moderation`, "PATCH", input);
    },

    async listAdmin(): Promise<AdminReviewApiItem[]> {
      const data = await request<AdminReviewApiItem[]>("/api/admin/reviews", "GET");
      return Array.isArray(data) ? data : [];
    },
  };
}

export const reviewApi = createReviewApi();

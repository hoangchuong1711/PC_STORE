// Các kiểu bên dưới mô tả JSON gửi/nhận. View gọi các hàm API ở cuối file.
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

// Mặc định dùng fetch của trình duyệt; transport cho phép kiểm thử bằng response giả.
export function createReviewApi(transport: typeof fetch = fetch) {
  // T là kiểu dữ liệu JSON mà hàm gọi muốn nhận (ví dụ ReviewItem hoặc SetupPost).
  async function sendRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
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
      throw new ReviewApiError(0, "NETWORK_ERROR", "Không thể kết nối đến máy chủ đánh giá.");
    }

    // 3. HTTP 204 không có body; các response khác được đọc thành dữ liệu JavaScript.
    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json().catch(() => null);
    // 4. HTTP lỗi đi vào catch của view; thành công thì trả dữ liệu cho view cập nhật state.
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
    // GET /api/reviews → ReviewServlet.doGet: danh sách đánh giá theo sản phẩm/bộ lọc.
    async list(query: ReviewQuery): Promise<ReviewPageResponse> {
      const params = new URLSearchParams();
      params.set("productId", String(query.productId));
      if (query.page !== undefined) params.set("page", String(query.page));
      if (query.size !== undefined) params.set("size", String(query.size));
      if (query.rating !== undefined) params.set("rating", String(query.rating));
      if (query.hasMedia !== undefined) params.set("hasMedia", String(query.hasMedia));
      if (query.sort) params.set("sort", String(query.sort).toLowerCase());

      return sendRequest<ReviewPageResponse>(`/api/reviews?${params.toString()}`, "GET");
    },

    // GET /api/reviews/summary → ReviewServlet.doGet: điểm trung bình và phân bố sao.
    async summary(productId: number): Promise<ReviewSummary> {
      return sendRequest<ReviewSummary>(`/api/reviews/summary?productId=${productId}`, "GET");
    },

    // Form Viết đánh giá → POST /api/customer/reviews → ReviewServlet.doPost; nhận ReviewItem mới.
    async create(input: CreateReviewInput): Promise<ReviewItem> {
      return sendRequest<ReviewItem>("/api/customer/reviews", "POST", input);
    },

    // GET đánh giá của người đang đăng nhập → ReviewServlet.doGet.
    async getMine(reviewId: number): Promise<ReviewItem> {
      return sendRequest<ReviewItem>(`/api/customer/reviews/${reviewId}`, "GET");
    },

    // GET theo dòng đơn hàng → ReviewServlet.doGet; 404 nghĩa là chưa có đánh giá.
    async getByOrderItem(orderItemId: number): Promise<ReviewItem | null> {
      try {
        return await sendRequest<ReviewItem>(`/api/customer/reviews/order-items/${orderItemId}`, "GET");
      } catch (err) {
        if (err instanceof ReviewApiError && (err.status === 404 || err.code === "NOT_FOUND" || err.code === "REVIEW_NOT_FOUND")) {
          return null;
        }
        throw err;
      }
    },

    // PATCH đánh giá → ReviewServlet.service → updateReview (API sẵn có, chưa có form sửa riêng).
    async update(reviewId: number, input: UpdateReviewInput): Promise<ReviewItem> {
      return sendRequest<ReviewItem>(`/api/customer/reviews/${reviewId}`, "PATCH", input);
    },

    // DELETE đánh giá → ReviewServlet.doDelete; HTTP 204 không có JSON.
    async remove(reviewId: number): Promise<void> {
      return sendRequest<void>(`/api/customer/reviews/${reviewId}`, "DELETE");
    },

    // POST /restore → ReviewServlet.doPost: khách khôi phục đánh giá đã xóa.
    async restore(reviewId: number): Promise<ReviewItem> {
      return sendRequest<ReviewItem>(`/api/customer/reviews/${reviewId}/restore`, "POST");
    },

    // PUT /like → ReviewServlet chuyển tiếp ReviewLikeServlet.doPut; nhận likesCount/isLiked.
    async like(reviewId: number): Promise<ReviewLikeResult> {
      return sendRequest<ReviewLikeResult>(`/api/customer/reviews/${reviewId}/like`, "PUT");
    },

    // DELETE /like → ReviewServlet chuyển tiếp ReviewLikeServlet.doDelete.
    async unlike(reviewId: number): Promise<ReviewLikeResult> {
      return sendRequest<ReviewLikeResult>(`/api/customer/reviews/${reviewId}/like`, "DELETE");
    },

    // Admin ẩn/hiện → PATCH /moderation → ReviewModerationServlet.service → moderateReview.
    async moderate(reviewId: number, input: ModerateReviewInput): Promise<ModerateReviewResult> {
      return sendRequest<ModerateReviewResult>(`/api/admin/reviews/${reviewId}/moderation`, "PATCH", input);
    },

    // GET /api/admin/reviews → ReviewModerationServlet.doGet: dữ liệu bảng quản trị.
    async listAdmin(): Promise<AdminReviewApiItem[]> {
      const data = await sendRequest<AdminReviewApiItem[]>("/api/admin/reviews", "GET");
      return Array.isArray(data) ? data : [];
    },
  };
}

export const reviewApi = createReviewApi();

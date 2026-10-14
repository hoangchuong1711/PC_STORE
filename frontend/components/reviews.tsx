"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Star,
  ThumbsUp,
  Camera,
  CheckCircle2,
  X,
  SlidersHorizontal,
  Loader2,
  AlertCircle,
  RefreshCw,
  Upload,
  Film,
  Trash2,
} from "lucide-react";
import {
  reviewApi,
  type ReviewItem,
  type ReviewSummary as ApiReviewSummary,
  ReviewApiError,
} from "../lib/review-api";
import {
  mediaApi,
  MediaApiError,
  mediaContentUrl,
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
} from "../lib/media-api";
import {
  ProductReview,
  getReviewSummary,
  getProductReviews,
  formatReviewDate,
} from "../lib/reviews";
import { useAuth } from "./auth-provider";
import { useToast } from "./toast";

const ratingLabels: Record<number, string> = {
  1: "Rất không hài lòng",
  2: "Chưa hài lòng",
  3: "Bình thường",
  4: "Hài lòng",
  5: "Tuyệt vời, rất hài lòng",
};

export function ProductReviewsSection({
  productSlug,
  productName,
  productId,
}: {
  productSlug: string;
  productName: string;
  productId?: number;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [filterStar, setFilterStar] = useState<number | "ALL" | "WITH_MEDIA">("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "helpful" | "rating">("newest");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Real backend review state
  const [apiReviews, setApiReviews] = useState<ReviewItem[] | null>(null);
  const [apiSummary, setApiSummary] = useState<ApiReviewSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(productId));
  const [error, setError] = useState<string | null>(null);
  const [likingId, setLikingId] = useState<number | null>(null);

  // Fallback local reviews
  const localReviews = useMemo(() => getProductReviews(productSlug), [productSlug]);
  const localSummary = useMemo(() => getReviewSummary(localReviews), [localReviews]);

  const fetchReviews = useCallback(async () => {
    if (!productId || productId <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const sortParam =
        sortBy === "helpful" ? "HELPFUL" : sortBy === "rating" ? "RATING_DESC" : "NEWEST";
      const ratingParam =
        typeof filterStar === "number" ? filterStar : undefined;
      const hasMediaParam = filterStar === "WITH_MEDIA" ? true : undefined;

      const [pageData, summaryData] = await Promise.all([
        reviewApi.list({
          productId,
          page: 0,
          size: 50,
          rating: ratingParam,
          hasMedia: hasMediaParam,
          sort: sortParam,
        }),
        reviewApi.summary(productId).catch(() => null),
      ]);

      setApiReviews(pageData.items);
      if (summaryData) {
        setApiSummary(summaryData);
      } else if (pageData.summary) {
        setApiSummary(pageData.summary);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể tải đánh giá từ máy chủ."
      );
    } finally {
      setLoading(false);
    }
  }, [productId, filterStar, sortBy]);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  const handleToggleLike = async (review: ReviewItem | ProductReview) => {
    const revId = "reviewId" in review ? review.reviewId : Number(review.id);
    if (!revId || isNaN(revId)) {
      toast("Chức năng thích chỉ hỗ trợ cho đánh giá từ hệ thống.", "info");
      return;
    }

    if (!user) {
      toast("Vui lòng đăng nhập để đánh giá là hữu ích.", "info");
      const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
      router.push(currentPath ? `/auth/login?redirect=${encodeURIComponent(currentPath)}` : "/auth/login");
      return;
    }

    if (likingId === revId) return;
    setLikingId(revId);

    const isCurrentlyLiked = "likedByCurrentUser" in review
      ? review.likedByCurrentUser
      : Boolean((review as ProductReview).isLiked);

    try {
      if (isCurrentlyLiked) {
        const res = await reviewApi.unlike(revId);
        setApiReviews((prev) =>
          prev ? prev.map((r) => r.reviewId === revId ? { ...r, likeCount: res.likesCount, likedByCurrentUser: false } : r) : prev
        );
      } else {
        const res = await reviewApi.like(revId);
        setApiReviews((prev) =>
          prev ? prev.map((r) => r.reviewId === revId ? { ...r, likeCount: res.likesCount, likedByCurrentUser: true } : r) : prev
        );
        toast("Đã ghi nhận đánh giá hữu ích!", "success");
      }
    } catch (err) {
      if (err instanceof ReviewApiError && err.code === "SELF_LIKE_NOT_ALLOWED") {
        toast("Bạn không thể tự thích đánh giá của chính mình.", "error");
      } else {
        toast(err instanceof Error ? err.message : "Không thể thích đánh giá.", "error");
      }
    } finally {
      setLikingId(null);
    }
  };

  // Choose between API data and local fallback
  const isUsingApi = apiReviews !== null;
  const displaySummary = isUsingApi && apiSummary
    ? {
        averageRating: apiSummary.averageRating,
        totalReviews: apiSummary.totalReviews,
        distribution: apiSummary.distribution.map((d) => ({
          star: d.rating,
          count: d.count,
          percentage: d.percentage,
        })),
      }
    : localSummary;

  const displayReviews = isUsingApi ? apiReviews : localReviews;

  return (
    <section className="mt-16 pt-12 border-t border-[#e0e0e0]" id="reviews" aria-label="Đánh giá từ khách hàng">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-heading text-2xl md:text-3xl text-ink font-extrabold m-0 tracking-tight">
            Đánh giá từ khách hàng đã mua {productName}
          </h2>
          <p className="font-sans text-sm md:text-base text-muted mt-1.5 mb-0">
            Tổng hợp nhận xét thực tế về hiệu năng, nhiệt độ và độ hoàn thiện từ người dùng xác thực
          </p>
        </div>
        {productId && (
          <button
            type="button"
            onClick={() => void fetchReviews()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Làm mới đánh giá"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Làm mới</span>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-amber-600" />
            <span>{error} (Đang hiển thị dữ liệu mẫu dự phòng)</span>
          </div>
          <button
            type="button"
            onClick={() => void fetchReviews()}
            className="font-semibold underline hover:text-amber-900 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Scorecard Summary */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 md:gap-10 bg-white border border-[#e0e0e0] rounded-[18px] p-7 md:p-8 mb-8">
        <div className="flex flex-col items-center justify-center text-center md:border-r border-[#e0e0e0] md:pr-8 max-md:pb-6 max-md:border-b">
          <strong className="font-specs text-5xl md:text-6xl font-bold text-ink leading-none tracking-wide mb-2">
            {displaySummary.averageRating.toFixed(1)}
          </strong>
          <div className="flex gap-1 mb-2" aria-label={`Đánh giá ${displaySummary.averageRating} trên 5 sao`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={20}
                fill={i < Math.round(displaySummary.averageRating) ? "#f59e0b" : "none"}
                color="#f59e0b"
              />
            ))}
          </div>
          <span className="text-xs md:text-sm text-muted mb-3">
            Dựa trên <b>{displaySummary.totalReviews}</b> đánh giá xác thực
          </span>
          <div className="inline-flex items-center gap-1.5 font-specs text-[11px] font-bold tracking-wider uppercase text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md">
            <CheckCircle2 size={15} /> 100% người mua đã xác nhận
          </div>
        </div>

        {/* 5-Star Distribution Bars */}
        <div className="flex flex-col justify-center gap-2.5">
          {displaySummary.distribution.map((dist) => (
            <button
              key={dist.star}
              type="button"
              className={`flex items-center gap-3.5 bg-transparent border-none cursor-pointer py-1 px-2 rounded-lg transition-colors text-left hover:bg-slate-50 ${
                filterStar === dist.star ? "bg-slate-100" : ""
              }`}
              onClick={() =>
                setFilterStar(filterStar === dist.star ? "ALL" : dist.star)
              }
              aria-label={`Lọc ${dist.star} sao, ${dist.count} đánh giá`}
            >
              <span className="w-12 text-xs md:text-sm font-semibold text-ink">{dist.star} sao</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${dist.percentage}%` }}
                />
              </div>
              <span className="w-8 text-right text-xs text-muted font-semibold">{dist.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6 pb-4 border-b border-[#e0e0e0]">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Bộ lọc đánh giá">
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 font-nav text-xs md:text-sm font-semibold rounded-lg border transition-all cursor-pointer ${
              filterStar === "ALL"
                ? "bg-[#006ce1] text-white border-[#006ce1]"
                : "bg-white text-slate-700 border-[#e0e0e0] hover:border-[#006ce1] hover:text-[#006ce1]"
            }`}
            onClick={() => setFilterStar("ALL")}
          >
            Tất cả ({displaySummary.totalReviews})
          </button>
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 font-nav text-xs md:text-sm font-semibold rounded-lg border transition-all cursor-pointer ${
                filterStar === s
                  ? "bg-[#006ce1] text-white border-[#006ce1]"
                  : "bg-white text-slate-700 border-[#e0e0e0] hover:border-[#006ce1] hover:text-[#006ce1]"
              }`}
              onClick={() => setFilterStar(s)}
            >
              {s} sao
            </button>
          ))}
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 font-nav text-xs md:text-sm font-semibold rounded-lg border transition-all cursor-pointer ${
              filterStar === "WITH_MEDIA"
                ? "bg-[#006ce1] text-white border-[#006ce1]"
                : "bg-white text-slate-700 border-[#e0e0e0] hover:border-[#006ce1] hover:text-[#006ce1]"
            }`}
            onClick={() => setFilterStar("WITH_MEDIA")}
          >
            <Camera size={14} /> Có hình ảnh
          </button>
        </div>

        <div className="flex items-center gap-2 text-muted text-xs md:text-sm">
          <SlidersHorizontal size={14} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "helpful" | "rating")}
            aria-label="Sắp xếp đánh giá"
            className="p-2 px-3 border border-[#e0e0e0] rounded-lg bg-white text-xs md:text-sm text-ink outline-none"
          >
            <option value="newest">Mới nhất</option>
            <option value="helpful">Hữu ích nhất</option>
            <option value="rating">Đánh giá cao nhất</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#e0e0e0] rounded-2xl">
            <Loader2 size={32} className="animate-spin text-[#006ce1] mb-3" />
            <p className="text-sm text-muted">Đang tải đánh giá sản phẩm từ máy chủ...</p>
          </div>
        ) : displayReviews.length > 0 ? (
          displayReviews.map((rev) => {
            const isApi = "reviewId" in rev;
            const revId = isApi ? rev.reviewId : rev.id;
            const authorName = isApi ? rev.author.fullName : rev.userName;
            const isLiked = isApi ? rev.likedByCurrentUser : Boolean((rev as ProductReview).isLiked);
            const likeCount = isApi ? rev.likeCount : (rev as ProductReview).likesCount;
            const isVerified = isApi ? rev.verifiedPurchase : (rev as ProductReview).verifiedBuyer;
            const mediaItems = isApi
              ? (rev.media || []).map((m) => ({
                  url: m.contentUrl || mediaContentUrl(m.mediaId),
                  isVideo: m.mediaType === "video" || m.mimeType?.startsWith("video/"),
                  id: m.mediaId,
                }))
              : ((rev as ProductReview).images || []).map((imgUrl, i) => ({
                  url: imgUrl,
                  isVideo: false,
                  id: String(i),
                }));

            return (
              <article key={String(revId)} className="bg-white border border-[#e0e0e0] rounded-2xl p-6 md:p-7 hover:border-slate-300 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-3.5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-ink grid place-items-center font-bold text-base shrink-0">
                      {(authorName || "K").slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <strong className="text-sm md:text-base text-ink">{authorName}</strong>
                        {isVerified && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={13} /> Đã mua tại PC Store
                          </span>
                        )}
                      </div>
                      <small className="block text-xs text-muted mt-0.5">
                        {isApi ? "Đánh giá xác thực từ người mua" : `Đánh giá ngày ${formatReviewDate((rev as ProductReview).createdAt)}`}
                      </small>
                    </div>
                  </div>

                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={15}
                        fill={i < rev.rating ? "#f59e0b" : "none"}
                        color="#f59e0b"
                      />
                    ))}
                  </div>
                </div>

                <p className="text-xs md:text-sm leading-relaxed text-slate-700 mb-4">{rev.content}</p>

                {/* Media attachments (Images & Videos) */}
                {mediaItems.length > 0 && (
                  <div className="flex gap-3 mb-4 flex-wrap items-center">
                    {mediaItems.map((item, idx) =>
                      item.isVideo ? (
                        <div key={item.id || idx} className="relative w-44 h-28 rounded-xl overflow-hidden border border-[#e0e0e0] bg-black shadow-sm">
                          <video
                            src={item.url}
                            controls
                            preload="metadata"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <button
                          key={item.id || idx}
                          type="button"
                          className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border border-[#e0e0e0] p-0 bg-transparent cursor-pointer transition-transform hover:scale-105 shadow-sm"
                          onClick={() => setSelectedPhoto(item.url)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.url}
                            alt={`Ảnh thực tế từ ${authorName} - ${idx + 1}`}
                            className="w-full h-full object-cover block"
                            loading="lazy"
                          />
                        </button>
                      )
                    )}
                  </div>
                )}

                <div className="flex items-center gap-4 pt-3 border-t border-slate-50">
                  <button
                    type="button"
                    disabled={likingId === (typeof revId === "number" ? revId : Number(revId))}
                    className={`inline-flex items-center gap-1.5 border border-[#e0e0e0] rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 ${
                      isLiked ? "border-[#006ce1] text-[#006ce1] bg-blue-50" : ""
                    }`}
                    onClick={() => void handleToggleLike(rev)}
                    aria-label={`Đánh giá này hữu ích, hiện có ${likeCount} lượt thích`}
                  >
                    <ThumbsUp size={14} />
                    <span>Hữu ích</span>
                    {likeCount > 0 && <b>({likeCount})</b>}
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="text-center py-12 px-6 bg-white border border-[#e0e0e0] rounded-2xl">
            <p className="text-sm text-muted mb-4">Chưa có đánh giá nào khớp với bộ lọc đã chọn.</p>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-ink border border-[#e0e0e0] hover:border-slate-400 bg-white transition-colors cursor-pointer"
              onClick={() => setFilterStar("ALL")}
            >
              Xem tất cả đánh giá
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Modal for Photo */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-50 grid place-items-center p-6" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-[900px] max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute top-4 right-4 bg-slate-900/70 border-none rounded-full w-10 h-10 text-white cursor-pointer grid place-items-center hover:bg-slate-900 transition-colors"
              onClick={() => setSelectedPhoto(null)}
              aria-label="Đóng ảnh"
            >
              <X size={24} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedPhoto} alt="Ảnh thực tế phóng to" className="max-w-full max-h-[85vh] object-contain block" />
          </div>
        </div>
      )}
    </section>
  );
}

export function WriteReviewModal({
  orderItemId,
  productId,
  productSlug,
  productName,
  orderId,
  isOpen,
  onClose,
  onSuccess,
}: {
  orderItemId?: number;
  productId?: number;
  productSlug: string;
  productName: string;
  orderId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState("");
  const [uploadedMedia, setUploadedMedia] = useState<
    Array<{ mediaId: string; previewUrl: string; type: "IMAGE" | "VIDEO"; name: string }>
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = ""; // Reset so re-selecting same file fires onChange

    const hasExistingVideo = uploadedMedia.some((m) => m.type === "VIDEO");

    if (uploadedMedia.length + files.length > 6) {
      toast("Đánh giá chỉ được đính kèm tối đa 6 file media (ảnh hoặc video).", "error");
      return;
    }

    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo =
        file.type.startsWith("video/") ||
        file.name.toLowerCase().endsWith(".mp4") ||
        file.name.toLowerCase().endsWith(".mov");

      if (isVideo) {
        if (hasExistingVideo || uploadedMedia.some((m) => m.type === "VIDEO")) {
          toast("Chỉ được đính kèm tối đa 1 video ngắn cho mỗi bài đánh giá.", "error");
          continue;
        }
        if (file.size > MAX_VIDEO_SIZE_BYTES) {
          toast(`Video "${file.name}" vượt quá dung lượng tối đa 20 MB.`, "error");
          continue;
        }
      } else {
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          toast(`Ảnh "${file.name}" vượt quá dung lượng tối đa 8 MB.`, "error");
          continue;
        }
      }

      setUploadMessage(`Đang tải lên "${file.name}" (${i + 1}/${files.length})...`);

      try {
        if (isVideo) {
          const res = await mediaApi.uploadVideo(file);
          const previewUrl = URL.createObjectURL(file);
          setUploadedMedia((prev) => [
            ...prev,
            { mediaId: res.mediaId, previewUrl, type: "VIDEO", name: file.name },
          ]);
          successCount++;
        } else {
          const res = await mediaApi.uploadImage(file, "REVIEW");
          const previewUrl = URL.createObjectURL(file);
          setUploadedMedia((prev) => [
            ...prev,
            { mediaId: res.mediaId, previewUrl, type: "IMAGE", name: file.name },
          ]);
          successCount++;
        }
      } catch (err) {
        if (err instanceof MediaApiError) {
          if (err.status === 502 || err.code === "MEDIA_STORAGE_UNAVAILABLE") {
            toast(
              "Máy chủ lưu trữ Cloudinary chưa sẵn sàng. Bạn vẫn có thể gửi đánh giá không kèm media.",
              "error"
            );
          } else {
            toast(err.message, "error");
          }
        } else {
          toast(err instanceof Error ? err.message : `Tải lên ${file.name} thất bại.`, "error");
        }
      }
    }

    setIsUploading(false);
    setUploadMessage("");
    if (successCount > 0) {
      toast(`Đã tải lên ${successCount} tệp đính kèm thành công!`, "success");
    }
  };

  const handleRemoveMedia = (index: number) => {
    setUploadedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanContent = content.trim();
    if (cleanContent.length < 10) {
      toast("Vui lòng nhập nhận xét ít nhất 10 ký tự.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (orderItemId && productId) {
        const mediaIds = uploadedMedia.map((m) => m.mediaId);
        await reviewApi.create({
          orderItemId,
          productId,
          rating,
          content: cleanContent,
          mediaIds,
        });
      }

      toast("Cảm ơn bạn! Đánh giá sản phẩm đã được đăng thành công.", "success");
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err instanceof ReviewApiError) {
        if (err.code === "ORDER_ITEM_ALREADY_REVIEWED" || err.status === 409) {
          toast("Dòng sản phẩm này đã được đánh giá trước đó.", "error");
        } else if (err.code === "ORDER_NOT_DELIVERED") {
          toast("Chỉ có thể đánh giá sản phẩm của đơn hàng đã giao thành công.", "error");
        } else {
          toast(err.message, "error");
        }
      } else {
        toast(err instanceof Error ? err.message : "Không thể gửi đánh giá.", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 grid place-items-center p-5" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-7 md:p-8 max-w-[580px] w-full shadow-2xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-ink m-0">Đánh giá {productName}</h2>
            <p className="text-xs md:text-sm text-muted mt-1 leading-relaxed">
              Chia sẻ cảm nhận thực tế về linh kiện giúp cộng đồng build PC có thêm góc nhìn khách quan
            </p>
          </div>
          <button
            type="button"
            className="text-muted hover:text-ink p-1 rounded-lg bg-transparent border-none cursor-pointer"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Rating Stars Picker */}
          <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <label className="text-xs font-semibold text-muted">Mức độ hài lòng của bạn:</label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    className="bg-transparent border-none cursor-pointer p-1 transition-transform hover:scale-125"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    aria-label={`${star} sao`}
                  >
                    <Star
                      size={28}
                      fill={active ? "#f59e0b" : "none"}
                      color={active ? "#f59e0b" : "#cbd5e1"}
                    />
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-bold text-amber-700">
              {ratingLabels[hoverRating || rating]}
            </span>
          </div>

          {/* Content Textarea */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reviewText" className="text-xs font-semibold text-ink">
              Chia sẻ trải nghiệm thực tế của bạn:
            </label>
            <textarea
              id="reviewText"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Chia sẻ về độ ồn, nhiệt độ, hiệu năng, đóng gói hoặc trải nghiệm dùng thực tế..."
              required
              minLength={10}
              className="w-full p-3 border border-[#e0e0e0] rounded-xl text-sm outline-none resize-y leading-relaxed focus:border-[#006ce1]"
            />
            <small className="text-[11px] text-muted text-right">
              Tối thiểu 10 ký tự ({content.length} ký tự)
            </small>
          </div>

          {/* Media Upload Section */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-ink">
                Đính kèm ảnh / video thực tế (tối đa 6 tệp, 1 video):
              </label>
              <span className="text-[11px] text-muted font-medium">
                {uploadedMedia.length}/6 tệp
              </span>
            </div>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/jpg,video/mp4,video/quicktime"
              className="hidden"
              onChange={(e) => void handleFileSelect(e)}
            />

            {/* Uploaded media previews */}
            <div className="flex gap-3 flex-wrap items-center">
              {uploadedMedia.map((media, idx) => (
                <div
                  key={media.mediaId || idx}
                  className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-sm"
                >
                  {media.type === "VIDEO" ? (
                    <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white p-1">
                      <Film size={20} className="text-blue-400 mb-1" />
                      <span className="text-[9px] font-bold uppercase truncate max-w-full px-1">
                        Video
                      </span>
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={media.previewUrl}
                      alt={media.name || `Xem trước ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(idx)}
                    className="absolute top-1 right-1 bg-slate-900/80 hover:bg-rose-600 text-white border-none rounded-full w-5 h-5 grid place-items-center cursor-pointer transition-colors"
                    aria-label="Xóa tệp"
                    title="Xóa tệp này"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {/* Add file trigger button */}
              {uploadedMedia.length < 6 && (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-1.5 w-20 h-20 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-600 text-[11px] font-semibold hover:border-[#006ce1] hover:text-[#006ce1] hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-50"
                  aria-label="Chọn ảnh hoặc video từ thiết bị"
                >
                  {isUploading ? (
                    <Loader2 size={20} className="animate-spin text-[#006ce1]" />
                  ) : (
                    <Upload size={20} />
                  )}
                  <span>{isUploading ? "Đang tải..." : "Thêm tệp"}</span>
                </button>
              )}
            </div>

            {isUploading && uploadMessage && (
              <p className="text-xs text-blue-600 flex items-center gap-1.5 m-0 animate-pulse">
                <Loader2 size={13} className="animate-spin" /> {uploadMessage}
              </p>
            )}

            <p className="text-[11px] text-muted m-0 leading-relaxed">
              Hỗ trợ ảnh JPEG/PNG (tối đa 8 MB) và video MP4/MOV ngắn (tối đa 20 MB).
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-ink border border-[#e0e0e0] hover:border-slate-400 bg-white transition-colors cursor-pointer"
              onClick={onClose}
              disabled={isSubmitting || isUploading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              disabled={isSubmitting || isUploading || content.trim().length < 10}
            >
              {isSubmitting ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

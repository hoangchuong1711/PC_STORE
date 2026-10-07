"use client";

import { useState, useMemo } from "react";
import {
  Star,
  ThumbsUp,
  Camera,
  CheckCircle2,
  X,
  SlidersHorizontal,
} from "lucide-react";
import {
  ProductReview,
  getReviewSummary,
  getProductReviews,
  formatReviewDate,
  toggleLikeReview,
  addReview,
} from "../lib/reviews";
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
}: {
  productSlug: string;
  productName: string;
}) {
  const [filterStar, setFilterStar] = useState<number | "ALL" | "WITH_MEDIA">("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "helpful" | "rating">("newest");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [reviewsList, setReviewsList] = useState<ProductReview[]>(() =>
    getProductReviews(productSlug),
  );

  const summary = useMemo(() => getReviewSummary(reviewsList), [reviewsList]);

  const handleToggleLike = (id: string) => {
    toggleLikeReview(id);
    setReviewsList([...getProductReviews(productSlug)]);
  };

  const filteredReviews = useMemo(() => {
    return reviewsList
      .filter((r) => {
        if (filterStar === "ALL") return true;
        if (filterStar === "WITH_MEDIA") return (r.images?.length ?? 0) > 0;
        return r.rating === filterStar;
      })
      .sort((a, b) => {
        if (sortBy === "helpful") return b.likesCount - a.likesCount;
        if (sortBy === "rating") return b.rating - a.rating;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [reviewsList, filterStar, sortBy]);

  return (
    <section className="mt-16 pt-12 border-t border-[#e0e0e0]" id="reviews" aria-label="Đánh giá từ khách hàng">
      <div className="mb-8">
        <div>
          <h2 className="font-heading text-2xl md:text-3xl text-ink font-extrabold m-0 tracking-tight">
            Đánh giá từ khách hàng đã mua {productName}
          </h2>
          <p className="font-sans text-sm md:text-base text-muted mt-1.5 mb-0">
            Tổng hợp nhận xét thực tế về hiệu năng, nhiệt độ và độ hoàn thiện
          </p>
        </div>
      </div>

      {/* Scorecard Summary */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 md:gap-10 bg-white border border-[#e0e0e0] rounded-[18px] p-7 md:p-8 mb-8">
        <div className="flex flex-col items-center justify-center text-center md:border-r border-[#e0e0e0] md:pr-8 max-md:pb-6 max-md:border-b">
          <strong className="font-specs text-5xl md:text-6xl font-bold text-ink leading-none tracking-wide mb-2">
            {summary.averageRating.toFixed(1)}
          </strong>
          <div className="flex gap-1 mb-2" aria-label={`Đánh giá ${summary.averageRating} trên 5 sao`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={20}
                fill={i < Math.round(summary.averageRating) ? "#f59e0b" : "none"}
                color="#f59e0b"
              />
            ))}
          </div>
          <span className="text-xs md:text-sm text-muted mb-3">
            Dựa trên <b>{summary.totalReviews}</b> đánh giá xác thực
          </span>
          <div className="inline-flex items-center gap-1.5 font-specs text-[11px] font-bold tracking-wider uppercase text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md">
            <CheckCircle2 size={15} /> 100% người mua đã xác nhận
          </div>
        </div>

        {/* 5-Star Distribution Bars */}
        <div className="flex flex-col justify-center gap-2.5">
          {summary.distribution.map((dist) => (
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
            Tất cả ({reviewsList.length})
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
        {filteredReviews.length > 0 ? (
          filteredReviews.map((rev) => (
            <article key={rev.id} className="bg-white border border-[#e0e0e0] rounded-2xl p-6 md:p-7 hover:border-slate-300 transition-colors">
              <div className="flex items-start justify-between gap-4 mb-3.5">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-ink grid place-items-center font-bold text-base shrink-0">
                    {rev.userName.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <strong className="text-sm md:text-base text-ink">{rev.userName}</strong>
                      {rev.verifiedBuyer && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={13} /> Đã mua tại PC Store
                        </span>
                      )}
                    </div>
                    <small className="block text-xs text-muted mt-0.5">
                      Đánh giá ngày {formatReviewDate(rev.createdAt)}
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

              {/* Photo attachments */}
              {rev.images && rev.images.length > 0 && (
                <div className="flex gap-3 mb-4 flex-wrap">
                  {rev.images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border border-[#e0e0e0] p-0 bg-transparent cursor-pointer transition-transform hover:scale-105 shadow-sm"
                      onClick={() => setSelectedPhoto(imgUrl)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgUrl}
                        alt={`Ảnh thực tế từ ${rev.userName} - ${idx + 1}`}
                        className="w-full h-full object-cover block"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 border border-[#e0e0e0] rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer ${
                    rev.isLiked ? "border-[#006ce1] text-[#006ce1] bg-blue-50" : ""
                  }`}
                  onClick={() => handleToggleLike(rev.id)}
                  aria-label={`Đánh giá này hữu ích, hiện có ${rev.likesCount} lượt thích`}
                >
                  <ThumbsUp size={14} />
                  <span>Hữu ích</span>
                  {rev.likesCount > 0 && <b>({rev.likesCount})</b>}
                </button>
              </div>
            </article>
          ))
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
  productSlug,
  productName,
  orderId,
  isOpen,
  onClose,
  onSuccess,
}: {
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
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleAddSamplePhoto = () => {
    if (images.length >= 3) {
      toast("Bạn có thể tải lên tối đa 3 ảnh cho mỗi bài đánh giá.", "info");
      return;
    }
    const samplePhotos = [
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&auto=format&fit=crop&q=80",
    ];
    const nextPhoto = samplePhotos[images.length % samplePhotos.length];
    setImages([...images, nextPhoto]);
    toast("Đã đính kèm ảnh thực tế sản phẩm!", "success");
  };

  const handleRemovePhoto = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim().length < 10) {
      toast("Vui lòng nhập nhận xét ít nhất 10 ký tự.", "error");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      addReview({
        productSlug,
        orderId,
        userName: "Nguyễn Minh Anh",
        rating,
        content,
        images: images.length > 0 ? images : undefined,
      });

      toast("Cảm ơn bạn! Đánh giá sản phẩm đã được đăng thành công.", "success");
      setIsSubmitting(false);
      onSuccess?.();
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 grid place-items-center p-5" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-7 md:p-8 max-w-[560px] w-full shadow-2xl"
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
          <button type="button" className="text-muted hover:text-ink p-1 rounded-lg bg-transparent border-none cursor-pointer" onClick={onClose} aria-label="Đóng">
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
            <label htmlFor="reviewText" className="text-xs font-semibold text-ink">Chia sẻ trải nghiệm thực tế của bạn:</label>
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

          {/* Photos Upload */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-ink">Đính kèm hình ảnh thực tế (tối đa 3 ảnh):</label>
            <div className="flex gap-3 flex-wrap">
              {images.map((img, idx) => (
                <div key={idx} className="relative w-18 h-18 rounded-xl overflow-hidden border border-[#e0e0e0]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Xem trước ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1 right-1 bg-slate-900/80 text-white border-none rounded-full w-5 h-5 grid place-items-center cursor-pointer"
                    aria-label="Gỡ ảnh"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {images.length < 3 && (
                <button
                  type="button"
                  className="flex flex-col items-center justify-center gap-1 w-18 h-18 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-500 text-[11px] font-semibold hover:border-[#006ce1] hover:text-[#006ce1] hover:bg-blue-50 transition-colors cursor-pointer"
                  onClick={handleAddSamplePhoto}
                >
                  <Camera size={18} />
                  <span>Thêm ảnh</span>
                </button>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-ink border border-[#e0e0e0] hover:border-slate-400 bg-white transition-colors cursor-pointer"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              disabled={isSubmitting || content.trim().length < 10}
            >
              {isSubmitting ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

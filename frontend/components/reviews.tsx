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
import "./reviews.css";

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
    <section className="product-reviews-section" id="reviews" aria-label="Đánh giá từ khách hàng">
      <div className="reviews-section-header">
        <div>
          <h2>Đánh giá từ khách hàng đã mua {productName}</h2>
          <p className="reviews-section-subtitle">
            Tổng hợp nhận xét thực tế về hiệu năng, nhiệt độ và độ hoàn thiện
          </p>
        </div>
      </div>

      {/* Scorecard Summary */}
      <div className="reviews-scorecard">
        <div className="scorecard-main">
          <strong className="scorecard-number">{summary.averageRating.toFixed(1)}</strong>
          <div className="scorecard-stars" aria-label={`Đánh giá ${summary.averageRating} trên 5 sao`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={20}
                fill={i < Math.round(summary.averageRating) ? "#f59e0b" : "none"}
                color="#f59e0b"
              />
            ))}
          </div>
          <span className="scorecard-count">
            Dựa trên <b>{summary.totalReviews}</b> đánh giá xác thực
          </span>
          <div className="scorecard-verified-badge">
            <CheckCircle2 size={15} /> 100% người mua đã xác nhận
          </div>
        </div>

        {/* 5-Star Distribution Bars */}
        <div className="scorecard-distribution">
          {summary.distribution.map((dist) => (
            <button
              key={dist.star}
              type="button"
              className={`distribution-row ${filterStar === dist.star ? "active" : ""}`}
              onClick={() =>
                setFilterStar(filterStar === dist.star ? "ALL" : dist.star)
              }
              aria-label={`Lọc ${dist.star} sao, ${dist.count} đánh giá`}
            >
              <span className="star-level-label">{dist.star} sao</span>
              <div className="distribution-bar-track">
                <div
                  className="distribution-bar-fill"
                  style={{ width: `${dist.percentage}%` }}
                />
              </div>
              <span className="distribution-count">{dist.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="reviews-toolbar">
        <div className="reviews-filter-chips" role="group" aria-label="Bộ lọc đánh giá">
          <button
            type="button"
            className={`review-chip ${filterStar === "ALL" ? "active" : ""}`}
            onClick={() => setFilterStar("ALL")}
          >
            Tất cả ({reviewsList.length})
          </button>
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              type="button"
              className={`review-chip ${filterStar === s ? "active" : ""}`}
              onClick={() => setFilterStar(s)}
            >
              {s} sao
            </button>
          ))}
          <button
            type="button"
            className={`review-chip ${filterStar === "WITH_MEDIA" ? "active" : ""}`}
            onClick={() => setFilterStar("WITH_MEDIA")}
          >
            <Camera size={14} /> Có hình ảnh
          </button>
        </div>

        <div className="reviews-sort">
          <SlidersHorizontal size={14} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "helpful" | "rating")}
            aria-label="Sắp xếp đánh giá"
          >
            <option value="newest">Mới nhất</option>
            <option value="helpful">Hữu ích nhất</option>
            <option value="rating">Đánh giá cao nhất</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="reviews-list">
        {filteredReviews.length > 0 ? (
          filteredReviews.map((rev) => (
            <article key={rev.id} className="review-card">
              <div className="review-header">
                <div className="review-user-info">
                  <div className="review-avatar">
                    {rev.userName.slice(0, 1)}
                  </div>
                  <div>
                    <div className="review-user-name-row">
                      <strong>{rev.userName}</strong>
                      {rev.verifiedBuyer && (
                        <span className="verified-buyer-tag">
                          <CheckCircle2 size={13} /> Đã mua tại PC Store
                        </span>
                      )}
                    </div>
                    <small className="review-date">
                      Đánh giá ngày {formatReviewDate(rev.createdAt)}
                    </small>
                  </div>
                </div>

                <div className="review-rating-stars">
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

              <p className="review-content">{rev.content}</p>

              {/* Photo attachments */}
              {rev.images && rev.images.length > 0 && (
                <div className="review-photos-grid">
                  {rev.images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="review-photo-thumb"
                      onClick={() => setSelectedPhoto(imgUrl)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgUrl}
                        alt={`Ảnh thực tế từ ${rev.userName} - ${idx + 1}`}
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="review-footer">
                <button
                  type="button"
                  className={`review-like-btn ${rev.isLiked ? "liked" : ""}`}
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
          <div className="reviews-empty">
            <p>Chưa có đánh giá nào khớp với bộ lọc đã chọn.</p>
            <button
              type="button"
              className="button button-outline"
              onClick={() => setFilterStar("ALL")}
            >
              Xem tất cả đánh giá
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Modal for Photo */}
      {selectedPhoto && (
        <div className="photo-lightbox-overlay" onClick={() => setSelectedPhoto(null)}>
          <div className="photo-lightbox-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={() => setSelectedPhoto(null)}
              aria-label="Đóng ảnh"
            >
              <X size={24} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedPhoto} alt="Ảnh thực tế phóng to" className="lightbox-image" />
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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content write-review-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="write-review-header">
          <div>
            <h2>Đánh giá {productName}</h2>
            <p className="modal-subtitle">
              Chia sẻ cảm nhận thực tế về linh kiện giúp cộng đồng build PC có thêm góc nhìn khách quan
            </p>
          </div>
          <button type="button" className="picker-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="write-review-form">
          {/* Rating Stars Picker */}
          <div className="star-picker-section">
            <label className="star-picker-label">Mức độ hài lòng của bạn:</label>
            <div className="star-picker-stars">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    className="star-pick-btn"
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
            <span className="star-feedback-text">
              {ratingLabels[hoverRating || rating]}
            </span>
          </div>

          {/* Content Textarea */}
          <div className="review-textarea-group">
            <label htmlFor="reviewText">Chia sẻ trải nghiệm thực tế của bạn:</label>
            <textarea
              id="reviewText"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Chia sẻ về độ ồn, nhiệt độ, hiệu năng, đóng gói hoặc trải nghiệm dùng thực tế..."
              required
              minLength={10}
            />
            <small className="char-count">
              Tối thiểu 10 ký tự ({content.length} ký tự)
            </small>
          </div>

          {/* Photos Upload */}
          <div className="review-photos-upload-group">
            <label>Đính kèm hình ảnh thực tế (tối đa 3 ảnh):</label>
            <div className="photo-previews-list">
              {images.map((img, idx) => (
                <div key={idx} className="photo-preview-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Xem trước ${idx + 1}`} />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="remove-photo-badge"
                    aria-label="Gỡ ảnh"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {images.length < 3 && (
                <button
                  type="button"
                  className="add-photo-btn"
                  onClick={handleAddSamplePhoto}
                >
                  <Camera size={18} />
                  <span>Thêm ảnh</span>
                </button>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="write-review-actions">
            <button
              type="button"
              className="button button-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="button button-primary"
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

"use client";

import { useState, useRef } from "react";
import { Star, X, Loader2, Upload, Film } from "lucide-react";
import { reviewApi, ReviewApiError, type CreateReviewInput } from "../../lib/review-api";
import { mediaApi, MediaApiError, MAX_IMAGE_SIZE_BYTES, MAX_VIDEO_SIZE_BYTES } from "../../lib/media-api";
import { useToast } from "../toast";

const ratingLabels: Record<number, string> = {
  1: "Rất không hài lòng",
  2: "Chưa hài lòng",
  3: "Bình thường",
  4: "Hài lòng",
  5: "Tuyệt vời, rất hài lòng",
};

// Form mở từ nút Viết đánh giá ở /orders/[id]; OrderDetail truyền mã dòng đơn và sản phẩm qua props.
// Đọc theo thứ tự: state của form → hàm upload/gửi → JSX có onChange/onSubmit bên dưới.
export function WriteReviewModal({
  orderItemId,
  productId,
  productName,
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
  // Dữ liệu form: người dùng nhập → onChange gọi set... → React vẽ lại giá trị mới.
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

  // Chọn file → mediaApi → MediaImageUploadServlet/MediaVideoUploadServlet; giữ mediaId để gửi cùng Review.
  async function handleUploadReviewMedia(e: React.ChangeEvent<HTMLInputElement>) {
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
          const uploadResponse = await mediaApi.uploadVideo(file);
          const previewUrl = URL.createObjectURL(file);
          setUploadedMedia((prev) => [
            ...prev,
            { mediaId: uploadResponse.mediaId, previewUrl, type: "VIDEO", name: file.name },
          ]);
          successCount++;
        } else {
          const uploadResponse = await mediaApi.uploadImage(file, "REVIEW");
          const previewUrl = URL.createObjectURL(file);
          setUploadedMedia((prev) => [
            ...prev,
            { mediaId: uploadResponse.mediaId, previewUrl, type: "IMAGE", name: file.name },
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
  }

  // Bỏ file khỏi danh sách sẽ gửi; file TEMP chưa gắn bài sẽ được backend dọn khi hết hạn.
  function handleRemoveReviewMedia(index: number) {
    setUploadedMedia((prev) => prev.filter((_, i) => i !== index));
  }

  // Nút Gửi đánh giá → reviewApi.create → ReviewServlet.doPost; thành công thì báo trang đơn hàng tải lại.
  async function handleSubmitReview(e: React.FormEvent) {
    // 1. Chặn submit HTML mặc định để gửi JSON bằng JavaScript, không tải lại cả trang.
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
        // 2. Tên trường khớp ReviewDto.CreateRequest ở backend; chỉ gửi mã file đã upload.
        const requestBody: CreateReviewInput = {
          orderItemId,
          productId,
          rating,
          content: cleanContent,
          mediaIds,
        };
        // 3. review-api.ts đọc response JSON; nếu HTTP lỗi thì chuyển xuống catch.
        await reviewApi.create(requestBody);
      }

      // 4. View không dùng chi tiết Review trả về; báo trang đơn hàng đánh dấu dòng đã đánh giá.
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
  }

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

        {/* Form Đánh giá sản phẩm → handleSubmitReview; tìm id này trong Inspect để đối chiếu code. */}
        <form id="write-review-form" onSubmit={handleSubmitReview} className="flex flex-col gap-5">
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
              onChange={(e) => void handleUploadReviewMedia(e)}
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
                    onClick={() => handleRemoveReviewMedia(idx)}
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

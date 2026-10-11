"use client";

import { useId, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Image as ImageIcon,
  MessageSquare,
  RotateCcw,
  Search,
  ShieldAlert,
  Star,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  type AdminReview,
  type AdminReviewFilters,
  type AdminReviewStatus,
  initialAdminReviews,
  filterAdminReviews,
} from "@/lib/admin-reviews";
import { reviewApi } from "@/lib/review-api";

const initialFilters: AdminReviewFilters = {
  query: "",
  rating: "ALL",
  status: "ALL",
  hasMedia: "ALL",
};

export function AdminReviews() {
  const [reviews, setReviews] = useState<AdminReview[]>(initialAdminReviews);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AdminReviewFilters>(initialFilters);
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null);
  const [isHideModalOpen, setIsHideModalOpen] = useState(false);
  const [hideReason, setHideReason] = useState("");
  const [hideError, setHideError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      const data = await reviewApi.listAdmin();
      if (data && data.length > 0) {
        setReviews(
          data.map((item) => ({
            id: String(item.reviewId),
            productSlug: `product-${item.productId}`,
            productName: item.productName,
            orderId: String(item.orderId),
            orderItemId: String(item.orderItemId),
            userName: item.userName,
            rating: item.rating,
            createdAt: item.moderatedAt || new Date().toISOString(),
            content: item.content,
            images: item.images || [],
            likesCount: item.likesCount || 0,
            verifiedBuyer: item.verifiedBuyer ?? true,
            status: (item.status === "HIDDEN" ? "HIDDEN" : "PUBLISHED") as AdminReviewStatus,
            moderationReason: item.moderationReason ?? undefined,
            moderatedBy: item.moderatedBy ? `Admin #${item.moderatedBy}` : undefined,
            moderatedAt: item.moderatedAt ?? undefined,
          }))
        );
      } else {
        setReviews(initialAdminReviews);
      }
    } catch {
      setReviews(initialAdminReviews);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const filteredReviews = filterAdminReviews(reviews, filters);

  const stats = {
    total: reviews.length,
    averageRating: (
      reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)
    ).toFixed(1),
    withMedia: reviews.filter((r) => (r.images?.length ?? 0) > 0).length,
    hidden: reviews.filter((r) => r.status === "HIDDEN").length,
  };

  const [isHideModalOpen, setIsHideModalOpen] = useState(false);
  const [hideReason, setHideReason] = useState("");
  const [hideError, setHideError] = useState("");
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreSubmitting, setRestoreSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenHideModal = (review: AdminReview) => {
    setSelectedReview(review);
    setHideReason("");
    setHideError("");
    setIsHideModalOpen(true);
  };

  const handleOpenRestoreModal = (review: AdminReview) => {
    setSelectedReview(review);
    setIsRestoreModalOpen(true);
  };

  const handleConfirmHide = async () => {
    if (!hideReason.trim()) {
      setHideError("Vui lòng nhập lý do ẩn đánh giá để lưu vào nhật ký kiểm duyệt.");
      return;
    }
    if (!selectedReview) return;

    const numId = Number(selectedReview.id.replace(/^rev-?/i, ""));
    if (numId > 0) {
      try {
        await reviewApi.moderate(numId, {
          status: "HIDDEN",
          moderationReason: hideReason.trim(),
        });
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Không thể đồng bộ trạng thái ẩn lên máy chủ.");
      }
    }

    const now = new Date().toISOString();
    const updated = reviews.map((r) =>
      r.id === selectedReview.id
        ? {
            ...r,
            status: "HIDDEN" as const,
            moderationReason: hideReason.trim(),
            moderatedBy: "Quản trị viên",
            moderatedAt: now,
          }
        : r,
    );

    setReviews(updated);
    setSelectedReview(updated.find((r) => r.id === selectedReview.id) || null);
    setIsHideModalOpen(false);
    showToast(`Đã ẩn đánh giá của "${selectedReview.userName}" thành công.`);
  };

  const handleConfirmRestore = async () => {
    if (!selectedReview) return;
    setRestoreSubmitting(true);
    const numId = Number(selectedReview.id.replace(/^rev-?/i, ""));
    if (numId > 0) {
      try {
        await reviewApi.moderate(numId, { status: "PUBLISHED" });
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Không thể đồng bộ trạng thái khôi phục lên máy chủ.");
      }
    }

    const updated = reviews.map((r) =>
      r.id === selectedReview.id
        ? {
            ...r,
            status: "PUBLISHED" as const,
            moderationReason: undefined,
            moderatedBy: undefined,
            moderatedAt: undefined,
          }
        : r,
    );

    setReviews(updated);
    setSelectedReview(updated.find((r) => r.id === selectedReview.id) || null);
    setIsRestoreModalOpen(false);
    setRestoreSubmitting(false);
    showToast(`Đã khôi phục hiển thị đánh giá của "${selectedReview.userName}".`);
  };

  return (
    <div className="max-w-[1250px] mx-auto font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <aside aria-label="Thông báo thao tác" aria-live="polite" className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </aside>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-7">
        <div>
          <span className="block text-[10px] font-bold text-admin-soft tracking-wider uppercase">KIỂM DUYỆT NỘI DUNG</span>
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-admin-ink tracking-tight mt-1 mb-1.5 leading-tight">Kiểm duyệt đánh giá sản phẩm</h1>
          <p className="text-sm text-admin-muted max-w-[570px] m-0">Rà soát trải nghiệm mua hàng, hình ảnh thực tế và ẩn các nhận xét vi phạm tiêu chuẩn.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadReviews()}
          disabled={loading}
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-admin-line bg-white text-xs font-semibold text-admin-ink hover:bg-admin-bg transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      {/* Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5" aria-label="Chỉ số đánh giá">
        <article className="flex items-center gap-3.5 min-h-[86px] p-4 rounded-xl border border-admin-line bg-admin-surface shadow-xs">
          <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-lg bg-admin-blue-soft text-admin-blue">
            <MessageSquare size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-admin-muted">Tổng nhận xét</span>
            <strong className="block text-xl sm:text-2xl font-extrabold text-admin-ink tracking-tight my-0.5 font-mono">{stats.total}</strong>
            <small className="block text-[10px] text-admin-soft">Bài gửi từ khách</small>
          </div>
        </article>

        <article className="flex items-center gap-3.5 min-h-[86px] p-4 rounded-xl border border-admin-line bg-admin-surface shadow-xs">
          <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-lg bg-admin-amber-soft text-admin-amber">
            <Star size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-admin-muted">Điểm trung bình</span>
            <strong className="block text-xl sm:text-2xl font-extrabold text-admin-ink tracking-tight my-0.5 font-mono">{stats.averageRating} ★</strong>
            <small className="block text-[10px] text-admin-soft">Thang điểm 5 sao</small>
          </div>
        </article>

        <article className="flex items-center gap-3.5 min-h-[86px] p-4 rounded-xl border border-admin-line bg-admin-surface shadow-xs">
          <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-lg bg-admin-green-soft text-admin-green">
            <ImageIcon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-admin-muted">Ảnh thực tế</span>
            <strong className="block text-xl sm:text-2xl font-extrabold text-admin-ink tracking-tight my-0.5 font-mono">{stats.withMedia}</strong>
            <small className="block text-[10px] text-admin-soft">Có ảnh đính kèm</small>
          </div>
        </article>

        <article className="flex items-center gap-3.5 min-h-[86px] p-4 rounded-xl border border-admin-line bg-admin-surface shadow-xs">
          <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-lg bg-admin-red-soft text-admin-red">
            <ShieldAlert size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-admin-muted">Đã ẩn duyệt</span>
            <strong className={`block text-xl sm:text-2xl font-extrabold tracking-tight my-0.5 font-mono ${stats.hidden > 0 ? "text-admin-red" : "text-admin-ink"}`}>
              {stats.hidden}
            </strong>
            <small className="block text-[10px] text-admin-soft">Vi phạm tiêu chuẩn</small>
          </div>
        </article>
      </section>

      {/* Main Panel */}
      <section className="rounded-xl border border-admin-line bg-admin-surface overflow-hidden">
        {/* Toolbar */}
        <div className="p-3.5 border-b border-admin-line bg-white flex flex-wrap items-center gap-3">
          <label className="relative flex items-center flex-1 min-w-[220px] max-w-sm">
            <Search size={16} className="absolute left-3 text-admin-soft pointer-events-none" />
            <span className="sr-only">Tìm đánh giá</span>
            <input
              type="search"
              placeholder="Tìm theo sản phẩm, người dùng hoặc nội dung..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink placeholder:text-admin-soft focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue transition-colors"
            />
          </label>

          <select
            aria-label="Lọc theo số sao"
            value={filters.rating}
            onChange={(e) =>
              setFilters({
                ...filters,
                rating: e.target.value === "ALL" ? "ALL" : (Number(e.target.value) as 1 | 2 | 3 | 4 | 5),
              })
            }
            className="h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue cursor-pointer"
          >
            <option value="ALL">Tất cả số sao</option>
            <option value="5">5 sao</option>
            <option value="4">4 sao</option>
            <option value="3">3 sao</option>
            <option value="2">2 sao</option>
            <option value="1">1 sao</option>
          </select>

          <select
            aria-label="Lọc theo trạng thái"
            value={filters.status}
            onChange={(e) =>
              setFilters({
                ...filters,
                status: e.target.value as AdminReviewFilters["status"],
              })
            }
            className="h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PUBLISHED">Đang hiển thị</option>
            <option value="HIDDEN">Đã ẩn</option>
          </select>

          <select
            aria-label="Lọc theo hình ảnh"
            value={filters.hasMedia}
            onChange={(e) =>
              setFilters({
                ...filters,
                hasMedia: e.target.value as AdminReviewFilters["hasMedia"],
              })
            }
            className="h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue cursor-pointer"
          >
            <option value="ALL">Tất cả bài viết</option>
            <option value="YES">Có hình ảnh</option>
            <option value="NO">Không có hình ảnh</option>
          </select>

          {(filters.query || filters.rating !== "ALL" || filters.status !== "ALL" || filters.hasMedia !== "ALL") && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-admin-line bg-white text-xs font-semibold text-admin-muted hover:bg-admin-bg hover:text-admin-ink transition-colors cursor-pointer"
              onClick={() => setFilters(initialFilters)}
            >
              <RotateCcw size={15} />
              Đặt lại
            </button>
          )}
        </div>

        {/* Reviews Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30 w-48">Sản phẩm</th>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30 w-40">Người đánh giá</th>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30 w-28">Đánh giá</th>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">Nội dung nhận xét</th>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30 w-24">Hình ảnh</th>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30 w-28">Trạng thái</th>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30 w-28">Ngày gửi</th>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30 w-32 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-admin-muted">
                    <Loader2 size={24} className="animate-spin text-admin-blue mx-auto mb-2" />
                    Đang đồng bộ đánh giá thực tế từ máy chủ...
                  </td>
                </tr>
              ) : filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-admin-soft">
                    Không có đánh giá nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review) => (
                  <tr key={review.id} className="hover:bg-admin-bg/40 transition-colors">
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                      <strong className="block text-xs font-bold text-admin-ink">{review.productName}</strong>
                      <small className="block text-[10px] text-admin-soft mt-0.5">{review.productSlug}</small>
                    </td>
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                      <strong className="block text-xs font-bold text-admin-ink">{review.userName}</strong>
                      {review.verifiedBuyer ? (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-admin-blue-soft text-admin-blue">
                          Đã mua hàng
                        </span>
                      ) : (
                        <small className="block text-[10px] text-admin-soft">Chưa xác thực</small>
                      )}
                    </td>
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            fill={i < review.rating ? "#e5a100" : "#e2e8f0"}
                            color={i < review.rating ? "#e5a100" : "#cbd5e1"}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                      <p className="m-0 text-xs leading-normal max-w-xs truncate text-admin-ink">
                        {review.content}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                      {review.images && review.images.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-admin-bg text-admin-muted border border-admin-line">
                          <ImageIcon size={11} /> {review.images.length}
                        </span>
                      ) : (
                        <span className="text-xs text-admin-soft">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                      {review.status === "PUBLISHED" ? (
                        <span className="inline-flex items-center min-h-[22px] px-2 rounded text-[10px] font-bold bg-admin-green-soft text-admin-green whitespace-nowrap">
                          Hiển thị
                        </span>
                      ) : (
                        <span className="inline-flex items-center min-h-[22px] px-2 rounded text-[10px] font-bold bg-admin-red-soft text-admin-red whitespace-nowrap">
                          Đã ẩn
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle text-xs text-admin-muted whitespace-nowrap">
                      {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-admin-blue hover:bg-admin-blue-soft transition-colors cursor-pointer"
                          onClick={() => setSelectedReview(review)}
                          title="Xem chi tiết"
                        >
                          <Eye size={13} /> Xem
                        </button>
                        {review.status === "PUBLISHED" ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-admin-red hover:bg-admin-red-soft transition-colors cursor-pointer"
                            onClick={() => handleOpenHideModal(review)}
                            title="Ẩn bài đánh giá"
                          >
                            <ShieldAlert size={13} /> Ẩn
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-admin-green hover:bg-admin-green-soft transition-colors cursor-pointer"
                            onClick={() => handleOpenRestoreModal(review)}
                            title="Khôi phục hiển thị"
                          >
                            <RotateCcw size={13} /> Hiện
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detail Drawer */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="fixed inset-0 bg-black/40 backdrop-blur-xs border-0 cursor-pointer"
            aria-label="Đóng chi tiết"
            onClick={() => setSelectedReview(null)}
          />
          <aside
            aria-label="Chi tiết đánh giá"
            className="relative z-10 w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-admin-line">
              <div>
                <span className="block text-[10px] font-bold text-admin-soft tracking-wider uppercase">Đánh giá #{selectedReview.id}</span>
                <h2 className="text-base font-bold text-admin-ink mt-0.5">Chi tiết nhận xét</h2>
              </div>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg border border-transparent text-admin-muted hover:border-admin-line hover:bg-admin-bg hover:text-admin-ink cursor-pointer"
                aria-label="Đóng"
                onClick={() => setSelectedReview(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
              {/* Product Info */}
              <div className="p-3 bg-admin-bg rounded-lg border border-admin-line">
                <div className="text-[10px] text-admin-soft uppercase font-bold">Sản phẩm được đánh giá</div>
                <div className="text-sm font-bold text-admin-ink mt-0.5">{selectedReview.productName}</div>
                <div className="text-[11px] text-admin-muted">Slug: {selectedReview.productSlug}</div>
              </div>

              {/* Reviewer Info */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-bold text-admin-ink">{selectedReview.userName}</strong>
                    {selectedReview.verifiedBuyer && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-admin-blue-soft text-admin-blue">
                        Đã mua
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-admin-soft">
                    {new Date(selectedReview.createdAt).toLocaleString("vi-VN")}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      fill={i < selectedReview.rating ? "#e5a100" : "#e2e8f0"}
                      color={i < selectedReview.rating ? "#e5a100" : "#cbd5e1"}
                    />
                  ))}
                  <span className="text-xs font-bold ml-1.5 text-admin-muted">
                    {selectedReview.rating} / 5 sao
                  </span>
                </div>
              </div>

              {/* Content */}
              <div>
                <div className="text-[11px] text-admin-soft mb-1 font-semibold uppercase">Nội dung nhận xét:</div>
                <div className="p-3 bg-white border border-admin-line rounded-lg text-xs leading-relaxed text-admin-ink">
                  {selectedReview.content}
                </div>
              </div>

              {/* Photos Gallery */}
              {selectedReview.images && selectedReview.images.length > 0 && (
                <div>
                  <div className="text-[11px] text-admin-soft mb-1.5 font-semibold uppercase">
                    Hình ảnh đính kèm ({selectedReview.images.length}):
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedReview.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="aspect-square relative rounded-md overflow-hidden border border-admin-line bg-slate-100"
                      >
                        <Image
                          src={img}
                          alt={`Review photo ${idx + 1}`}
                          fill
                          unoptimized
                          sizes="150px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Moderation Status Banner */}
              {selectedReview.status === "HIDDEN" && (
                <div className="p-3 bg-admin-red-soft border border-rose-200 rounded-lg">
                  <div className="flex gap-1.5 items-center text-admin-red font-bold text-xs">
                    <AlertTriangle size={14} /> Đánh giá đã bị ẩn kiểm duyệt
                  </div>
                  <div className="text-xs text-rose-950 mt-1">
                    <strong>Lý do:</strong> {selectedReview.moderationReason || "Không xác định"}
                  </div>
                  {selectedReview.moderatedBy && (
                    <div className="text-[10px] text-admin-red mt-1">
                      Người kiểm duyệt: {selectedReview.moderatedBy} • {new Date(selectedReview.moderatedAt || "").toLocaleString("vi-VN")}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 p-4 border-t border-admin-line mt-auto bg-admin-bg/20">
              <button
                type="button"
                className="inline-flex items-center justify-center min-h-[38px] px-4 rounded-lg text-xs font-bold border border-admin-line bg-white hover:border-[#bbc3cc] hover:bg-admin-bg text-admin-ink transition-colors cursor-pointer"
                onClick={() => setSelectedReview(null)}
              >
                Đóng
              </button>
              {selectedReview.status === "PUBLISHED" ? (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-4 rounded-lg text-xs font-bold border border-rose-200 bg-admin-red-soft hover:bg-rose-100 text-admin-red transition-colors cursor-pointer"
                  onClick={() => handleOpenHideModal(selectedReview)}
                >
                  <ShieldAlert size={15} /> Ẩn đánh giá này
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-4 rounded-lg text-xs font-bold bg-admin-accent-dark hover:bg-[#1e252c] text-white transition-colors cursor-pointer"
                  onClick={() => handleOpenRestoreModal(selectedReview)}
                >
                  <RotateCcw size={15} /> Khôi phục hiển thị
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Hide Modal with Reason Dialog */}
      {isHideModalOpen && selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="hide-modal-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-admin-line flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-admin-red-soft text-admin-red">
                <ShieldAlert size={18} />
              </div>
              <div>
                <h3 id="hide-modal-title" className="text-base font-bold text-admin-ink">Xác nhận ẩn đánh giá</h3>
                <p className="text-xs text-admin-muted mt-0.5">Khách hàng: <strong className="text-admin-ink">{selectedReview.userName}</strong> ({selectedReview.productName})</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs text-admin-muted leading-relaxed m-0">
                Đánh giá này sẽ bị ẩn khỏi trang bán lẻ và không hiển thị cho người mua khác. Vui lòng ghi rõ lý do kiểm duyệt:
              </p>

              <label className="flex flex-col gap-1.5 text-xs font-semibold text-admin-ink">
                <span>Lý do ẩn đánh giá <span className="text-admin-red">*</span></span>
                <textarea
                  rows={3}
                  placeholder="Ví dụ: Sử dụng từ ngữ thô tục, quảng cáo bên ngoài, sai thông tin sản phẩm..."
                  value={hideReason}
                  onChange={(e) => {
                    setHideReason(e.target.value);
                    if (hideError) setHideError("");
                  }}
                  autoFocus
                  className="w-full rounded-lg border border-admin-line p-2.5 text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue resize-none"
                />
                {hideError && (
                  <small className="text-admin-red text-[11px] mt-0.5">{hideError}</small>
                )}
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-admin-line">
              <button
                type="button"
                className="inline-flex items-center justify-center min-h-[38px] px-3.5 rounded-lg text-xs font-bold border border-admin-line bg-white hover:bg-admin-bg text-admin-ink transition-colors cursor-pointer"
                onClick={() => setIsHideModalOpen(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center min-h-[38px] px-3.5 rounded-lg text-xs font-bold border border-rose-200 bg-admin-red-soft hover:bg-rose-100 text-admin-red transition-colors cursor-pointer"
                onClick={handleConfirmHide}
              >
                Xác nhận ẩn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Modal Dialog */}
      {isRestoreModalOpen && selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="restore-modal-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-admin-line flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-admin-green-soft text-admin-green">
                <RotateCcw size={18} />
              </div>
              <div>
                <h3 id="restore-modal-title" className="text-base font-bold text-admin-ink">Xác nhận khôi phục đánh giá</h3>
                <p className="text-xs text-admin-muted mt-0.5">Khách hàng: <strong className="text-admin-ink">{selectedReview.userName}</strong> ({selectedReview.productName})</p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Nội dung đánh giá: </span>
                <span className="text-admin-ink italic">"{selectedReview.content}"</span>
              </div>
              {selectedReview.moderationReason && (
                <div>
                  <span className="text-rose-600 font-medium">Lý do đã ẩn trước đó: </span>
                  <span className="text-slate-700">{selectedReview.moderationReason}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-admin-muted leading-relaxed m-0">
              Đánh giá này sẽ được chuyển về trạng thái <strong>Hiển thị công khai</strong> và xuất hiện trở lại trên trang chi tiết sản phẩm cho khách hàng.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-admin-line">
              <button
                type="button"
                className="inline-flex items-center justify-center min-h-[38px] px-3.5 rounded-lg text-xs font-bold border border-admin-line bg-white hover:bg-admin-bg text-admin-ink transition-colors cursor-pointer"
                onClick={() => setIsRestoreModalOpen(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={restoreSubmitting}
                className="inline-flex items-center justify-center min-h-[38px] px-3.5 rounded-lg text-xs font-bold bg-admin-green hover:bg-[#16a34a] text-white transition-colors cursor-pointer disabled:opacity-50"
                onClick={handleConfirmRestore}
              >
                {restoreSubmitting ? "Đang xử lý..." : "Xác nhận khôi phục"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

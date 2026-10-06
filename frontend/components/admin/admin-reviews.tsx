"use client";

import { useId, useState } from "react";
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
} from "lucide-react";
import {
  type AdminReview,
  type AdminReviewFilters,
  initialAdminReviews,
  filterAdminReviews,
} from "@/lib/admin-reviews";
import "./admin.css";

const initialFilters: AdminReviewFilters = {
  query: "",
  rating: "ALL",
  status: "ALL",
  hasMedia: "ALL",
};

export function AdminReviews() {
  const [reviews, setReviews] = useState<AdminReview[]>(initialAdminReviews);
  const [filters, setFilters] = useState<AdminReviewFilters>(initialFilters);
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null);
  const [isHideModalOpen, setIsHideModalOpen] = useState(false);
  const [hideReason, setHideReason] = useState("");
  const [hideError, setHideError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredReviews = filterAdminReviews(reviews, filters);

  const stats = {
    total: reviews.length,
    averageRating: (
      reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)
    ).toFixed(1),
    withMedia: reviews.filter((r) => (r.images?.length ?? 0) > 0).length,
    hidden: reviews.filter((r) => r.status === "HIDDEN").length,
  };

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

  const handleConfirmHide = () => {
    if (!hideReason.trim()) {
      setHideError("Vui lòng nhập lý do ẩn đánh giá để lưu vào nhật ký kiểm duyệt.");
      return;
    }
    if (!selectedReview) return;

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

  const handleRestoreReview = (review: AdminReview) => {
    const updated = reviews.map((r) =>
      r.id === review.id
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
    setSelectedReview(updated.find((r) => r.id === review.id) || null);
    showToast(`Đã khôi phục hiển thị đánh giá của "${review.userName}".`);
  };

  return (
    <div className="admin-page">
      {/* Toast Alert */}
      {toastMessage && (
        <aside aria-label="Thông báo thao tác" aria-live="polite" className="admin-toast">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </aside>
      )}

      {/* Header */}
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">KIỂM DUYỆT NỘI DUNG</span>
          <h1>Kiểm duyệt đánh giá sản phẩm</h1>
          <p>Rà soát trải nghiệm mua hàng, hình ảnh thực tế và ẩn các nhận xét vi phạm tiêu chuẩn.</p>
        </div>
      </div>

      {/* Metric Cards */}
      <section className="admin-stat-grid" aria-label="Chỉ số đánh giá">
        <article className="admin-stat-card">
          <div className="admin-stat-icon is-blue">
            <MessageSquare size={18} />
          </div>
          <div className="admin-stat-copy">
            <span>Tổng nhận xét</span>
            <strong>{stats.total}</strong>
            <small>Bài gửi từ khách</small>
          </div>
        </article>

        <article className="admin-stat-card">
          <div className="admin-stat-icon is-amber">
            <Star size={18} />
          </div>
          <div className="admin-stat-copy">
            <span>Điểm trung bình</span>
            <strong>{stats.averageRating} ★</strong>
            <small>Thang điểm 5 sao</small>
          </div>
        </article>

        <article className="admin-stat-card">
          <div className="admin-stat-icon is-green">
            <ImageIcon size={18} />
          </div>
          <div className="admin-stat-copy">
            <span>Ảnh thực tế</span>
            <strong>{stats.withMedia}</strong>
            <small>Có ảnh đính kèm</small>
          </div>
        </article>

        <article className="admin-stat-card">
          <div className="admin-stat-icon is-red">
            <ShieldAlert size={18} />
          </div>
          <div className="admin-stat-copy">
            <span>Đã ẩn duyệt</span>
            <strong style={{ color: stats.hidden > 0 ? "var(--admin-red)" : "inherit" }}>
              {stats.hidden}
            </strong>
            <small>Vi phạm tiêu chuẩn</small>
          </div>
        </article>
      </section>

      {/* Main Panel */}
      <section className="admin-panel admin-list-panel">
        {/* Toolbar */}
        <div className="admin-list-toolbar admin-toolbar-wrap">
          <label className="admin-search-field">
            <Search size={16} />
            <span className="sr-only">Tìm đánh giá</span>
            <input
              type="search"
              placeholder="Tìm theo sản phẩm, người dùng hoặc nội dung..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
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
          >
            <option value="ALL">Tất cả bài viết</option>
            <option value="YES">Có hình ảnh</option>
            <option value="NO">Không có hình ảnh</option>
          </select>

          {(filters.query || filters.rating !== "ALL" || filters.status !== "ALL" || filters.hasMedia !== "ALL") && (
            <button
              type="button"
              className="admin-filter-reset"
              onClick={() => setFilters(initialFilters)}
            >
              <RotateCcw size={15} />
              Đặt lại
            </button>
          )}
        </div>

        {/* Reviews Table */}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 190 }}>Sản phẩm</th>
                <th style={{ width: 160 }}>Người đánh giá</th>
                <th style={{ width: 110 }}>Đánh giá</th>
                <th>Nội dung nhận xét</th>
                <th style={{ width: 90 }}>Hình ảnh</th>
                <th style={{ width: 110 }}>Trạng thái</th>
                <th style={{ width: 100 }}>Ngày gửi</th>
                <th style={{ width: 130 }} className="align-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px 16px", color: "var(--admin-soft)" }}>
                    Không có đánh giá nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review) => (
                  <tr key={review.id}>
                    <td>
                      <strong className="admin-table-primary">{review.productName}</strong>
                      <small className="admin-table-secondary">{review.productSlug}</small>
                    </td>
                    <td>
                      <strong className="admin-table-primary">{review.userName}</strong>
                      {review.verifiedBuyer ? (
                        <span className="admin-status-pill is-info" style={{ minHeight: 20, fontSize: 9 }}>
                          Đã mua hàng
                        </span>
                      ) : (
                        <small className="admin-table-secondary">Chưa xác thực</small>
                      )}
                    </td>
                    <td>
                      <div className="admin-review-stars">
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
                    <td>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          lineHeight: 1.45,
                          maxWidth: 340,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: "var(--admin-ink)",
                        }}
                      >
                        {review.content}
                      </p>
                    </td>
                    <td>
                      {review.images && review.images.length > 0 ? (
                        <span className="admin-code-slug" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                          <ImageIcon size={11} /> {review.images.length}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--admin-soft)" }}>—</span>
                      )}
                    </td>
                    <td>
                      {review.status === "PUBLISHED" ? (
                        <span className="admin-status-pill is-success">Hiển thị</span>
                      ) : (
                        <span className="admin-status-pill is-danger">Đã ẩn</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--admin-muted)" }}>
                        {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    </td>
                    <td className="align-right">
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          className="admin-table-action"
                          onClick={() => setSelectedReview(review)}
                          title="Xem chi tiết"
                        >
                          <Eye size={13} /> Xem
                        </button>
                        {review.status === "PUBLISHED" ? (
                          <button
                            type="button"
                            className="admin-table-action"
                            style={{ color: "var(--admin-red)" }}
                            onClick={() => handleOpenHideModal(review)}
                            title="Ẩn bài đánh giá"
                          >
                            <ShieldAlert size={13} /> Ẩn
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-table-action"
                            style={{ color: "var(--admin-green)" }}
                            onClick={() => handleRestoreReview(review)}
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
        <div className="admin-drawer-layer">
          <button
            type="button"
            className="admin-drawer-overlay"
            aria-label="Đóng chi tiết"
            onClick={() => setSelectedReview(null)}
          />
          <aside
            aria-label="Chi tiết đánh giá"
            className="admin-drawer"
            style={{ maxWidth: 520 }}
          >
            <div className="admin-drawer-heading">
              <div>
                <span className="admin-panel-kicker">Đánh giá #{selectedReview.id}</span>
                <h2>Chi tiết nhận xét</h2>
              </div>
              <button
                type="button"
                className="admin-icon-button"
                aria-label="Đóng"
                onClick={() => setSelectedReview(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
              {/* Product Info */}
              <div style={{ padding: "12px 14px", backgroundColor: "var(--admin-bg)", borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: "var(--admin-soft)", textTransform: "uppercase", fontWeight: 700 }}>Sản phẩm được đánh giá</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--admin-ink)", marginTop: 2 }}>{selectedReview.productName}</div>
                <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>Slug: {selectedReview.productSlug}</div>
              </div>

              {/* Reviewer Info */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div>
                    <strong style={{ fontSize: 14, color: "var(--admin-ink)" }}>{selectedReview.userName}</strong>
                    {selectedReview.verifiedBuyer && (
                      <span className="admin-status-pill is-info" style={{ marginLeft: 6, minHeight: 18, fontSize: 9 }}>
                        Đã mua
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--admin-soft)" }}>
                    {new Date(selectedReview.createdAt).toLocaleString("vi-VN")}
                  </div>
                </div>
                <div className="admin-review-stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      fill={i < selectedReview.rating ? "#e5a100" : "#e2e8f0"}
                      color={i < selectedReview.rating ? "#e5a100" : "#cbd5e1"}
                    />
                  ))}
                  <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 6, color: "var(--admin-muted)" }}>
                    {selectedReview.rating} / 5 sao
                  </span>
                </div>
              </div>

              {/* Content */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "var(--admin-soft)", marginBottom: 4, fontWeight: 650, textTransform: "uppercase" }}>Nội dung nhận xét:</div>
                <div
                  style={{
                    padding: 12,
                    backgroundColor: "#ffffff",
                    border: "1px solid var(--admin-line)",
                    borderRadius: 8,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: "var(--admin-ink)",
                  }}
                >
                  {selectedReview.content}
                </div>
              </div>

              {/* Photos Gallery */}
              {selectedReview.images && selectedReview.images.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "var(--admin-soft)", marginBottom: 6, fontWeight: 650, textTransform: "uppercase" }}>
                    Hình ảnh đính kèm ({selectedReview.images.length}):
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {selectedReview.images.map((img, idx) => (
                      <div
                        key={idx}
                        style={{
                          aspectRatio: "1/1",
                          position: "relative",
                          borderRadius: 6,
                          overflow: "hidden",
                          border: "1px solid var(--admin-line)",
                          backgroundColor: "#f1f5f9",
                        }}
                      >
                        <Image
                          src={img}
                          alt={`Review photo ${idx + 1}`}
                          fill
                          unoptimized
                          sizes="150px"
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Moderation Status Banner */}
              {selectedReview.status === "HIDDEN" && (
                <div
                  style={{
                    padding: 12,
                    backgroundColor: "var(--admin-red-soft)",
                    border: "1px solid #fecaca",
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", gap: 6, alignItems: "center", color: "var(--admin-red)", fontWeight: 700, fontSize: 12 }}>
                    <AlertTriangle size={14} /> Đánh giá đã bị ẩn kiểm duyệt
                  </div>
                  <div style={{ fontSize: 12, color: "#7f1d1d", marginTop: 4 }}>
                    <strong>Lý do:</strong> {selectedReview.moderationReason || "Không xác định"}
                  </div>
                  {selectedReview.moderatedBy && (
                    <div style={{ fontSize: 10, color: "var(--admin-red)", marginTop: 4 }}>
                      Người kiểm duyệt: {selectedReview.moderatedBy} • {new Date(selectedReview.moderatedAt || "").toLocaleString("vi-VN")}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="admin-drawer-actions">
              <button
                type="button"
                className="admin-button admin-button-secondary"
                onClick={() => setSelectedReview(null)}
              >
                Đóng
              </button>
              {selectedReview.status === "PUBLISHED" ? (
                <button
                  type="button"
                  className="admin-button admin-button-danger"
                  onClick={() => handleOpenHideModal(selectedReview)}
                >
                  <ShieldAlert size={15} /> Ẩn đánh giá này
                </button>
              ) : (
                <button
                  type="button"
                  className="admin-button admin-button-primary"
                  onClick={() => handleRestoreReview(selectedReview)}
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
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="hide-modal-title">
          <div className="admin-modal-card" style={{ maxWidth: 460 }}>
            <div className="admin-modal-header">
              <div className="admin-modal-icon is-danger">
                <ShieldAlert size={18} />
              </div>
              <div>
                <h3 id="hide-modal-title">Xác nhận ẩn đánh giá</h3>
                <p>Khách hàng: <strong>{selectedReview.userName}</strong> ({selectedReview.productName})</p>
              </div>
            </div>

            <div className="admin-modal-body">
              <p className="admin-modal-warning-text">
                Đánh giá này sẽ bị ẩn khỏi trang bán lẻ và không hiển thị cho người mua khác. Vui lòng ghi rõ lý do kiểm duyệt:
              </p>

              <label className="admin-modal-field">
                <span>Lý do ẩn đánh giá <span style={{ color: "var(--admin-red)" }}>*</span></span>
                <textarea
                  className="admin-form-textarea"
                  rows={3}
                  placeholder="Ví dụ: Sử dụng từ ngữ thô tục, quảng cáo bên ngoài, sai thông tin sản phẩm..."
                  value={hideReason}
                  onChange={(e) => {
                    setHideReason(e.target.value);
                    if (hideError) setHideError("");
                  }}
                  autoFocus
                />
                {hideError && (
                  <small style={{ color: "var(--admin-red)", fontSize: 11, marginTop: 4 }}>{hideError}</small>
                )}
              </label>
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-button admin-button-secondary"
                onClick={() => setIsHideModalOpen(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="admin-button admin-button-danger"
                onClick={handleConfirmHide}
              >
                Xác nhận ẩn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

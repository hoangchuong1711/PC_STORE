"use client";

import Image from "next/image";
import { Check, ChevronLeft, ChevronRight, Eye, EyeOff, ImageIcon, RotateCcw, Search, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import {
  adminCommunityStatuses,
  communityStatusLabels,
  communityStyleLabels,
  filterAdminCommunityPosts,
  initialAdminCommunityPosts,
  type AdminCommunityFilters,
  type AdminCommunityPost,
  type AdminCommunityStatus,
} from "../../lib/admin-community";
import type { SetupStyle } from "../../lib/community";
import { formatAdminDate } from "../../lib/admin";

const itemsPerPage = 6;

const statusTone: Record<AdminCommunityStatus, string> = {
  PUBLISHED: "is-success",
  HIDDEN: "is-muted",
};

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function communityStyleLabel(style: SetupStyle) {
  return style === "all" ? "Tất cả phong cách" : communityStyleLabels[style];
}

export function AdminCommunity() {
  const [items, setItems] = useState(initialAdminCommunityPosts);
  const [filters, setFilters] = useState<AdminCommunityFilters>({ query: "", status: "ALL", style: "ALL" });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPost, setSelectedPost] = useState<AdminCommunityPost | null>(null);
  const [hideReason, setHideReason] = useState("");
  const [showHideForm, setShowHideForm] = useState(false);
  const [feedback, setFeedback] = useState("");

  const filteredPosts = useMemo(() => filterAdminCommunityPosts(items, filters), [items, filters]);
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / itemsPerPage));
  const visiblePosts = filteredPosts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const publishedCount = items.filter((post) => post.status === "PUBLISHED").length;
  const hiddenCount = items.filter((post) => post.status === "HIDDEN").length;

  function updateFilter<K extends keyof AdminCommunityFilters>(key: K, value: AdminCommunityFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setCurrentPage(1);
  }

  function resetFilters() {
    setFilters({ query: "", status: "ALL", style: "ALL" });
    setCurrentPage(1);
  }

  function openPost(post: AdminCommunityPost) {
    setSelectedPost({ ...post });
    setHideReason("");
    setShowHideForm(false);
  }

  function closePost() {
    setSelectedPost(null);
    setHideReason("");
    setShowHideForm(false);
  }

  function restorePost() {
    if (!selectedPost) return;
    const updated = { ...selectedPost, status: "PUBLISHED" as const };
    setItems((current) => current.map((post) => (post.id === updated.id ? updated : post)));
    setSelectedPost(updated);
    setFeedback("Đã khôi phục bài setup và cho phép hiển thị lại.");
  }

  function hidePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPost || !hideReason.trim()) return;
    const updated = {
      ...selectedPost,
      status: "HIDDEN" as const,
      moderationReason: hideReason.trim(),
      moderatedBy: "Minh Anh",
      moderatedAt: new Date().toISOString(),
    };
    setItems((current) => current.map((post) => (post.id === updated.id ? updated : post)));
    setSelectedPost(updated);
    setShowHideForm(false);
    setHideReason("");
    setFeedback("Đã ẩn bài setup và lưu lý do kiểm duyệt.");
  }

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Nội dung cộng đồng</span>
          <h1>Setup Community</h1>
          <p>Kiểm duyệt các bài chia sẻ góc máy, ảnh setup và sản phẩm được gắn.</p>
        </div>
        <div className="admin-heading-summary">
          <span><strong>{publishedCount}</strong> đang hiển thị</span>
          <span><strong>{hiddenCount}</strong> đã ẩn</span>
        </div>
      </div>

      {feedback && (
        <div className="admin-feedback" role="status">
          <Check size={16} />
          <span>{feedback}</span>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setFeedback("")}><X size={15} /></button>
        </div>
      )}

      <section className="admin-panel admin-list-panel">
        <div className="admin-list-toolbar">
          <label className="admin-search-field">
            <Search size={16} />
            <span className="sr-only">Tìm bài setup</span>
            <input
              type="search"
              value={filters.query}
              placeholder="Tìm tiêu đề, tác giả..."
              onChange={(event) => updateFilter("query", event.target.value)}
            />
          </label>
          <select aria-label="Lọc trạng thái bài setup" value={filters.status} onChange={(event) => updateFilter("status", event.target.value as AdminCommunityFilters["status"])}>
            <option value="ALL">Tất cả trạng thái</option>
            {adminCommunityStatuses.map((status) => <option key={status} value={status}>{communityStatusLabels[status]}</option>)}
          </select>
          <select aria-label="Lọc phong cách setup" value={filters.style} onChange={(event) => updateFilter("style", event.target.value as AdminCommunityFilters["style"])}>
            <option value="ALL">Tất cả phong cách</option>
            {Object.entries(communityStyleLabels).map(([style, label]) => <option key={style} value={style}>{label}</option>)}
          </select>
          <button type="button" className="admin-filter-reset" onClick={resetFilters}><RotateCcw size={15} />Đặt lại</button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table admin-community-table">
            <thead>
              <tr>
                <th>Bài setup</th>
                <th>Tác giả</th>
                <th>Phong cách</th>
                <th>Tương tác</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
                <th className="align-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visiblePosts.map((post) => (
                <tr key={post.id}>
                  <td>
                    <div className="admin-community-table-cell">
                      <Image className="admin-community-cover" src={post.coverImage} alt="" width={58} height={58} unoptimized />
                      <span className="admin-community-title"><strong className="admin-table-primary">{post.title}</strong><small className="admin-table-secondary">{post.components.length} sản phẩm được gắn</small></span>
                    </div>
                  </td>
                  <td><span className="admin-table-primary">{post.author.name}</span><small className="admin-table-secondary">{post.author.handle}</small></td>
                  <td><span className="admin-community-style">{communityStyleLabel(post.style)}</span></td>
                  <td><div className="admin-community-metrics"><span>♡ {formatCompactNumber(post.likesCount)}</span><span>◉ {formatCompactNumber(post.viewsCount)}</span></div></td>
                  <td><span className={`admin-status-pill ${statusTone[post.status]}`}>{communityStatusLabels[post.status]}</span></td>
                  <td><span className="admin-table-secondary">{formatAdminDate(post.moderatedAt || post.createdAt)}</span></td>
                  <td className="align-right"><button type="button" className="admin-table-action" onClick={() => openPost(post)}><Eye size={15} />Xem</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {visiblePosts.length === 0 && <div className="admin-empty-state"><ImageIcon size={22} /><strong>Không tìm thấy bài setup</strong><span>Thử thay đổi từ khóa hoặc điều kiện lọc.</span></div>}
        </div>

        <div className="admin-table-footer">
          <span>Hiển thị <strong>{visiblePosts.length}</strong> trên <strong>{filteredPosts.length}</strong> bài setup</span>
          <div className="admin-pagination">
            <button type="button" className="admin-pagination-button" aria-label="Trang trước" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}><ChevronLeft size={16} /></button>
            <span>Trang <strong>{currentPage}</strong> / {totalPages}</span>
            <button type="button" className="admin-pagination-button" aria-label="Trang sau" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}><ChevronRight size={16} /></button>
          </div>
        </div>
      </section>

      {selectedPost && (
        <div className="admin-drawer-layer">
          <button type="button" className="admin-drawer-overlay" aria-label="Đóng chi tiết bài setup" onClick={closePost} />
          <aside className="admin-drawer admin-community-drawer" aria-label="Chi tiết bài setup">
            <div className="admin-drawer-heading">
              <div><span className="admin-panel-kicker">Kiểm duyệt nội dung</span><h2>Chi tiết bài setup</h2></div>
              <button type="button" className="admin-icon-button" aria-label="Đóng chi tiết" onClick={closePost}><X size={18} /></button>
            </div>

            <div className="admin-community-preview">
              <div className="admin-community-preview-image"><Image src={selectedPost.coverImage} alt={selectedPost.title} fill sizes="440px" unoptimized /></div>
              <div className="admin-community-preview-copy"><span className="admin-status-pill is-info">{communityStyleLabel(selectedPost.style)}</span><h3>{selectedPost.title}</h3><p>{selectedPost.description}</p></div>
            </div>

            <div className="admin-drawer-section">
              <div className="admin-drawer-section-heading"><h3>Tác giả</h3><span>{formatAdminDate(selectedPost.createdAt)}</span></div>
              <div className="admin-community-author"><Image src={selectedPost.author.avatar} alt="" width={38} height={38} unoptimized /><div><strong>{selectedPost.author.name}</strong><span>{selectedPost.author.handle} · {selectedPost.author.role}</span></div></div>
            </div>

            <div className="admin-drawer-section">
              <div className="admin-drawer-section-heading"><h3>Sản phẩm được gắn</h3><span>{selectedPost.components.length} sản phẩm</span></div>
              <div className="admin-community-products">{selectedPost.components.map((component) => <span className="admin-community-product-chip" key={`${selectedPost.id}-${component.name}`}>{component.name}</span>)}</div>
            </div>

            <div className="admin-drawer-section">
              <div className="admin-drawer-section-heading"><h3>Trạng thái kiểm duyệt</h3><span className={`admin-status-pill ${statusTone[selectedPost.status]}`}>{communityStatusLabels[selectedPost.status]}</span></div>
              {selectedPost.status === "HIDDEN" && <div className="admin-community-moderation"><strong>Lý do ẩn</strong><span>{selectedPost.moderationReason || "Chưa có lý do"}</span><small>Kiểm duyệt bởi {selectedPost.moderatedBy || "Admin"} · {selectedPost.moderatedAt ? formatAdminDate(selectedPost.moderatedAt) : "-"}</small></div>}
            </div>

            <div className="admin-drawer-actions admin-community-actions">
              {selectedPost.status === "HIDDEN" ? <button type="button" className="admin-button admin-button-secondary" onClick={restorePost}><Eye size={16} />Khôi phục hiển thị</button> : <button type="button" className="admin-button admin-button-danger" onClick={() => setShowHideForm(true)}><EyeOff size={16} />Ẩn bài setup</button>}
            </div>

            {showHideForm && selectedPost.status === "PUBLISHED" && (
              <form className="admin-community-moderation-form" onSubmit={hidePost}>
                <label>Lý do ẩn bài<textarea required value={hideReason} onChange={(event) => setHideReason(event.target.value)} placeholder="Ví dụ: Ảnh không phù hợp với tiêu chuẩn cộng đồng..." /></label>
                <div className="admin-drawer-actions"><button type="button" className="admin-button admin-button-secondary" onClick={() => setShowHideForm(false)}>Hủy</button><button type="submit" className="admin-button admin-button-danger"><EyeOff size={16} />Xác nhận ẩn</button></div>
              </form>
            )}

            <div className="admin-form-note"><ImageIcon size={16} /><span>Dữ liệu đang ở chế độ mẫu. Thao tác kiểm duyệt chỉ tồn tại trong phiên xem này.</span></div>
          </aside>
        </div>
      )}
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  ImageIcon,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
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
  PUBLISHED: "bg-admin-green-soft text-admin-green",
  HIDDEN: "bg-slate-100 text-slate-500",
};

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function communityStyleLabel(style: SetupStyle) {
  return style === "all" ? "Tất cả phong cách" : communityStyleLabels[style];
}

export function AdminCommunity() {
  const [items, setItems] = useState<AdminCommunityPost[]>(initialAdminCommunityPosts);
  const [filters, setFilters] = useState<AdminCommunityFilters>({ query: "", status: "ALL", style: "ALL" });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPost, setSelectedPost] = useState<AdminCommunityPost | null>(null);
  const [activePhoto, setActivePhoto] = useState<string>("");
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
    setActivePhoto(post.coverImage);
    setHideReason("");
    setShowHideForm(false);
  }

  function closePost() {
    setSelectedPost(null);
    setActivePhoto("");
    setHideReason("");
    setShowHideForm(false);
  }

  function restorePost() {
    if (!selectedPost) return;
    const updated = { ...selectedPost, status: "PUBLISHED" as const };
    setItems((current) => current.map((post) => (post.id === updated.id ? updated : post)));
    setSelectedPost(updated);
    setFeedback("Đã khôi phục bài setup và cho phép hiển thị lại trên trang cộng đồng.");
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
    setFeedback("Đã ẩn bài setup khỏi bảng tin và lưu lý do kiểm duyệt.");
  }

  return (
    <div className="max-w-[1250px] mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-7">
        <div>
          <span className="block text-[10px] font-bold text-admin-soft tracking-wider uppercase">Nội dung cộng đồng</span>
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-admin-ink tracking-tight mt-1 mb-1.5 leading-tight">Setup Community</h1>
          <p className="text-sm text-admin-muted max-w-[570px] m-0">Kiểm duyệt các bài chia sẻ góc máy, ảnh setup và sản phẩm được gắn từ khách hàng.</p>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-admin-muted">
          <span className="px-3 py-2 rounded-lg border border-admin-line bg-white shadow-xs"><strong className="text-admin-ink font-bold">{publishedCount}</strong> đang hiển thị</span>
          <span className="px-3 py-2 rounded-lg border border-admin-line bg-white shadow-xs"><strong className="text-admin-ink font-bold">{hiddenCount}</strong> đã ẩn</span>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center justify-between gap-2.5 p-3 rounded-lg bg-admin-green-soft border border-admin-green/20 text-xs font-semibold text-admin-green mb-5" role="status">
          <div className="flex items-center gap-2">
            <Check size={16} />
            <span>{feedback}</span>
          </div>
          <button type="button" aria-label="Đóng thông báo" className="cursor-pointer text-admin-green/70 hover:text-admin-green" onClick={() => setFeedback("")}>
            <X size={15} />
          </button>
        </div>
      )}

      <section className="rounded-xl border border-admin-line bg-admin-surface overflow-hidden">
        <div className="p-3.5 border-b border-admin-line bg-white flex flex-wrap items-center gap-3">
          <label className="relative flex items-center flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3 text-admin-soft pointer-events-none" />
            <span className="sr-only">Tìm bài setup</span>
            <input
              type="search"
              value={filters.query}
              placeholder="Tìm tiêu đề, tác giả..."
              onChange={(event) => updateFilter("query", event.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink placeholder:text-admin-soft focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue transition-colors"
            />
          </label>
          <select
            aria-label="Lọc trạng thái bài setup"
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value as AdminCommunityFilters["status"])}
            className="h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            {adminCommunityStatuses.map((status) => (
              <option key={status} value={status}>
                {communityStatusLabels[status]}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc phong cách setup"
            value={filters.style}
            onChange={(event) => updateFilter("style", event.target.value as AdminCommunityFilters["style"])}
            className="h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue cursor-pointer"
          >
            <option value="ALL">Tất cả phong cách</option>
            {Object.entries(communityStyleLabels).map(([style, label]) => (
              <option key={style} value={style}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-admin-line bg-white text-xs font-semibold text-admin-muted hover:bg-admin-bg hover:text-admin-ink transition-colors cursor-pointer"
            onClick={resetFilters}
          >
            <RotateCcw size={15} />
            Đặt lại
          </button>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">Bài setup</th>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">Tác giả</th>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">Phong cách</th>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">Tương tác</th>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">Trạng thái</th>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">Cập nhật</th>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visiblePosts.map((post) => (
                <tr key={post.id} className="hover:bg-admin-bg/40 transition-colors">
                  <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                    <div className="flex items-center gap-3">
                      <Image className="w-14 h-14 rounded-lg object-cover shrink-0 border border-admin-line" src={post.coverImage} alt="" width={58} height={58} unoptimized />
                      <span className="flex flex-col min-w-0">
                        <strong className="block text-xs font-bold text-admin-ink truncate max-w-xs">{post.title}</strong>
                        <small className="block text-[10px] text-admin-soft mt-0.5">
                          {post.images ? `${post.images.length} ảnh` : "1 ảnh"} · {post.components.length} linh kiện gắn
                        </small>
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                    <strong className="block text-xs font-bold text-admin-ink">{post.author.name}</strong>
                    <small className="block text-[10px] text-admin-soft mt-0.5">{post.author.handle}</small>
                  </td>
                  <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-admin-accent-soft text-admin-accent-dark">
                      {communityStyleLabel(post.style)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                    <div className="flex items-center gap-2.5 text-[11px] font-semibold text-admin-muted font-mono">
                      <span>♡ {formatCompactNumber(post.likesCount)}</span>
                      <span>◉ {formatCompactNumber(post.viewsCount)}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                    <span className={`inline-flex items-center min-h-[22px] px-2 rounded text-[10px] font-bold whitespace-nowrap ${statusTone[post.status]}`}>
                      {communityStatusLabels[post.status]}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle text-admin-soft text-[11px]">
                    {formatAdminDate(post.moderatedAt || post.createdAt)}
                  </td>
                  <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle text-right whitespace-nowrap">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-admin-blue hover:bg-admin-blue-soft transition-colors cursor-pointer"
                      onClick={() => openPost(post)}
                    >
                      <Eye size={15} /> Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visiblePosts.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center text-admin-muted gap-2">
              <ImageIcon size={28} className="text-admin-soft" />
              <strong className="text-xs font-bold text-admin-ink">Không tìm thấy bài setup</strong>
              <span className="text-[11px]">Thử thay đổi từ khóa hoặc điều kiện lọc.</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-admin-line bg-admin-bg/30 text-xs text-admin-muted gap-3">
          <span>Hiển thị <strong>{visiblePosts.length}</strong> trên <strong>{filteredPosts.length}</strong> bài setup</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-lg border border-admin-line bg-white text-admin-ink hover:bg-admin-bg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Trang trước"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs">Trang <strong>{currentPage}</strong> / {totalPages}</span>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-lg border border-admin-line bg-white text-admin-ink hover:bg-admin-bg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Trang sau"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {selectedPost && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="fixed inset-0 bg-black/40 backdrop-blur-xs border-0 cursor-pointer"
            aria-label="Đóng chi tiết bài setup"
            onClick={closePost}
          />
          <aside className="relative z-10 w-full max-w-lg bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto" aria-label="Chi tiết bài setup">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-admin-line">
              <div>
                <span className="block text-[10px] font-bold text-admin-soft tracking-wider uppercase">Kiểm duyệt nội dung</span>
                <h2 className="text-base font-bold text-admin-ink mt-0.5">Chi tiết bài setup</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href="/community"
                  target="_blank"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-transparent text-admin-muted hover:border-admin-line hover:bg-admin-bg hover:text-admin-ink cursor-pointer"
                  title="Mở trên trang cộng đồng khách hàng"
                >
                  <ExternalLink size={16} />
                </Link>
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-transparent text-admin-muted hover:border-admin-line hover:bg-admin-bg hover:text-admin-ink cursor-pointer"
                  aria-label="Đóng chi tiết"
                  onClick={closePost}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 mb-4">
              <div className="relative w-full h-56 rounded-xl overflow-hidden border border-admin-line bg-admin-bg">
                <Image src={activePhoto || selectedPost.coverImage} alt={selectedPost.title} fill sizes="440px" className="object-cover" unoptimized />
              </div>

              {selectedPost.images && selectedPost.images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {selectedPost.images.map((img, idx) => (
                    <button
                      type="button"
                      key={`${selectedPost.id}-img-${idx}`}
                      className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                        activePhoto === img ? "border-admin-blue scale-95" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                      onClick={() => setActivePhoto(img)}
                      aria-label={`Xem ảnh góc ${idx + 1}`}
                    >
                      <Image src={img} alt="" fill sizes="56px" className="object-cover" unoptimized />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <span className="inline-block self-start px-2 py-0.5 rounded text-[10px] font-semibold bg-admin-blue-soft text-admin-blue">
                  {communityStyleLabel(selectedPost.style)}
                </span>
                <h3 className="text-sm font-bold text-admin-ink">{selectedPost.title}</h3>
                <p className="text-xs text-admin-muted leading-relaxed">{selectedPost.description}</p>
              </div>
            </div>

            <div className="py-4 border-t border-admin-line flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-bold text-admin-ink">
                <h3>Tác giả bài đăng</h3>
                <span className="text-[11px] font-normal text-admin-soft">{formatAdminDate(selectedPost.createdAt)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Image src={selectedPost.author.avatar} alt="" width={38} height={38} className="rounded-full border border-admin-line" unoptimized />
                <div>
                  <strong className="block text-xs font-bold text-admin-ink">{selectedPost.author.name}</strong>
                  <span className="block text-[11px] text-admin-soft">{selectedPost.author.handle} · {selectedPost.author.role}</span>
                </div>
              </div>
            </div>

            <div className="py-4 border-t border-admin-line flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-bold text-admin-ink">
                <h3>Sản phẩm được gắn</h3>
                <span className="text-[11px] font-normal text-admin-soft">{selectedPost.components.length} linh kiện</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedPost.components.map((component) => (
                  <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-admin-bg border border-admin-line text-admin-ink" key={`${selectedPost.id}-${component.name}`}>
                    {component.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="py-4 border-t border-admin-line flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-bold text-admin-ink">
                <h3>Trạng thái kiểm duyệt</h3>
                <span className={`inline-flex items-center min-h-[22px] px-2 rounded text-[10px] font-bold whitespace-nowrap ${statusTone[selectedPost.status]}`}>
                  {communityStatusLabels[selectedPost.status]}
                </span>
              </div>
              {selectedPost.status === "HIDDEN" && (
                <div className="p-3 rounded-lg bg-admin-red-soft/40 border border-admin-red/20 text-xs flex flex-col gap-1">
                  <strong className="text-admin-red font-bold">Lý do ẩn</strong>
                  <span className="text-admin-ink">{selectedPost.moderationReason || "Chưa có lý do"}</span>
                  <small className="text-[10px] text-admin-soft mt-1">
                    Kiểm duyệt bởi {selectedPost.moderatedBy || "Admin"} ·{" "}
                    {selectedPost.moderatedAt ? formatAdminDate(selectedPost.moderatedAt) : "-"}
                  </small>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 pt-4 mt-auto border-t border-admin-line">
              {selectedPost.status === "HIDDEN" ? (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 min-h-[38px] px-4 rounded-lg text-xs font-bold border border-admin-line bg-white hover:border-[#bbc3cc] hover:bg-admin-bg text-admin-ink transition-colors cursor-pointer w-full"
                  onClick={restorePost}
                >
                  <Eye size={16} />
                  Khôi phục hiển thị
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 min-h-[38px] px-4 rounded-lg text-xs font-bold border border-rose-200 bg-admin-red-soft hover:bg-rose-100 text-admin-red transition-colors cursor-pointer w-full"
                  onClick={() => setShowHideForm(true)}
                >
                  <EyeOff size={16} />
                  Ẩn bài setup
                </button>
              )}
            </div>

            {showHideForm && selectedPost.status === "PUBLISHED" && (
              <form className="p-3.5 rounded-xl bg-admin-bg border border-admin-line flex flex-col gap-3 my-3 text-xs" onSubmit={hidePost}>
                <label className="flex flex-col gap-1.5 font-semibold text-admin-ink">
                  <span>Lý do ẩn bài</span>
                  <textarea
                    required
                    value={hideReason}
                    onChange={(event) => setHideReason(event.target.value)}
                    placeholder="Ví dụ: Hình ảnh vi phạm quy chuẩn cộng đồng, có quảng cáo rác..."
                    className="w-full rounded-lg border border-admin-line bg-white p-2.5 text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue resize-none"
                    rows={3}
                  />
                </label>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center min-h-[34px] px-3 rounded-lg text-xs font-bold border border-admin-line bg-white hover:bg-admin-bg text-admin-ink transition-colors cursor-pointer"
                    onClick={() => setShowHideForm(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 min-h-[34px] px-3 rounded-lg text-xs font-bold border border-rose-200 bg-admin-red-soft hover:bg-rose-100 text-admin-red transition-colors cursor-pointer"
                  >
                    <EyeOff size={14} />
                    Xác nhận ẩn
                  </button>
                </div>
              </form>
            )}

            <div className="flex items-center gap-2 text-[11px] text-admin-soft mt-3">
              <ImageIcon size={14} />
              <span>Dữ liệu lưu tạm trong phiên xem. Thao tác kiểm duyệt có hiệu lực ngay lập tức.</span>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

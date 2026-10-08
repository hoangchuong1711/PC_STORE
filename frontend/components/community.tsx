"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Heart,
  MessageSquare,
  Eye,
  Share2,
  Camera,
  Sparkles,
  Search,
  SlidersHorizontal,
  ShoppingCart,
  Check,
  X,
  ArrowRight,
} from "lucide-react";
import {
  CommunityPost,
  SetupStyle,
  styleCategories,
  getCommunityPosts,
  getFeaturedPost,
  toggleLikePost,
  addCommentToPost,
  createCommunityPost,
  formatTimeAgo,
} from "../lib/community";
import { products, formatPrice } from "../lib/products";
import { useCart } from "./cart-provider";
import { useToast } from "./toast";
import { Header, Footer } from "./storefront";

export function CommunityFeed() {
  const [selectedStyle, setSelectedStyle] = useState<SetupStyle>("all");
  const [sortBy, setSortBy] = useState<"newest" | "likes" | "views">("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [postsVersion, setPostsVersion] = useState(0);
  const { toast } = useToast();

  const featured = useMemo(() => getFeaturedPost(), []);

  const posts = useMemo(() => {
    return getCommunityPosts(selectedStyle, sortBy, searchQuery, postsVersion);
  }, [selectedStyle, sortBy, searchQuery, postsVersion]);

  const handleToggleLike = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = toggleLikePost(id);
    setPostsVersion((v) => v + 1);
    if (updated?.isLiked) {
      toast("Đã thêm vào danh sách góc máy yêu thích!", "success");
    }
  };

  return (
    <>
      <Header />
      <main className="container py-12 pb-24 min-h-[75vh]">
        {/* Hero Section */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 pb-8 border-b border-[#e0e0e0]">
          <div>
            <h1 className="font-heading text-3xl md:text-5xl font-extrabold tracking-tight text-ink mb-2">
              Góc máy & Cảm hứng không gian
            </h1>
            <p className="text-muted max-w-xl text-sm md:text-base leading-relaxed m-0">
              Khám phá các góc máy tính, bàn làm việc công thái học và phòng chơi game
              được chia sẻ trực tiếp từ cộng đồng người dùng PC Store.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-[#006ce1] hover:bg-[#0051a8] text-white shadow-sm transition-all cursor-pointer border-none shrink-0"
            onClick={() => setIsShareModalOpen(true)}
          >
            <Camera size={18} /> Chia sẻ góc máy của bạn
          </button>
        </section>

        {/* Featured Spotlight Setup */}
        {featured && (
          <section className="bg-white border border-[#e0e0e0] rounded-3xl overflow-hidden mb-12 shadow-sm" aria-label="Góc máy nổi bật">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              <div className="relative min-h-[320px] max-h-[460px] overflow-hidden bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={featured.coverImage} alt={featured.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-8 md:p-10 flex flex-col justify-center">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full mb-3 w-max">
                  <Sparkles size={14} /> Góc máy ấn tượng của tháng
                </div>
                <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-ink mb-3 tracking-tight">
                  {featured.title}
                </h2>
                <p className="text-sm md:text-base text-muted leading-relaxed mb-6">{featured.description}</p>

                <div className="flex items-center gap-3 mb-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featured.author.avatar}
                    alt={featured.author.name}
                    className="w-11 h-11 rounded-full object-cover border border-[#e0e0e0]"
                  />
                  <div>
                    <strong className="block text-sm text-ink">{featured.author.name}</strong>
                    <span className="text-xs text-muted">{featured.author.role}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <Link
                    href={`/community/${featured.id}`}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-semibold text-sm bg-[#006ce1] hover:bg-[#0051a8] text-white transition-colors shadow-sm"
                  >
                    Khám phá chi tiết linh kiện <ArrowRight size={15} />
                  </Link>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${
                      featured.isLiked
                        ? "bg-rose-50 border-rose-300 text-rose-600"
                        : "bg-white border-[#e0e0e0] text-slate-700 hover:border-slate-400"
                    }`}
                    onClick={(e) => handleToggleLike(featured.id, e)}
                    aria-label="Thả tim góc máy này"
                  >
                    <Heart
                      size={16}
                      fill={featured.isLiked ? "currentColor" : "none"}
                    />
                    <span>{featured.likesCount}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Category Tabs & Search Toolbar */}
        <section className="mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2 border-b border-[#e0e0e0] mb-6" role="tablist" aria-label="Lọc theo phong cách">
            {styleCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer border-none ${
                  selectedStyle === cat.id
                    ? "bg-ink text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                onClick={() => setSelectedStyle(cat.id)}
                role="tab"
                aria-selected={selectedStyle === cat.id}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            <div className="flex-1 flex items-center gap-2.5 bg-white border border-[#e0e0e0] rounded-xl px-3.5 py-2">
              <Search size={16} className="text-muted shrink-0" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm góc máy theo tên, linh kiện hoặc tác giả..."
                aria-label="Tìm kiếm góc máy"
                className="w-full border-none bg-transparent text-sm outline-none"
              />
            </div>

            <div className="flex items-center gap-2 text-muted text-xs md:text-sm">
              <SlidersHorizontal size={14} className="shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "newest" | "likes" | "views")}
                aria-label="Sắp xếp danh sách góc máy"
                className="p-2 px-3 border border-[#e0e0e0] rounded-xl bg-white text-xs md:text-sm text-ink outline-none"
              >
                <option value="newest">Mới đăng gần đây</option>
                <option value="likes">Được yêu thích nhất</option>
                <option value="views">Lượt xem nhiều nhất</option>
              </select>
            </div>
          </div>
        </section>

        {/* Setups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.length > 0 ? (
            posts.map((post) => (
              <article key={post.id} className="bg-white border border-[#e0e0e0] rounded-2xl overflow-hidden flex flex-col hover:border-slate-300 hover:shadow-md transition-all">
                <Link href={`/community/${post.id}`} className="relative block aspect-video overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    loading="lazy"
                  />
                  <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-md">
                    {styleCategories.find((s) => s.id === post.style)?.label.split(" (")[0] ||
                      post.style}
                  </span>
                  <button
                    type="button"
                    className={`absolute top-3 right-3 w-9 h-9 rounded-full bg-slate-900/60 backdrop-blur-sm text-white grid place-items-center hover:bg-slate-900 transition-colors border-none cursor-pointer ${
                      post.isLiked ? "text-rose-500" : ""
                    }`}
                    onClick={(e) => handleToggleLike(post.id, e)}
                    aria-label={`Thả tim bài viết, hiện có ${post.likesCount} lượt thích`}
                  >
                    <Heart
                      size={16}
                      fill={post.isLiked ? "currentColor" : "none"}
                    />
                  </button>
                </Link>

                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-heading text-base font-bold text-ink mb-2">
                    <Link href={`/community/${post.id}`} className="hover:text-[#006ce1] transition-colors">
                      {post.title}
                    </Link>
                  </h3>

                  <div className="flex items-center gap-2.5 mb-3 text-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.author.avatar}
                      alt={post.author.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <div className="text-muted truncate">
                      <strong className="text-ink">{post.author.name}</strong> · {post.author.role}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {post.components.slice(0, 3).map((comp, idx) => (
                      <span key={idx} className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md truncate max-w-[140px]">
                        {comp.name}
                      </span>
                    ))}
                    {post.components.length > 3 && (
                      <span className="text-[11px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                        +{post.components.length - 3} món
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs text-muted pt-3 border-t border-slate-100 mt-auto">
                    <span>{formatTimeAgo(post.createdAt)}</span>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1" title="Lượt thích">
                        <Heart size={13} /> {post.likesCount}
                      </span>
                      <span className="inline-flex items-center gap-1" title="Bình luận">
                        <MessageSquare size={13} /> {post.comments.length}
                      </span>
                      <span className="inline-flex items-center gap-1" title="Lượt xem">
                        <Eye size={13} /> {post.viewsCount}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="col-span-full text-center py-16 px-6 bg-white border border-[#e0e0e0] rounded-2xl">
              <h3 className="text-lg font-bold text-ink mb-2">Không tìm thấy góc máy nào</h3>
              <p className="text-sm text-muted mb-4">Thử tìm với từ khóa khác hoặc chọn phong cách khác.</p>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-ink border border-[#e0e0e0] hover:border-slate-400 bg-white transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedStyle("all");
                  setSearchQuery("");
                }}
              >
                Xem tất cả góc máy
              </button>
            </div>
          )}
        </div>

        {/* Share Setup Modal */}
        <CreateSetupModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          onSuccess={() => setPostsVersion((v) => v + 1)}
        />
      </main>
      <Footer />
    </>
  );
}

export function CommunityDetail({ post: initialPost }: { post: CommunityPost }) {
  const [post, setPost] = useState<CommunityPost>(initialPost);
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");
  const { add } = useCart();
  const { toast } = useToast();

  const handleToggleLike = () => {
    const updated = toggleLikePost(post.id);
    if (updated) {
      setPost({ ...updated });
      if (updated.isLiked) {
        toast("Đã thả tim bài viết!", "success");
      }
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast("Đã sao chép liên kết góc máy vào bộ nhớ tạm!", "info");
    }
  };

  const handleAddToCart = (slug?: string, name?: string) => {
    if (!slug) return;
    const prod = products.find((p) => p.slug === slug);
    if (prod) {
      add(prod.id, 1);
      toast(`Đã thêm "${name || prod.name}" vào giỏ hàng!`, "success");
    } else {
      toast(`Sản phẩm "${name}" hiện đã hết hàng trong kho.`, "info");
    }
  };

  const handleAddAllComponents = () => {
    let count = 0;
    post.components.forEach((c) => {
      if (c.slug) {
        const prod = products.find((p) => p.slug === c.slug);
        if (prod && prod.stock > 0) {
          add(prod.id, 1);
          count++;
        }
      }
    });
    if (count > 0) {
      toast(`Đã thêm ${count} linh kiện của góc máy vào giỏ hàng!`, "success");
    } else {
      toast("Các linh kiện trong góc máy này tạm thời hết hàng.", "info");
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment = addCommentToPost(post.id, {
      author: commentAuthor.trim() || "Thành viên PC Store",
      content: commentText.trim(),
    });

    if (newComment) {
      setPost((prev) => ({
        ...prev,
        comments: [...prev.comments, newComment],
      }));
      setCommentText("");
      toast("Đã đăng bình luận của bạn thành công!", "success");
    }
  };

  return (
    <>
      <Header />
      <main className="container py-10 pb-24 min-h-[75vh]">
        <nav className="flex items-center gap-2 text-xs md:text-sm text-muted mb-6" aria-label="Đường dẫn">
          <Link href="/" className="hover:text-ink">Trang chủ</Link>
          <span>/</span>
          <Link href="/community" className="hover:text-ink">Cộng đồng góc máy</Link>
          <span>/</span>
          <span className="text-ink font-semibold truncate max-w-sm">{post.title}</span>
        </nav>

        {/* Title & Author Bar */}
        <div className="mb-8">
          <h1 className="font-heading text-2xl md:text-4xl font-extrabold text-ink mb-4 tracking-tight">
            {post.title}
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-y border-[#e0e0e0]">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="w-11 h-11 rounded-full object-cover border border-[#e0e0e0]"
              />
              <div className="text-xs md:text-sm">
                <strong className="block text-ink">{post.author.name}</strong>
                <span className="text-muted">
                  {post.author.role} · Đăng {formatTimeAgo(post.createdAt)} ·{" "}
                  {post.viewsCount} lượt xem
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold border transition-colors cursor-pointer ${
                  post.isLiked
                    ? "bg-rose-50 border-rose-300 text-rose-600"
                    : "bg-white border-[#e0e0e0] text-slate-700 hover:border-slate-400"
                }`}
                onClick={handleToggleLike}
                aria-label="Thả tim góc máy này"
              >
                <Heart
                  size={16}
                  fill={post.isLiked ? "currentColor" : "none"}
                />
                <span>Thích ({post.likesCount})</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold border border-[#e0e0e0] hover:border-slate-400 bg-white text-slate-700 transition-colors cursor-pointer"
                onClick={handleCopyLink}
                aria-label="Chia sẻ liên kết"
              >
                <Share2 size={15} /> Chia sẻ
              </button>
            </div>
          </div>
        </div>

        {/* Main 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)] gap-8 items-start">
          {/* Left Column: Gallery, Specs & Story */}
          <div className="flex flex-col gap-8">
            {/* Gallery View */}
            <div>
              <div className="aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-[#e0e0e0]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.images[selectedImgIdx] || post.coverImage}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {post.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 mt-3" role="group" aria-label="Hình ảnh khác">
                  {post.images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`w-20 h-20 rounded-xl overflow-hidden border-2 p-0 bg-transparent cursor-pointer shrink-0 transition-all ${
                        selectedImgIdx === idx ? "border-[#006ce1] ring-2 ring-[#006ce1]/30" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                      onClick={() => setSelectedImgIdx(idx)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgUrl} alt={`Góc nhìn ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Desk Specifications */}
            <section className="bg-white border border-[#e0e0e0] rounded-2xl p-6 md:p-7">
              <h2 className="font-heading text-lg font-bold text-ink m-0 mb-4">Thông số không gian bàn làm việc</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 m-0">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <dt className="text-xs font-bold uppercase text-muted mb-1">Bàn làm việc</dt>
                  <dd className="m-0 text-sm font-semibold text-ink">{post.deskSpecs.desk}</dd>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <dt className="text-xs font-bold uppercase text-muted mb-1">Ghế ngồi</dt>
                  <dd className="m-0 text-sm font-semibold text-ink">{post.deskSpecs.chair}</dd>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <dt className="text-xs font-bold uppercase text-muted mb-1">Chiếu sáng & Đèn</dt>
                  <dd className="m-0 text-sm font-semibold text-ink">{post.deskSpecs.lighting}</dd>
                </div>
                {post.deskSpecs.audio && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <dt className="text-xs font-bold uppercase text-muted mb-1">Âm thanh & Tai nghe</dt>
                    <dd className="m-0 text-sm font-semibold text-ink">{post.deskSpecs.audio}</dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Author Story */}
            <section className="bg-white border border-[#e0e0e0] rounded-2xl p-6 md:p-7">
              <h2 className="font-heading text-lg font-bold text-ink m-0 mb-3">Câu chuyện & Kinh nghiệm bố trí</h2>
              <p className="text-sm md:text-base leading-relaxed text-slate-700 m-0">{post.description}</p>
            </section>

            {/* Comments & Discussion */}
            <section className="bg-white border border-[#e0e0e0] rounded-2xl p-6 md:p-7">
              <h2 className="font-heading text-lg font-bold text-ink m-0 mb-4">Thảo luận ({post.comments.length})</h2>

              <form onSubmit={handleCommentSubmit} className="flex flex-col gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="text"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  placeholder="Tên của bạn (hoặc để trống)..."
                  aria-label="Tên người bình luận"
                  className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none bg-white focus:border-[#006ce1]"
                />
                <textarea
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Hỏi về cách đi dây, trải nghiệm linh kiện hoặc chia sẻ cảm nghĩ của bạn..."
                  required
                  aria-label="Nội dung bình luận"
                  className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none bg-white focus:border-[#006ce1] resize-y"
                />
                <div className="flex justify-end">
                  <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm cursor-pointer border-none">
                    Gửi bình luận
                  </button>
                </div>
              </form>

              <div className="flex flex-col gap-4">
                {post.comments.length > 0 ? (
                  post.comments.map((comment) => (
                    <article key={comment.id} className="flex items-start gap-3.5 p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          comment.avatar ||
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
                        }
                        alt={comment.author}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <strong className="text-ink font-bold">{comment.author}</strong>
                          <span className="text-muted">{formatTimeAgo(comment.createdAt)}</span>
                        </div>
                        <p className="m-0 text-xs md:text-sm text-slate-700 leading-relaxed">{comment.content}</p>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-center py-6 text-sm text-muted m-0">
                    Chưa có bình luận nào. Hãy là người đầu tiên đặt câu hỏi cho chủ nhân góc máy!
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Sticky Tagged Components */}
          <aside className="lg:sticky lg:top-24">
            <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#e0e0e0]">
                <h3 className="m-0 text-base font-bold text-ink">Linh kiện trong góc máy</h3>
                <span className="text-xs font-semibold text-muted bg-slate-100 px-2.5 py-1 rounded-full">
                  {post.components.length} sản phẩm
                </span>
              </div>

              <div className="flex flex-col gap-3 mb-5 max-h-[460px] overflow-y-auto">
                {post.components.map((comp, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase text-muted block mb-0.5">{comp.category}</span>
                      {comp.slug ? (
                        <Link
                          href={`/products/${comp.slug}`}
                          className="text-xs md:text-sm font-bold text-ink hover:text-[#006ce1] block truncate"
                        >
                          {comp.name}
                        </Link>
                      ) : (
                        <strong className="text-xs md:text-sm font-bold text-ink block truncate">{comp.name}</strong>
                      )}
                      {comp.specsSummary && (
                        <p className="m-0 text-[11px] text-muted truncate">{comp.specsSummary}</p>
                      )}
                    </div>
                    {comp.price && (
                      <div className="text-xs md:text-sm font-specs font-bold text-ink shrink-0">
                        {formatPrice(comp.price)}
                      </div>
                    )}
                    {comp.slug && (
                      <button
                        type="button"
                        className="w-8 h-8 rounded-lg bg-white hover:bg-[#006ce1] hover:text-white border border-slate-200 grid place-items-center text-slate-700 transition-colors cursor-pointer shrink-0"
                        onClick={() => handleAddToCart(comp.slug, comp.name)}
                        aria-label={`Thêm ${comp.name} vào giỏ`}
                        title="Thêm vào giỏ hàng"
                      >
                        <ShoppingCart size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 p-3 font-semibold text-sm rounded-xl text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm cursor-pointer border-none"
                onClick={handleAddAllComponents}
              >
                <ShoppingCart size={16} /> Thêm cả bộ vào giỏ hàng
              </button>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}

export function CreateSetupModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("Thành viên PC Store");
  const [style, setStyle] = useState<SetupStyle>("minimalist");
  const [selectedPresetPhoto, setSelectedPresetPhoto] = useState(0);
  const [description, setDescription] = useState("");
  const [deskModel, setDeskModel] = useState("Bàn nâng hạ tự động 1m6 x 80cm");
  const [chairModel, setChairModel] = useState("Ghế công thái học lưới thoáng khí");
  const [lightingModel, setLightingModel] = useState("Đèn treo màn hình chống cận");
  const [selectedComponentSlugs, setSelectedComponentSlugs] = useState<string[]>([
    "pc-creator-pro-x",
    "ultrawide-monitor-34",
  ]);

  const { toast } = useToast();

  const presetPhotos = [
    "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=1400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&auto=format&fit=crop&q=80",
  ];

  if (!isOpen) return null;

  const toggleComponentSelect = (slug: string) => {
    if (selectedComponentSlugs.includes(slug)) {
      setSelectedComponentSlugs(selectedComponentSlugs.filter((s) => s !== slug));
    } else {
      setSelectedComponentSlugs([...selectedComponentSlugs, slug]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast("Vui lòng nhập đầy đủ tiêu đề và câu chuyện góc máy.", "error");
      return;
    }

    createCommunityPost({
      title,
      authorName: authorName.trim() || "Thành viên PC Store",
      authorRole,
      style,
      coverImage: presetPhotos[selectedPresetPhoto],
      description,
      deskSpecs: {
        desk: deskModel,
        chair: chairModel,
        lighting: lightingModel,
      },
      componentSlugs: selectedComponentSlugs,
    });

    toast("Góc máy của bạn đã được chia sẻ lên cộng đồng PC Store!", "success");
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 grid place-items-center p-5" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-7 md:p-8 max-w-[640px] w-full max-h-[85vh] overflow-y-auto shadow-2xl"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-ink m-0">Chia sẻ góc máy của bạn</h2>
            <p className="text-xs md:text-sm text-muted mt-1 leading-relaxed">
              Lan tỏa cảm hứng làm việc và trải nghiệm phần cứng đến cộng đồng
            </p>
          </div>
          <button
            type="button"
            className="text-muted hover:text-ink p-1 rounded-lg cursor-pointer bg-transparent border-none"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="setupTitle" className="text-xs font-bold text-ink">Tiêu đề góc máy *</label>
            <input
              id="setupTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Không gian làm việc tối giản phong cách Bắc Âu"
              required
              className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#006ce1]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="authorName" className="text-xs font-bold text-ink">Tên của bạn *</label>
              <input
                id="authorName"
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="VD: Minh Hoàng"
                required
                className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#006ce1]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="authorRole" className="text-xs font-bold text-ink">Nghề nghiệp / Sở thích</label>
              <input
                id="authorRole"
                type="text"
                value={authorRole}
                onChange={(e) => setAuthorRole(e.target.value)}
                placeholder="VD: Software Engineer & Gamer"
                className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#006ce1]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="setupStyle" className="text-xs font-bold text-ink">Phong cách không gian *</label>
            <select
              id="setupStyle"
              value={style}
              onChange={(e) => setStyle(e.target.value as SetupStyle)}
              className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none bg-white focus:border-[#006ce1]"
            >
              <option value="minimalist">Tối giản (Minimalist)</option>
              <option value="rgb-gaming">RGB & Battlestation</option>
              <option value="workstation">Trạm làm việc (Workstation)</option>
              <option value="ergonomic">Công thái học (Ergonomic)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="deskModel" className="text-xs font-bold text-ink">Mẫu bàn làm việc</label>
              <input
                id="deskModel"
                type="text"
                value={deskModel}
                onChange={(e) => setDeskModel(e.target.value)}
                placeholder="VD: Bàn nâng hạ tự động 1m6 x 80cm"
                className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#006ce1]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="chairModel" className="text-xs font-bold text-ink">Ghế ngồi / Công thái học</label>
              <input
                id="chairModel"
                type="text"
                value={chairModel}
                onChange={(e) => setChairModel(e.target.value)}
                placeholder="VD: Ghế lưới công thái học"
                className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#006ce1]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="lightingModel" className="text-xs font-bold text-ink">Chiếu sáng / Đèn trang trí</label>
            <input
              id="lightingModel"
              type="text"
              value={lightingModel}
              onChange={(e) => setLightingModel(e.target.value)}
              placeholder="VD: Đèn treo màn hình chống cận"
              className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#006ce1]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-ink">Chọn hình ảnh góc máy:</label>
            <div className="grid grid-cols-4 gap-2.5">
              {presetPhotos.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`aspect-video rounded-xl overflow-hidden border-2 p-0 bg-transparent cursor-pointer transition-all ${
                    selectedPresetPhoto === idx
                      ? "border-[#006ce1] ring-2 ring-[#006ce1]/30"
                      : "border-transparent opacity-75 hover:opacity-100"
                  }`}
                  onClick={() => setSelectedPresetPhoto(idx)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Ảnh mẫu ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-ink">Gắn thẻ linh kiện có sẵn tại PC Store:</label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
              {products.map((p) => {
                const selected = selectedComponentSlugs.includes(p.slug);
                return (
                  <button
                    key={p.slug}
                    type="button"
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors border ${
                      selected
                        ? "bg-[#006ce1] text-white border-[#006ce1]"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                    }`}
                    onClick={() => toggleComponentSelect(p.slug)}
                  >
                    {selected && <Check size={12} />} {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="setupDesc" className="text-xs font-bold text-ink">Câu chuyện góc máy & Bí quyết giấu dây *</label>
            <textarea
              id="setupDesc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Chia sẻ về ý tưởng setup, cách giấu dây, đèn nền hoặc cảm nhận hiệu năng..."
              required
              className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none resize-y focus:border-[#006ce1]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-ink border border-[#e0e0e0] hover:border-slate-400 bg-white transition-colors cursor-pointer"
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm cursor-pointer border-none"
            >
              Đăng góc máy ngay
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
import "./community.css";

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
      <main className="container community-page">
        {/* Hero Section */}
        <section className="community-hero">
          <div className="community-hero-title">
            <h1>Góc máy & Cảm hứng không gian</h1>
            <p>
              Khám phá các góc máy tính, bàn làm việc công thái học và phòng chơi game
              được chia sẻ trực tiếp từ cộng đồng người dùng PC Store.
            </p>
          </div>
          <button
            type="button"
            className="button button-primary community-share-btn"
            onClick={() => setIsShareModalOpen(true)}
          >
            <Camera size={18} /> Chia sẻ góc máy của bạn
          </button>
        </section>

        {/* Featured Spotlight Setup */}
        {featured && (
          <section className="featured-spotlight" aria-label="Góc máy nổi bật">
            <div className="spotlight-grid">
              <div className="spotlight-visual">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={featured.coverImage} alt={featured.title} />
              </div>
              <div className="spotlight-content">
                <div className="spotlight-badge">
                  <Sparkles size={14} /> Góc máy ấn tượng của tháng
                </div>
                <h2>{featured.title}</h2>
                <p className="spotlight-desc">{featured.description}</p>

                <div className="spotlight-author">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featured.author.avatar}
                    alt={featured.author.name}
                    className="spotlight-author-img"
                  />
                  <div className="spotlight-author-info">
                    <strong>{featured.author.name}</strong>
                    <span>{featured.author.role}</span>
                  </div>
                </div>

                <div className="spotlight-actions">
                  <Link
                    href={`/community/${featured.id}`}
                    className="spotlight-view-btn"
                  >
                    Khám phá chi tiết linh kiện <ArrowRight size={15} />
                  </Link>
                  <button
                    type="button"
                    className={`spotlight-like-btn ${featured.isLiked ? "liked" : ""}`}
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
        <section className="community-toolbar">
          <div className="community-style-tabs" role="tablist" aria-label="Lọc theo phong cách">
            {styleCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`style-tab-btn ${selectedStyle === cat.id ? "active" : ""}`}
                onClick={() => setSelectedStyle(cat.id)}
                role="tab"
                aria-selected={selectedStyle === cat.id}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="community-search-sort-row">
            <div className="community-search-box">
              <Search size={16} className="community-search-icon" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm góc máy theo tên, linh kiện hoặc tác giả..."
                aria-label="Tìm kiếm góc máy"
              />
            </div>

            <div className="community-sort-select">
              <SlidersHorizontal size={14} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "newest" | "likes" | "views")}
                aria-label="Sắp xếp danh sách góc máy"
              >
                <option value="newest">Mới đăng gần đây</option>
                <option value="likes">Được yêu thích nhất</option>
                <option value="views">Lượt xem nhiều nhất</option>
              </select>
            </div>
          </div>
        </section>

        {/* Setups Grid */}
        <div className="setups-grid">
          {posts.length > 0 ? (
            posts.map((post) => (
              <article key={post.id} className="setup-card">
                <Link href={`/community/${post.id}`} className="setup-card-cover-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="setup-card-cover"
                    loading="lazy"
                  />
                  <span className="setup-card-tag">
                    {styleCategories.find((s) => s.id === post.style)?.label.split(" (")[0] ||
                      post.style}
                  </span>
                  <button
                    type="button"
                    className={`setup-card-like-btn ${post.isLiked ? "liked" : ""}`}
                    onClick={(e) => handleToggleLike(post.id, e)}
                    aria-label={`Thả tim bài viết, hiện có ${post.likesCount} lượt thích`}
                  >
                    <Heart
                      size={16}
                      fill={post.isLiked ? "currentColor" : "none"}
                    />
                  </button>
                </Link>

                <div className="setup-card-body">
                  <h3 className="setup-card-title">
                    <Link href={`/community/${post.id}`}>{post.title}</Link>
                  </h3>

                  <div className="setup-card-author">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.author.avatar}
                      alt={post.author.name}
                      className="setup-card-avatar"
                    />
                    <div className="setup-card-author-name">
                      <strong>{post.author.name}</strong> · {post.author.role}
                    </div>
                  </div>

                  <div className="setup-card-components">
                    {post.components.slice(0, 3).map((comp, idx) => (
                      <span key={idx} className="component-chip">
                        {comp.name}
                      </span>
                    ))}
                    {post.components.length > 3 && (
                      <span className="component-chip">
                        +{post.components.length - 3} món
                      </span>
                    )}
                  </div>

                  <div className="setup-card-footer">
                    <span>{formatTimeAgo(post.createdAt)}</span>
                    <div className="setup-stats">
                      <span className="stat-item" title="Lượt thích">
                        <Heart size={13} /> {post.likesCount}
                      </span>
                      <span className="stat-item" title="Bình luận">
                        <MessageSquare size={13} /> {post.comments.length}
                      </span>
                      <span className="stat-item" title="Lượt xem">
                        <Eye size={13} /> {post.viewsCount}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="community-empty">
              <h3>Không tìm thấy góc máy nào</h3>
              <p>Thử tìm với từ khóa khác hoặc chọn phong cách khác.</p>
              <button
                type="button"
                className="button button-outline"
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
      <main className="container community-detail-page">
        <nav className="breadcrumb" aria-label="Đường dẫn">
          <Link href="/">Trang chủ</Link>
          <span>/</span>
          <Link href="/community">Cộng đồng góc máy</Link>
          <span>/</span>
          <span>{post.title}</span>
        </nav>

        {/* Title & Author Bar */}
        <div className="detail-header-wrap">
          <h1>{post.title}</h1>
          <div className="detail-author-bar">
            <div className="detail-author-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="detail-author-avatar"
              />
              <div className="detail-author-meta">
                <strong>{post.author.name}</strong>
                <span>
                  {post.author.role} · Đăng {formatTimeAgo(post.createdAt)} ·{" "}
                  {post.viewsCount} lượt xem
                </span>
              </div>
            </div>

            <div className="detail-header-actions">
              <button
                type="button"
                className={`detail-like-btn ${post.isLiked ? "liked" : ""}`}
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
                className="detail-share-btn"
                onClick={handleCopyLink}
                aria-label="Chia sẻ liên kết"
              >
                <Share2 size={15} /> Chia sẻ
              </button>
            </div>
          </div>
        </div>

        {/* Main 2-column layout */}
        <div className="community-detail-layout">
          {/* Left Column: Gallery, Specs & Story */}
          <div className="community-detail-left">
            {/* Gallery View */}
            <div className="community-detail-gallery">
              <div className="detail-gallery-main">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.images[selectedImgIdx] || post.coverImage}
                  alt={post.title}
                />
              </div>
              {post.images.length > 1 && (
                <div className="detail-gallery-thumbs" role="group" aria-label="Hình ảnh khác">
                  {post.images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`gallery-thumb-btn ${selectedImgIdx === idx ? "active" : ""}`}
                      onClick={() => setSelectedImgIdx(idx)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgUrl} alt={`Góc nhìn ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Desk Specifications */}
            <section className="desk-specs-box">
              <h2>Thông số không gian bàn làm việc</h2>
              <dl className="specs-grid-items">
                <div className="spec-entry">
                  <dt>Bàn làm việc</dt>
                  <dd>{post.deskSpecs.desk}</dd>
                </div>
                <div className="spec-entry">
                  <dt>Ghế ngồi</dt>
                  <dd>{post.deskSpecs.chair}</dd>
                </div>
                <div className="spec-entry">
                  <dt>Chiếu sáng & Đèn</dt>
                  <dd>{post.deskSpecs.lighting}</dd>
                </div>
                {post.deskSpecs.audio && (
                  <div className="spec-entry">
                    <dt>Âm thanh & Tai nghe</dt>
                    <dd>{post.deskSpecs.audio}</dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Author Story */}
            <section className="setup-story-section">
              <h2>Câu chuyện & Kinh nghiệm bố trí</h2>
              <p>{post.description}</p>
            </section>

            {/* Comments & Discussion */}
            <section className="setup-comments-section">
              <h2>Thảo luận ({post.comments.length})</h2>

              <form onSubmit={handleCommentSubmit} className="add-comment-box">
                <input
                  type="text"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  placeholder="Tên của bạn (hoặc để trống)..."
                  aria-label="Tên người bình luận"
                />
                <textarea
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Hỏi về cách đi dây, trải nghiệm linh kiện hoặc chia sẻ cảm nghĩ của bạn..."
                  required
                  aria-label="Nội dung bình luận"
                />
                <div className="add-comment-footer">
                  <button type="submit" className="button button-primary">
                    Gửi bình luận
                  </button>
                </div>
              </form>

              <div className="comments-list">
                {post.comments.length > 0 ? (
                  post.comments.map((comment) => (
                    <article key={comment.id} className="comment-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          comment.avatar ||
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
                        }
                        alt={comment.author}
                        className="comment-avatar"
                      />
                      <div className="comment-main">
                        <div className="comment-header">
                          <strong>{comment.author}</strong>
                          <span>{formatTimeAgo(comment.createdAt)}</span>
                        </div>
                        <p className="comment-content">{comment.content}</p>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="no-comments-yet">
                    Chưa có bình luận nào. Hãy là người đầu tiên đặt câu hỏi cho chủ nhân góc máy!
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Sticky Tagged Components */}
          <aside className="community-sidebar">
            <div className="components-card-panel">
              <div className="components-card-panel-header">
                <h3>Linh kiện trong góc máy</h3>
                <span className="components-count-badge">
                  {post.components.length} sản phẩm
                </span>
              </div>

              <div className="setup-components-list">
                {post.components.map((comp, idx) => (
                  <div key={idx} className="component-item-row">
                    <div className="component-item-info">
                      <span className="component-item-cat">{comp.category}</span>
                      {comp.slug ? (
                        <Link
                          href={`/products/${comp.slug}`}
                          className="component-item-name"
                        >
                          {comp.name}
                        </Link>
                      ) : (
                        <strong className="component-item-name">{comp.name}</strong>
                      )}
                      {comp.specsSummary && (
                        <p className="component-item-specs">{comp.specsSummary}</p>
                      )}
                    </div>
                    {comp.price && (
                      <div className="component-item-price">
                        {formatPrice(comp.price)}
                      </div>
                    )}
                    {comp.slug && (
                      <button
                        type="button"
                        className="component-add-cart-btn"
                        onClick={() => handleAddToCart(comp.slug, comp.name)}
                        aria-label={`Thêm ${comp.name} vào giỏ`}
                        title="Thêm vào giỏ hàng"
                      >
                        <ShoppingCart size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="button button-primary buy-all-components-btn"
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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content share-setup-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="share-modal-header">
          <div>
            <h2>Chia sẻ góc máy của bạn</h2>
            <p className="modal-subtitle">
              Lan tỏa cảm hứng làm việc và trải nghiệm phần cứng đến cộng đồng
            </p>
          </div>
          <button
            type="button"
            className="picker-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="share-setup-form">
          <div className="form-field">
            <label htmlFor="setupTitle">Tiêu đề góc máy *</label>
            <input
              id="setupTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Không gian làm việc tối giản phong cách Bắc Âu"
              required
            />
          </div>

          <div className="form-group-row">
            <div className="form-field">
              <label htmlFor="authorName">Tên của bạn *</label>
              <input
                id="authorName"
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="VD: Minh Hoàng"
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="authorRole">Nghề nghiệp / Sở thích</label>
              <input
                id="authorRole"
                type="text"
                value={authorRole}
                onChange={(e) => setAuthorRole(e.target.value)}
                placeholder="VD: Software Engineer & Gamer"
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="setupStyle">Phong cách không gian *</label>
            <select
              id="setupStyle"
              value={style}
              onChange={(e) => setStyle(e.target.value as SetupStyle)}
            >
              <option value="minimalist">Tối giản (Minimalist)</option>
              <option value="rgb-gaming">RGB & Battlestation</option>
              <option value="workstation">Trạm làm việc (Workstation)</option>
              <option value="ergonomic">Công thái học (Ergonomic)</option>
            </select>
          </div>

          <div className="form-group-row">
            <div className="form-field">
              <label htmlFor="deskModel">Mẫu bàn làm việc</label>
              <input
                id="deskModel"
                type="text"
                value={deskModel}
                onChange={(e) => setDeskModel(e.target.value)}
                placeholder="VD: Bàn nâng hạ tự động 1m6 x 80cm"
              />
            </div>
            <div className="form-field">
              <label htmlFor="chairModel">Ghế ngồi / Công thái học</label>
              <input
                id="chairModel"
                type="text"
                value={chairModel}
                onChange={(e) => setChairModel(e.target.value)}
                placeholder="VD: Ghế lưới công thái học"
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="lightingModel">Chiếu sáng / Đèn trang trí</label>
            <input
              id="lightingModel"
              type="text"
              value={lightingModel}
              onChange={(e) => setLightingModel(e.target.value)}
              placeholder="VD: Đèn treo màn hình chống cận"
            />
          </div>

          <div className="form-field">
            <label>Chọn hình ảnh góc máy:</label>
            <div className="preset-photos-row">
              {presetPhotos.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`preset-photo-thumb ${selectedPresetPhoto === idx ? "active" : ""}`}
                  onClick={() => setSelectedPresetPhoto(idx)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Ảnh mẫu ${idx + 1}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="form-field">
            <label>Gắn thẻ linh kiện có sẵn tại PC Store:</label>
            <div className="component-multi-select">
              {products.map((p) => {
                const selected = selectedComponentSlugs.includes(p.slug);
                return (
                  <button
                    key={p.slug}
                    type="button"
                    className={`component-select-pill ${selected ? "selected" : ""}`}
                    onClick={() => toggleComponentSelect(p.slug)}
                  >
                    {selected && <Check size={12} />} {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="setupDesc">Câu chuyện góc máy & Bí quyết giấu dây *</label>
            <textarea
              id="setupDesc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Chia sẻ về ý tưởng setup, cách giấu dây, đèn nền hoặc cảm nhận hiệu năng..."
              required
            />
          </div>

          <div className="share-modal-actions">
            <button
              type="button"
              className="button button-outline"
              onClick={onClose}
            >
              Hủy
            </button>
            <button type="submit" className="button button-primary">
              Đăng góc máy ngay
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

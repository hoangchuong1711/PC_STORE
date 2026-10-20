"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  Share2,
  Camera,
  Sparkles,
  Search,
  SlidersHorizontal,
  ShoppingCart,
  Check,
  X,
  ArrowRight,
  Upload,
  Loader2,
} from "lucide-react";
import {
  mediaApi,
  MediaApiError,
  MAX_IMAGE_SIZE_BYTES,
} from "../lib/media-api";
import {
  communityApi,
  CommunityApiError,
} from "../lib/community-api";
import {
  CommunityPost,
  formatTimeAgo,
  setupDtoToCommunityPost,
} from "../lib/community";
import { catalogApi } from "../lib/catalog-api";
import {
  addAvailableCommunityComponents,
  prepareCommunityComponents,
  resolveCommunityComponents,
  type CatalogPostComponent,
} from "../lib/community-catalog";
import { formatPrice } from "../lib/products";
import { useCart } from "./cart-provider";
import { useToast } from "./toast";
import { Header, Footer } from "./storefront";

export function CommunityFeed() {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<"newest" | "likes">("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [postsVersion, setPostsVersion] = useState(0);
  const [livePosts, setLivePosts] = useState<CommunityPost[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [feedError, setFeedError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    async function loadSetups() {
      setIsLoadingLive(true);
      try {
        const [rankingItems, feedItems] = await Promise.all([
          communityApi.ranking(0, 50),
          communityApi.feed(0, 50),
        ]);

        if (cancelled) return;

        const rankMap = new Map<number, { likeCount: number; liked: boolean }>();
        rankingItems.forEach((r) => {
          rankMap.set(r.post.postId, { likeCount: r.likeCount, liked: r.liked });
        });

        const seenIds = new Set<number>();
        const combined: CommunityPost[] = [];

        rankingItems.forEach((item) => {
          if (!seenIds.has(item.post.postId)) {
            seenIds.add(item.post.postId);
            combined.push(
              setupDtoToCommunityPost(item.post, {
                likeCount: item.likeCount,
                liked: item.liked,
              })
            );
          }
        });

        feedItems.forEach((post) => {
          if (!seenIds.has(post.postId)) {
            seenIds.add(post.postId);
            const rank = rankMap.get(post.postId);
            combined.push(setupDtoToCommunityPost(post, rank));
          }
        });

        setLivePosts(combined);
        setFeedError("");
      } catch (err) {
        if (!cancelled) setFeedError(err instanceof Error ? err.message : "Không thể tải bài đăng.");
      } finally {
        if (!cancelled) setIsLoadingLive(false);
      }
    }

    loadSetups();
    return () => {
      cancelled = true;
    };
  }, [postsVersion]);

  const posts = useMemo(() => {
    const filteredLive = livePosts.filter((post) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = post.title.toLowerCase().includes(q);
        const matchesAuthor = post.author.name.toLowerCase().includes(q);
        const matchesDesc = post.description.toLowerCase().includes(q);
        if (!matchesTitle && !matchesAuthor && !matchesDesc) return false;
      }
      return true;
    });

    const sortedLive = [...filteredLive].sort((a, b) => {
      if (sortBy === "likes") return b.likesCount - a.likesCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sortedLive;
  }, [sortBy, searchQuery, livePosts]);

  const featured = livePosts[0];

  const handleToggleLike = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const numericId = parseInt(id, 10);
    if (!isNaN(numericId) && numericId > 0) {
      const current = livePosts.find((p) => p.id === id);
      try {
        const res = current?.isLiked
          ? await communityApi.unlike(numericId)
          : await communityApi.like(numericId);
        setLivePosts((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, likesCount: res.likeCount, isLiked: res.liked } : p
          )
        );
        if (res.liked) {
          toast("Đã thêm vào danh sách góc máy yêu thích!", "success");
        } else {
          toast("Đã bỏ yêu thích góc máy.", "info");
        }
      } catch (err) {
        if (err instanceof CommunityApiError && err.status === 401) {
          toast("Vui lòng đăng nhập tài khoản để thích bài viết.", "info");
          router.push("/auth/login?redirect=/community");
        } else {
          toast(err instanceof Error ? err.message : "Không thể thích bài viết lúc này.", "error");
        }
      }
      return;
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
          <section className="bg-white border border-[#e0e0e0] rounded-3xl overflow-hidden mb-12 shadow-sm" aria-label="Bài đăng mới nhất">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              <div className="relative min-h-[320px] max-h-[460px] overflow-hidden bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={featured.coverImage} alt={featured.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-8 md:p-10 flex flex-col justify-center">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full mb-3 w-max">
                  <Sparkles size={14} /> Bài đăng mới nhất
                </div>
                <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-ink mb-3 tracking-tight">
                  {featured.title}
                </h2>
                <p className="text-sm md:text-base text-muted leading-relaxed mb-6">{featured.description}</p>

                <div className="flex items-center gap-3 mb-6">
                  <span className="w-11 h-11 rounded-full grid place-items-center bg-slate-100 border border-[#e0e0e0] font-bold" aria-hidden="true">{featured.author.name.charAt(0)}</span>
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
                onChange={(e) => setSortBy(e.target.value as "newest" | "likes")}
                aria-label="Sắp xếp danh sách góc máy"
                className="p-2 px-3 border border-[#e0e0e0] rounded-xl bg-white text-xs md:text-sm text-ink outline-none"
              >
                <option value="newest">Mới đăng gần đây</option>
                <option value="likes">Được yêu thích nhất</option>
              </select>
            </div>
          </div>
        </section>

        {/* Setups Grid */}
        {isLoadingLive && <p role="status" className="mb-5 text-muted">Đang tải bài đăng...</p>}
        {feedError && <p role="alert" className="mb-5 text-rose-700">{feedError}</p>}
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
                    <span className="w-6 h-6 rounded-full grid place-items-center bg-slate-100 font-bold" aria-hidden="true">{post.author.name.charAt(0)}</span>
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
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="col-span-full text-center py-16 px-6 bg-white border border-[#e0e0e0] rounded-2xl">
              <h3 className="text-lg font-bold text-ink mb-2">Không tìm thấy góc máy nào</h3>
              <p className="text-sm text-muted mb-4">Thử tìm với từ khóa khác.</p>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-ink border border-[#e0e0e0] hover:border-slate-400 bg-white transition-colors cursor-pointer"
                onClick={() => {
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
  const router = useRouter();
  const [post, setPost] = useState<CommunityPost>(initialPost);
  const [catalogComponents, setCatalogComponents] = useState<CatalogPostComponent[]>(
    () => prepareCommunityComponents(initialPost.components),
  );
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [addingProductId, setAddingProductId] = useState<number | null>(null);
  const [isAddingAll, setIsAddingAll] = useState(false);
  const { add } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    void resolveCommunityComponents(initialPost.components, catalogApi).then(
      (components) => {
        if (active) setCatalogComponents(components);
      },
    );
    return () => {
      active = false;
    };
  }, [initialPost.components]);

  const handleToggleLike = async () => {
    const numericId = parseInt(post.id, 10);
    if (!isNaN(numericId) && numericId > 0) {
      try {
        const res = post.isLiked
          ? await communityApi.unlike(numericId)
          : await communityApi.like(numericId);
        setPost((prev) => ({
          ...prev,
          likesCount: res.likeCount,
          isLiked: res.liked,
        }));
        if (res.liked) {
          toast("Đã thêm vào danh sách góc máy yêu thích!", "success");
        } else {
          toast("Đã bỏ yêu thích góc máy.", "info");
        }
      } catch (err) {
        if (err instanceof CommunityApiError && err.status === 401) {
          toast("Vui lòng đăng nhập tài khoản để thích bài viết.", "info");
          router.push(`/auth/login?redirect=/community/${post.id}`);
        } else {
          toast(err instanceof Error ? err.message : "Không thể cập nhật lượt thích.", "error");
        }
      }
      return;
    }

  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast("Đã sao chép liên kết góc máy vào bộ nhớ tạm!", "info");
    }
  };

  const handleAddToCart = async (component: CatalogPostComponent) => {
    if (component.catalogState !== "available" || !component.productId) return;
    setAddingProductId(component.productId);
    try {
      await add(component.productId, 1);
      toast(`Đã thêm "${component.name}" vào giỏ hàng!`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Không thể thêm sản phẩm vào giỏ hàng.", "error");
    } finally {
      setAddingProductId(null);
    }
  };

  const handleAddAllComponents = async () => {
    setIsAddingAll(true);
    try {
      const result = await addAvailableCommunityComponents(catalogComponents, add);
      if (result.added > 0 && result.failed === 0) {
        toast(`Đã thêm ${result.added} linh kiện có trong catalog vào giỏ hàng!`, "success");
      } else if (result.added > 0) {
        toast(
          `Đã thêm ${result.added} linh kiện; ${result.failed} linh kiện không thể thêm.`,
          "info",
        );
      } else if (result.failed > 0) {
        toast("Không thể thêm các linh kiện vào giỏ hàng lúc này.", "error");
      } else {
        toast("Không có linh kiện nào đang bán và còn hàng trong catalog.", "info");
      }
    } finally {
      setIsAddingAll(false);
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
              <span className="w-11 h-11 rounded-full grid place-items-center bg-slate-100 border border-[#e0e0e0] font-bold" aria-hidden="true">{post.author.name.charAt(0)}</span>
              <div className="text-xs md:text-sm">
                <strong className="block text-ink">{post.author.name}</strong>
                <span className="text-muted">
                  {post.author.role} · Đăng {formatTimeAgo(post.createdAt)}
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

            {/* Author Story */}
            <section className="bg-white border border-[#e0e0e0] rounded-2xl p-6 md:p-7">
              <h2 className="font-heading text-lg font-bold text-ink m-0 mb-3">Câu chuyện & Kinh nghiệm bố trí</h2>
              <p className="text-sm md:text-base leading-relaxed text-slate-700 m-0">{post.description}</p>
            </section>

          </div>

          {/* Right Column: Sticky Tagged Components */}
          <aside className="lg:sticky lg:top-24">
            <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#e0e0e0]">
                <h3 className="m-0 text-base font-bold text-ink">Linh kiện trong góc máy</h3>
                <span className="text-xs font-semibold text-muted bg-slate-100 px-2.5 py-1 rounded-full">
                  {catalogComponents.length} sản phẩm
                </span>
              </div>

              <div className="flex flex-col gap-3 mb-5 max-h-[460px] overflow-y-auto">
                {catalogComponents.map((comp) => (
                  <div key={comp.productId ?? `${comp.name}-${comp.category}`} className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase text-muted block mb-0.5">{comp.category}</span>
                      {comp.productId ? (
                        <Link
                          href={`/products/${comp.productId}`}
                          className="text-xs md:text-sm font-bold text-ink hover:text-[#006ce1] block truncate"
                        >
                          {comp.name}
                        </Link>
                      ) : (
                        <strong className="text-xs md:text-sm font-bold text-ink block truncate">{comp.name}</strong>
                      )}
                      {comp.catalogState === "loading" ? (
                        <p className="m-0 text-[11px] text-muted truncate">Đang kiểm tra catalog…</p>
                      ) : comp.catalogState === "unavailable" ? (
                        <p className="m-0 text-[11px] text-amber-700 truncate">Không có trong catalog hiện tại</p>
                      ) : comp.catalogState === "out-of-stock" ? (
                        <p className="m-0 text-[11px] text-rose-600 truncate">Tạm hết hàng</p>
                      ) : comp.specsSummary ? (
                        <p className="m-0 text-[11px] text-muted truncate">{comp.specsSummary}</p>
                      ) : null}
                    </div>
                    {comp.price !== undefined && (
                      <div className="text-xs md:text-sm font-specs font-bold text-ink shrink-0">
                        {formatPrice(comp.price)}
                      </div>
                    )}
                    {comp.productId && (
                      <button
                        type="button"
                        className="w-8 h-8 rounded-lg bg-white hover:bg-[#006ce1] hover:text-white border border-slate-200 grid place-items-center text-slate-700 transition-colors cursor-pointer shrink-0"
                        onClick={() => void handleAddToCart(comp)}
                        disabled={
                          comp.catalogState !== "available" ||
                          addingProductId === comp.productId ||
                          isAddingAll
                        }
                        aria-label={`Thêm ${comp.name} vào giỏ`}
                        title={comp.catalogState === "available" ? "Thêm vào giỏ hàng" : "Sản phẩm tạm hết hàng"}
                      >
                        {addingProductId === comp.productId ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 p-3 font-semibold text-sm rounded-xl text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm cursor-pointer border-none"
                onClick={() => void handleAddAllComponents()}
                disabled={
                  isAddingAll ||
                  !catalogComponents.some((component) => component.catalogState === "available")
                }
              >
                {isAddingAll ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />} Thêm cả bộ vào giỏ hàng
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
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [uploadedImages, setUploadedImages] = useState<
    Array<{ mediaId: string; previewUrl: string; name: string }>
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");

  const [eligibility, setEligibility] = useState<{
    checked: boolean;
    eligible: boolean;
    reason: string | null;
  }>({ checked: false, eligible: true, reason: null });

  const [availableProducts, setAvailableProducts] = useState<
    Array<{ productId: number; name: string; price: number; category?: string }>
  >([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    // Check customer eligibility
    communityApi
      .checkEligibility()
      .then((res) => {
        setEligibility({ checked: true, eligible: res.eligible, reason: res.reason });
      })
      .catch((err) => {
        if (err instanceof CommunityApiError && err.status === 401) {
          setEligibility({ checked: true, eligible: false, reason: "UNAUTHORIZED" });
        } else {
          setEligibility({ checked: true, eligible: true, reason: null });
        }
      });

    // Load available products for tagging
    fetch("/api/products?size=50")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const items = Array.isArray(data) ? data : data.items || [];
        const mapped = items.map((p: { productId: number; name: string; price?: number; category?: { name?: string } }) => ({
          productId: p.productId,
          name: p.name,
          price: p.price,
          category: p.category?.name || "Linh kiện",
        }));
        setAvailableProducts(mapped);
        if (mapped.length > 0) {
          setSelectedProductIds((prev) => (prev.length === 0 ? [mapped[0].productId] : prev));
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = "";

    if (uploadedImages.length + files.length > 8) {
      toast("Bài viết góc máy chỉ được đính kèm tối đa 8 ảnh.", "error");
      return;
    }

    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast(`Ảnh "${file.name}" vượt quá dung lượng tối đa 8 MB.`, "error");
        continue;
      }

      setUploadMessage(`Đang tải ảnh "${file.name}" (${i + 1}/${files.length})...`);
      try {
        const res = await mediaApi.uploadImage(file, "SETUP");
        const previewUrl = URL.createObjectURL(file);
        setUploadedImages((prev) => [
          ...prev,
          { mediaId: res.mediaId, previewUrl, name: file.name },
        ]);
        successCount++;
      } catch (err) {
        if (err instanceof MediaApiError) {
          if (err.status === 502 || err.code === "MEDIA_STORAGE_UNAVAILABLE") {
            toast(
              "Máy chủ lưu trữ ảnh chưa sẵn sàng. Vui lòng thử tải ảnh lên sau.",
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
      toast(`Đã tải lên ${successCount} ảnh thực tế thành công!`, "success");
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleProductSelect = (productId: number) => {
    if (selectedProductIds.includes(productId)) {
      setSelectedProductIds(selectedProductIds.filter((id) => id !== productId));
    } else {
      setSelectedProductIds([...selectedProductIds, productId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast("Vui lòng nhập đầy đủ tiêu đề và câu chuyện góc máy.", "error");
      return;
    }

    if (uploadedImages.length === 0) {
      toast(
        "Vui lòng tải lên ít nhất 1 ảnh chụp góc máy thực tế của bạn (tối đa 8 ảnh).",
        "error"
      );
      return;
    }

    if (selectedProductIds.length === 0) {
      toast("Vui lòng chọn ít nhất 1 sản phẩm / linh kiện trong góc máy.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await communityApi.create({
        title: title.trim(),
        description: description.trim(),
        mediaIds: uploadedImages.map((img) => img.mediaId),
        productIds: selectedProductIds,
      });

      toast("Góc máy của bạn đã được đăng tải thành công!", "success");
      onSuccess?.();
      onClose();
      // Chuyển hướng ngay đến trang chi tiết góc máy vừa tạo
      router.push(`/community/${created.postId}`);
    } catch (err) {
      if (err instanceof CommunityApiError) {
        if (err.status === 401) {
          toast("Bạn cần đăng nhập tài khoản khách hàng để chia sẻ góc máy.", "error");
          router.push("/auth/login?redirect=/community");
        } else if (err.code === "SETUP_PURCHASE_REQUIRED" || err.status === 403) {
          toast(
            "Chính sách PC Store: Bạn cần có ít nhất 1 đơn hàng đã giao thành công (DELIVERED) để đăng bài.",
            "error"
          );
        } else {
          toast(err.message, "error");
        }
      } else {
        toast(err instanceof Error ? err.message : "Đăng bài thất bại.", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
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

        {eligibility.checked && !eligibility.eligible && (
          <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between gap-3">
            {eligibility.reason === "UNAUTHORIZED" ? (
              <>
                <span>Bạn cần đăng nhập tài khoản khách hàng để chia sẻ góc máy.</span>
                <Link
                  href="/auth/login"
                  className="font-bold underline text-amber-950 shrink-0"
                >
                  Đăng nhập ngay
                </Link>
              </>
            ) : (
              <span>
                <strong>Chính sách cộng đồng:</strong> Bạn cần có ít nhất 1 đơn hàng đã giao thành công (DELIVERED) tại PC Store để đăng bài góc máy.
              </span>
            )}
          </div>
        )}

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

          {/* Real Media Upload Section */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-ink">
                Hình ảnh thực tế góc máy (tải lên 1–8 ảnh chất lượng cao):
              </label>
              <span className="text-[11px] text-muted font-medium">
                {uploadedImages.length}/8 ảnh
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/jpg"
              className="hidden"
              onChange={(e) => void handleFileSelect(e)}
            />

            {/* Custom Uploaded Images Preview */}
            <div className="flex gap-2.5 flex-wrap items-center">
              {uploadedImages.map((img, idx) => (
                <div
                  key={img.mediaId || idx}
                  className="relative w-22 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.previewUrl}
                    alt={img.name || `Ảnh góc máy ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 bg-[#006ce1] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                      Ảnh bìa
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 bg-slate-900/80 hover:bg-rose-600 text-white border-none rounded-full w-5 h-5 grid place-items-center cursor-pointer transition-colors"
                    aria-label="Xóa ảnh"
                    title="Xóa ảnh này"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {uploadedImages.length < 8 && (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-1 w-22 h-20 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-600 text-[11px] font-semibold hover:border-[#006ce1] hover:text-[#006ce1] hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-50"
                  aria-label="Chọn ảnh góc máy từ máy tính"
                >
                  {isUploading ? (
                    <Loader2 size={18} className="animate-spin text-[#006ce1]" />
                  ) : (
                    <Upload size={18} />
                  )}
                  <span>{isUploading ? "Đang tải..." : "Tải ảnh lên"}</span>
                </button>
              )}
            </div>

            {isUploading && uploadMessage && (
              <p className="text-xs text-blue-600 flex items-center gap-1.5 m-0 animate-pulse">
                <Loader2 size={13} className="animate-spin" /> {uploadMessage}
              </p>
            )}

          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-ink">Gắn thẻ linh kiện có sẵn tại PC Store *:</label>
              <span className="text-[11px] text-muted">
                Đã chọn: {selectedProductIds.length} sản phẩm
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
              {availableProducts.length > 0 ? (
                availableProducts.map((p) => {
                    const selected = selectedProductIds.includes(p.productId);
                    return (
                      <button
                        key={p.productId}
                        type="button"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors border ${
                          selected
                            ? "bg-[#006ce1] text-white border-[#006ce1]"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                        }`}
                        onClick={() => toggleProductSelect(p.productId)}
                      >
                        {selected && <Check size={12} />} {p.name}
                      </button>
                    );
                  })
              ) : (
                <p className="m-1 text-xs text-amber-700">
                  Không tải được catalog sản phẩm. Vui lòng thử lại sau; hệ thống sẽ không dùng ID sản phẩm mẫu.
                </p>
              )}
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
              disabled={isSubmitting || isUploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm cursor-pointer border-none disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Đang đăng góc máy...
                </>
              ) : (
                "Đăng góc máy ngay"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

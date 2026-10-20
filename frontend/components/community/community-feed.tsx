"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Camera, Sparkles, Search, SlidersHorizontal, ArrowRight } from "lucide-react";
import { communityApi, CommunityApiError } from "../../lib/community-api";
import { CommunityPost, formatTimeAgo, setupDtoToCommunityPost } from "../../lib/community";
import { useToast } from "../toast";
import { Header, Footer } from "../storefront";
import { CreateSetupModal } from "./create-setup-modal";

// /community → app/community/page.tsx → màn hình danh sách này.
// Nút Chia sẻ mở CreateSetupModal trong create-setup-modal.tsx.
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
    // Ghép danh sách công khai với ranking để mỗi bài có số like; lưu vào livePosts.
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

  // Tìm kiếm/sắp xếp trên dữ liệu đã tải; không phát sinh request mới.
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

  // Nút trái tim → communityApi.like/unlike → SetupSocialServlet; cập nhật bài từ response.
  async function handleToggleSetupLike(id: string, e: React.MouseEvent) {
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

  }

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
                    onClick={(e) => handleToggleSetupLike(featured.id, e)}
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
                    onClick={(e) => handleToggleSetupLike(post.id, e)}
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

        {/* Form đăng bài nằm ở create-setup-modal.tsx; onSuccess yêu cầu tải lại danh sách. */}
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

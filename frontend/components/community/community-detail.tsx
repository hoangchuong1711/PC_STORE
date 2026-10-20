"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Share2, ShoppingCart, Loader2 } from "lucide-react";
import { communityApi, CommunityApiError } from "../../lib/community-api";
import { CommunityPost, formatTimeAgo } from "../../lib/community";
import { catalogApi } from "../../lib/catalog-api";
import { addAvailableCommunityComponents, prepareCommunityComponents, resolveCommunityComponents, type CatalogPostComponent } from "../../lib/community-catalog";
import { formatPrice } from "../../lib/products";
import { useCart } from "../cart-provider";
import { useToast } from "../toast";
import { Header, Footer } from "../storefront";

// /community/[id] → page.tsx tải bài ở server → truyền vào prop post.
// Component này hiển thị bài và xử lý các nút thích, chia sẻ, thêm giỏ ở trình duyệt.
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

  // Nút trái tim → SetupSocialServlet.doPut/doDelete; response quyết định số like và trạng thái nút.
  async function handleToggleSetupLike() {
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

  }

  // Sao chép URL bài hiện tại; thao tác này không gọi API.
  function handleCopySetupLink() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast("Đã sao chép liên kết góc máy vào bộ nhớ tạm!", "info");
    }
  }

  // Nút thêm linh kiện → CartProvider.add → API giỏ hàng; chỉ dùng sản phẩm catalog hợp lệ.
  async function handleAddComponentToCart(component: CatalogPostComponent) {
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
  }

  // Thêm lần lượt các linh kiện còn bán vào giỏ và báo số sản phẩm thêm thành công.
  async function handleAddSetupToCart() {
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
  }

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
                onClick={handleToggleSetupLike}
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
                onClick={handleCopySetupLink}
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
                        onClick={() => void handleAddComponentToCart(comp)}
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
                onClick={() => void handleAddSetupToCart()}
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

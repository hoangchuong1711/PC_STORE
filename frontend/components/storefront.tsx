"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "./cart-provider";
import { useAuth } from "./auth-provider";
import { useToast } from "./toast";
import { QuickSearch } from "./quick-search";
import { ProductReviewsSection } from "./reviews";
import { ProductGalleryZoom } from "./product-gallery-zoom";
import { useMemo, useState, useEffect, useCallback, useRef, type ComponentType } from "react";
import {
  formatPrice,
  Product,
} from "../lib/products";
import {
  catalogApi,
  type CatalogProduct,
  type CatalogCategoryOption,
  type CatalogBrandOption,
} from "../lib/catalog-api";
import { parseServerProductId } from "../lib/cart";
import {
  Search,
  ShoppingCart,
  User,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  Grid3X3,
  List,
  SlidersHorizontal,
  X,
  Loader2,
  AlertCircle,
  Filter,
  ArrowUp,
  ArrowDown,
  Check,
  Cpu,
  CircuitBoard,
  MemoryStick,
  HardDrive,
  Fan,
  PcCase,
  Zap,
} from "lucide-react";

function GraphicsCardIllustration() {
  return (
    <svg viewBox="0 0 180 120" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="14" y="22" width="148" height="76" rx="11" />
      <circle cx="62" cy="60" r="23" />
      <circle cx="62" cy="60" r="7" />
      <circle cx="119" cy="60" r="23" />
      <circle cx="119" cy="60" r="7" />
      <path d="M35 98v10h104V98M162 43h10v36h-10" />
    </svg>
  );
}

const hardwareCategories: ReadonlyArray<{
  type: string;
  title: string;
  detail: string;
  image: string;
  icon: ComponentType<{ strokeWidth?: number }>;
  area: string;
}> = [
  {
    type: "GPU",
    title: "Card đồ họa",
    detail: "Cho từng khung hình sắc nét",
    image: "https://cdn.hstatic.net/products/200000722513/gearvn-card-man-hinh-msi-geforce-rtx-5060-ventus-2x-oc-8gb-1_e9b39ab2208346618f66951c5bab8bf0.png",
    icon: GraphicsCardIllustration,
    area: "gpu",
  },
  {
    type: "CPU",
    title: "Bộ vi xử lý",
    detail: "Trái tim của bộ máy",
    image: "https://product.hstatic.net/200000722513/product/gearvn-amd-ryzen-7-7700-1_b5fe209e78084b978058d105a7c29ff3_3e536376e6fb40228a3455582b7c5756.png",
    icon: Cpu,
    area: "cpu",
  },
  {
    type: "RAM",
    title: "Bộ nhớ RAM",
    detail: "Chuyển tác vụ mượt mà",
    image: "https://cdn.hstatic.net/products/200000722513/earvn-ram-corsair-vengeance-lpx-16gb-3200mhz-ddr4-cmk16gx4m1e3200c16-1_c13698bde1ce4ba7946fdbbe32cf7fd4.png",
    icon: MemoryStick,
    area: "ram",
  },
  {
    type: "MOTHERBOARD",
    title: "Bo mạch chủ",
    detail: "Kết nối mọi linh kiện",
    image: "https://cdn.hstatic.net/products/200000722513/gearvn-bo-mach-chu-msi-b550m-pro-vdh-1_416082a228c34dd59315f8f75ee30c4b.png",
    icon: CircuitBoard,
    area: "motherboard",
  },
  {
    type: "STORAGE",
    title: "Ổ cứng",
    detail: "Không gian cho mọi dữ liệu",
    image: "https://cdn.hstatic.net/products/200000722513/gearvn-o-cung-ssd-samsung-990-pro-1tb-pcie-gen4-nvme-mz-v9p1t0bw-1_fbe51100e12d46e48c54086f36c81669.png",
    icon: HardDrive,
    area: "storage",
  },
  {
    type: "PSU",
    title: "Nguồn máy tính",
    detail: "Năng lượng ổn định",
    image: "https://product.hstatic.net/200000722513/product/1024_0920b4ad0bce4347aec42163de5ee9d6.png",
    icon: Zap,
    area: "psu",
  },
  {
    type: "COOLER",
    title: "Tản nhiệt",
    detail: "Giữ hiệu năng bền bỉ",
    image: "https://product.hstatic.net/200000722513/product/ak620zerodark04_e30359ec525d41a4bba1d388f1bb0a7a.png",
    icon: Fan,
    area: "cooler",
  },
  {
    type: "CASE",
    title: "Vỏ máy",
    detail: "Định hình góc máy",
    image: "https://product.hstatic.net/200000722513/product/3500x_blk_01_1f55ef1bec404d95be8d62810eb42ac0.png",
    icon: PcCase,
    area: "case",
  },
];

const homeBanners = [
  {
    title: "Ráp PC theo cách của bạn.",
    description: "Chọn từng linh kiện và kiểm tra tương thích trước khi thêm cả cấu hình vào giỏ.",
    action: "Bắt đầu ráp PC",
    href: "/builder",
    image: "/banners/pc-builder.webp",
  },
  {
    title: "Sức mạnh cho từng khung hình.",
    description: "Khám phá card đồ họa và các linh kiện phù hợp với bộ máy bạn muốn xây dựng.",
    action: "Xem linh kiện",
    href: "/products",
    image: "/banners/graphics-card.webp",
  },
  {
    title: "Một góc máy mang dấu ấn riêng.",
    description: "Xem cách cộng đồng phối hợp linh kiện, không gian và phong cách của họ.",
    action: "Khám phá góc máy",
    href: "/community",
    image: "/banners/setup.webp",
  },
] as const;

export function Header() {
  const { user, loading, error: sessionError, logout } = useAuth();
  const [logoutError, setLogoutError] = useState("");
  const router = useRouter();
  async function handleLogout() {
    try { await logout(); setLogoutError(""); router.replace("/auth/login"); }
    catch (cause) { setLogoutError((cause as Error).message); }
  }
  const { items, openCart } = useCart();
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  return (
    <>
      <header className="site-header">
        <div className="container header-row">
          <Link href="/" className="brand-mark">
            <span className="brand-square">P</span>
            <span>
              PC<span className="brand-accent">STORE</span>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Điều hướng chính">
            <Link href="/products">Sản phẩm</Link>
            <Link href="/builder" className="nav-builder-link">
              Tự ráp PC <span className="nav-hot-pill">Hot</span>
            </Link>
            <Link href="/community">Góc máy</Link>
            <Link href="/#categories">Danh mục</Link>
            <Link href="/#services">Dịch vụ</Link>
          </nav>
          <div className="header-actions">
            <button
              type="button"
              className="search-pill"
              onClick={() => setSearchOpen(true)}
              aria-label="Tìm kiếm linh kiện"
            >
              <Search size={16} />
              <span>Tìm linh kiện, laptop...</span>
              <kbd className="search-kbd">⌘K</kbd>
            </button>

            <div className="user-dropdown-wrapper">
              <button
                type="button"
                className="icon-button user-avatar-btn"
                aria-label="Tài khoản cá nhân"
                onClick={() => setUserDropdown(!userDropdown)}
              >
                <User size={19} />
              </button>
              {userDropdown && (
                <div
                  className="user-menu-dropdown"
                  onClick={() => setUserDropdown(false)}
                >
                  <div className="user-menu-header">
                    <strong>{loading ? "Đang kiểm tra phiên…" : user?.fullName ?? "Khách"}</strong>
                    <small>{user?.email ?? "Chưa đăng nhập"}</small>
                  </div>
                  <div className="user-menu-divider" />
                  {user ? (
                    <>
                      {user.role === "ADMIN" && (
                        <Link href="/admin" className="user-menu-item">
                          Quản trị cửa hàng
                        </Link>
                      )}
                      <Link href="/account" className="user-menu-item">
                        Hồ sơ tài khoản
                      </Link>
                      <Link href="/orders" className="user-menu-item">
                        Đơn hàng của tôi
                      </Link>
                      <Link href="/builder" className="user-menu-item">
                        Cấu hình PC đã lưu
                      </Link>
                      <Link href="/community" className="user-menu-item">
                        Góc máy của tôi
                      </Link>
                      <div className="user-menu-divider" />
                      <Link href="/auth/login" className="user-menu-item text-muted">
                        Chuyển tài khoản khác
                      </Link>
                      <button
                        type="button"
                        className="user-menu-item text-muted w-full text-left bg-transparent border-none cursor-pointer"
                        onClick={() => void handleLogout()}
                      >
                        Đăng xuất
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/auth/login"
                        className="user-menu-item font-semibold text-[#006ce1]"
                      >
                        Đăng nhập
                      </Link>
                      <Link
                        href="/auth/register"
                        className="user-menu-item text-muted"
                      >
                        Đăng ký tài khoản mới
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className="cart-button"
              aria-label={`Giỏ hàng, ${count} sản phẩm`}
              onClick={openCart}
            >
              <ShoppingCart size={16} />
              <span>Giỏ hàng</span>
              <b>{count}</b>
            </button>

            <button
              className="menu-button"
              aria-label="Mở menu di động"
              onClick={() => setOpen(!open)}
            >
              ☰
            </button>
          </div>
        </div>

        {open && (
          <nav className="mobile-nav" aria-label="Menu di động">
            <Link href="/products" onClick={() => setOpen(false)}>
              Tất cả sản phẩm
            </Link>
            <Link href="/builder" onClick={() => setOpen(false)}>
              Tự ráp PC (Builder)
            </Link>
            <Link href="/community" onClick={() => setOpen(false)}>
              Góc máy cộng đồng
            </Link>
            <Link href="/#categories" onClick={() => setOpen(false)}>
              Danh mục
            </Link>
            {user ? (
              <>
                <Link href="/account" onClick={() => setOpen(false)}>
                  Tài khoản của tôi
                </Link>
                <Link href="/orders" onClick={() => setOpen(false)}>
                  Đơn hàng của tôi
                </Link>
                <button
                  type="button"
                  className="text-left bg-transparent border-none p-0 text-inherit font-inherit cursor-pointer"
                  onClick={() => {
                    setOpen(false);
                    void handleLogout();
                  }}
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link href="/auth/login" onClick={() => setOpen(false)}>
                Đăng nhập / Đăng ký
              </Link>
            )}
          </nav>
        )}
      </header>
      {(logoutError || sessionError) && <p role="alert">{logoutError || sessionError}</p>}

      <QuickSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link href="/" className="brand-mark">
            <span className="brand-square">P</span>
            <span>
              PC<span className="brand-accent">STORE</span>
            </span>
          </Link>
          <p>
            Chuyên cung cấp linh kiện máy tính, PC Gaming và Laptop chính hãng
            với hiệu năng đỉnh cao.
          </p>
          <div className="footer-badges">
            <span>✓ 100% Chính hãng</span>
            <span>✓ Bảo hành tận nơi</span>
          </div>
        </div>
        <div>
          <strong>Mua sắm</strong>
          <Link href="/products">Tất cả sản phẩm</Link>
          <Link href="/builder">Công cụ PC Builder</Link>
          <Link href="/community">Góc máy cộng đồng</Link>
          <Link href="/products?category=Laptop">Laptop Gaming</Link>
          <Link href="/products?category=Linh%20kiện">Linh kiện cao cấp</Link>
        </div>
        <div>
          <strong>Chính sách & Hỗ trợ</strong>
          <Link href="/orders">Kiểm tra đơn hàng</Link>
          <span>Chính sách bảo hành 36T</span>
          <span>Chính sách đổi trả 30 ngày</span>
          <span>Hình thức thanh toán VietQR & COD</span>
        </div>
        <div>
          <strong>Liên hệ & Địa chỉ</strong>
          <span>hello@pcstore.vn</span>
          <strong className="footer-hotline">1900 6868 (8:00 - 21:00)</strong>
          <span>24 Nguyễn Văn Linh, Q. Hải Châu, TP. Đà Nẵng</span>
          <span>Showroom mở cửa tất cả các ngày trong tuần</span>
        </div>
      </div>
      <div className="container footer-bottom">
        <div className="footer-bottom-flex">
          <span>© 2026 PC Store Vietnam · Nền tảng linh kiện máy tính thế hệ mới</span>
          <div className="footer-payment-icons">
            <span className="payment-pill">VietQR</span>
            <span className="payment-pill">COD</span>
            <span className="payment-pill">Chuyển khoản 24/7</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function isProductImageSource(source: string | undefined): source is string {
  return Boolean(source && /^(https?:\/\/|\/(?!\/))/.test(source));
}

function ProductVisual({
  product,
  large = false,
  imageIndex = 0,
}: {
  product: Product;
  large?: boolean;
  imageIndex?: number;
}) {
  const source = product.images?.[imageIndex];
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const showImage = isProductImageSource(source) && source !== failedSource;

  return (
    <div
      className={`product-visual ${large ? "product-visual-large" : ""} ${showImage ? "product-visual-has-image" : ""}`}
      style={{ "--product-accent": product.accent } as React.CSSProperties}
    >
      {showImage ? (
        <Image
          key={source}
          src={source}
          alt={product.name}
          fill
          unoptimized
          sizes={large ? "(max-width: 900px) 100vw, 50vw" : "(max-width: 768px) 100vw, 33vw"}
          className="product-photo"
          onError={() => setFailedSource(source)}
        />
      ) : (
        <>
          <span className="visual-orbit" />
          <span className="visual-label">{product.category}</span>
          <span className="visual-letter">{product.name.slice(0, 1)}</span>
          <span className="visual-brand">{product.brand}</span>
        </>
      )}
    </div>
  );
}

export type ProductInput = Product | CatalogProduct;

export function toProductCardModel(item: ProductInput): Product {
  if ("productId" in item) {
    const brandName = item.brand?.name ?? "PC Store";
    const catName = item.category?.name ?? "Linh kiện";
    return {
      id: String(item.productId),
      slug: String(item.productId),
      name: item.name,
      brand: brandName,
      category: catName,
      price: item.price,
      stock: item.availableQuantity,
      description: item.description ?? "",
      specs: {
        "Hãng": brandName,
        "Danh mục": catName,
      },
      accent: brandName === "AMD" ? "#ed1c24" : brandName === "NVIDIA" ? "#76b900" : "#00539b",
      badge: item.inStock ? undefined : "Hết hàng",
      featured: false,
      images: item.imageUrls.length ? item.imageUrls : ["Góc nhìn chính"],
    };
  }
  return item;
}

export function ProductCard({ product }: { product: ProductInput }) {
  const router = useRouter();
  const { user } = useAuth();
  const { add } = useCart();
  const { toast } = useToast();
  const item = toProductCardModel(product);
  const productId = "productId" in product
    ? product.productId
    : parseServerProductId(item.id);
  const canAddToServerCart = productId !== null && item.stock > 0;

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.", "info");
      const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
      router.push(`/auth/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }
    if (productId === null) {
      toast("Sản phẩm giới thiệu này chưa có trong catalog và không thể mua.", "info");
      return;
    }
    if (item.stock > 0) {
      try {
        await add(productId, 1);
        toast(`Đã thêm "${item.name}" vào giỏ hàng!`, "success");
      } catch (err) {
        toast(
          err instanceof Error ? err.message : "Không thể thêm vào giỏ hàng",
          "error",
        );
      }
    }
  };

  return (
    <article className="product-card">
      <Link href={`/products/${item.slug}`} className="product-card-link">
        <ProductVisual product={item} />
        <div className="product-card-body">
          <div className="product-meta">
            <span className="product-brand-tag">{item.brand}</span>
            {item.badge && (
              <span className="product-badge">{item.badge}</span>
            )}
          </div>
          <h3>{item.name}</h3>
          <p className="product-card-desc">{item.description}</p>

          <div className="product-card-specs">
            {Object.entries(item.specs)
              .slice(0, 2)
              .map(([k, v]) => (
                <span key={k} className="spec-tag">
                  {k}: {v}
                </span>
              ))}
          </div>

          <div className="product-price-row">
            <div className="product-price">
              <strong>{formatPrice(item.price)}</strong>
              {item.oldPrice && <del>{formatPrice(item.oldPrice)}</del>}
            </div>
            {item.rating && (
              <div className="product-card-rating">
                <Star size={13} fill="#f59e0b" color="#f59e0b" />
                <span>{item.rating}</span>
                <small>({item.reviewCount})</small>
              </div>
            )}
          </div>

          <div className="product-card-footer">
            <span className={!canAddToServerCart ? "stock out" : "stock"}>
              {productId === null
                ? "Chưa có trong catalog"
                : item.stock === 0
                ? "Tạm hết hàng"
                : `Còn ${item.stock} sản phẩm`}
            </span>
            <button
              type="button"
              className="quick-add-btn"
              disabled={!canAddToServerCart}
              onClick={handleQuickAdd}
              aria-label={`Thêm nhanh ${item.name}`}
            >
              + Giỏ
            </button>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function HomePage() {
  const [activeBanner, setActiveBanner] = useState(0);
  const [bannerPaused, setBannerPaused] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<CatalogProduct[]>([]);
  const [categoriesList, setCategoriesList] = useState<CatalogCategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const primaryCategories = hardwareCategories.flatMap((display) => {
    const category = categoriesList.find((item) => item.componentType?.toUpperCase() === display.type);
    return category ? [{ ...display, category }] : [];
  });
  const otherCategories = categoriesList.filter((category) =>
    !hardwareCategories.some((display) => display.type === category.componentType?.toUpperCase())
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [prodPage, cats] = await Promise.all([
        catalogApi.list({ size: 8 }),
        catalogApi.listCategories(),
      ]);
      setFeaturedProducts(prodPage.items);
      setCategoriesList(cats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu sản phẩm từ máy chủ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (bannerPaused) return;
    const timer = window.setInterval(() => setActiveBanner((current) => (current + 1) % homeBanners.length), 6000);
    return () => window.clearInterval(timer);
  }, [bannerPaused]);

  return (
    <>
      <Header />
      <main>
        <section className="home-banner" aria-label="Giới thiệu PC Store">
          {homeBanners.map((banner, index) => (
            <div className="home-banner-slide" aria-hidden={activeBanner !== index} key={banner.image} hidden={activeBanner !== index}>
              <Image src={banner.image} alt="" fill priority={index === 0} sizes="100vw" className="home-banner-image" />
              <div className="container home-banner-content">
                {index === 0 ? <h1>{banner.title}</h1> : <h2>{banner.title}</h2>}
                <p>{banner.description}</p>
                <Link className="button button-primary" href={banner.href} tabIndex={activeBanner === index ? undefined : -1}>
                  {banner.action} <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </div>
          ))}
          <div className="container home-banner-controls">
            <div className="home-banner-pagination" role="group" aria-label="Chọn banner">
              {homeBanners.map((banner, index) => (
                <button
                  type="button"
                  className={activeBanner === index ? "active" : ""}
                  aria-label={`Banner ${index + 1}: ${banner.title}`}
                  aria-current={activeBanner === index ? "true" : undefined}
                  onClick={() => setActiveBanner(index)}
                  key={banner.image}
                />
              ))}
            </div>
            <div className="home-banner-buttons">
              <button type="button" aria-label={bannerPaused ? "Tiếp tục tự chuyển banner" : "Tạm dừng tự chuyển banner"} onClick={() => setBannerPaused((paused) => !paused)}>
                {bannerPaused ? "▶" : "Ⅱ"}
              </button>
              <button type="button" aria-label="Banner trước" onClick={() => setActiveBanner((current) => (current + homeBanners.length - 1) % homeBanners.length)}>←</button>
              <button type="button" aria-label="Banner tiếp theo" onClick={() => setActiveBanner((current) => (current + 1) % homeBanners.length)}>→</button>
            </div>
          </div>
        </section>

        <section className="container section builder-preview-section" aria-labelledby="builder-preview-title">
          <div className="builder-teaser-banner">
            <div className="builder-teaser-copy">
              <h2 id="builder-preview-title">Ráp PC dễ hơn khi biết món nào hợp nhau.</h2>
              <p>
                Chọn linh kiện, xem cảnh báo tương thích, rồi hoàn tất cấu hình của bạn.
              </p>
              <Link href="/builder" className="button button-primary">
                Mở PC Builder <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="builder-preview" aria-label="Ví dụ cấu hình PC">
              <span className="builder-preview-caption">Cấu hình minh họa</span>
              <div className="builder-preview-parts">
                {["CPU", "MOTHERBOARD", "RAM", "GPU"].map((type) => {
                  const part = hardwareCategories.find((category) => category.type === type);
                  if (!part) return null;
                  return (
                    <div className="builder-preview-part" key={type}>
                      <span>{part.title}</span>
                      <Image src={part.image} alt="" width={170} height={150} unoptimized />
                    </div>
                  );
                })}
              </div>
              <div className="builder-preview-result">
                <span><Check size={17} aria-hidden="true" /> Socket khớp</span>
                <span><Check size={17} aria-hidden="true" /> Chuẩn RAM khớp</span>
              </div>
            </div>
          </div>
        </section>

        <section className="container section hardware-section" id="categories">
          <div className="section-heading hardware-heading">
            <div>
              <h2>Chọn mảnh ghép cho cấu hình của bạn.</h2>
              <p>Tìm linh kiện theo đúng phần bạn muốn nâng cấp.</p>
            </div>
            <Link className="text-link" href="/products">
              Xem tất cả danh mục ↗
            </Link>
          </div>
          <div className="hardware-grid">
            {primaryCategories.map(({ category, title, detail, image, icon: Icon, area }) => (
              <Link
                className={`hardware-card hardware-card--${area}`}
                href={`/products?categoryId=${category.categoryId}`}
                key={category.categoryId}
                style={{ gridArea: area }}
                aria-label={`Xem ${title}`}
              >
                <span className="hardware-card-art" aria-hidden="true">
                  {image ? (
                    <img
                      src={image}
                      alt={title}
                      className="hardware-card-img"
                      loading="lazy"
                    />
                  ) : (
                    <Icon strokeWidth={1.35} />
                  )}
                </span>
                <span className="hardware-card-copy">
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </span>
                <span className="hardware-card-arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
          {otherCategories.length > 0 && (
            <div className="hardware-more">
              <span>Khám phá thêm</span>
              {otherCategories.map((category) => (
                <Link href={`/products?categoryId=${category.categoryId}`} key={category.categoryId}>
                  {category.name} <span aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="container section featured-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Sản phẩm nổi bật từ máy chủ</span>
              <h2>Được lựa chọn nhiều nhất trong tuần.</h2>
            </div>
            <Link className="text-link" href="/products">
              Xem toàn bộ catalog ↗
            </Link>
          </div>

          {error ? (
            <div className="catalog-error-box" role="alert" style={{ padding: "1.5rem", background: "#fee2e2", color: "#b91c1c", borderRadius: "10px", margin: "1rem 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <AlertCircle size={22} />
                <span>{error}</span>
              </div>
              <button onClick={() => void loadData()} className="button button-outline" style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}>
                Thử tải lại
              </button>
            </div>
          ) : loading ? (
            <div className="product-grid" style={{ minHeight: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Loader2 size={32} className="animate-spin text-muted-foreground" />
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="product-grid">
              {featuredProducts.map((product) => (
                <ProductCard product={product} key={product.productId} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>Chưa có sản phẩm nào trên máy chủ.</p>
            </div>
          )}
        </section>

        <section className="container services section" id="services">
          <div>
            <span className="eyebrow">Dịch vụ tại PC Store</span>
            <h2>Từ ý tưởng đến góc máy hoàn chỉnh.</h2>
          </div>
          <div className="service-list">
            <div>
              <span>01</span>
              <strong>Tư vấn theo nhu cầu thực tế</strong>
              <p>Chọn cấu hình tối ưu chi phí dựa trên phần mềm bạn dùng mỗi ngày.</p>
            </div>
            <div>
              <span>02</span>
              <strong>Đóng gói & Kiểm định nghiêm ngặt</strong>
              <p>Stress test 24h và đóng gói xốp chống sốc 3 lớp trước khi rời kho.</p>
            </div>
            <div>
              <span>03</span>
              <strong>Bảo hành & Đồng hành dài lâu</strong>
              <p>Hỗ trợ kỹ thuật qua Ultraviewer, đổi mới linh kiện ngay tại nhà.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export function CatalogPage() {
  const [query, setQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "ALL">("ALL");
  const [selectedBrandId, setSelectedBrandId] = useState<number | "ALL">("ALL");
  const [priceRange, setPriceRange] = useState("ALL");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState("featured");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [categoriesList, setCategoriesList] = useState<CatalogCategoryOption[]>([]);
  const [brandsList, setBrandsList] = useState<CatalogBrandOption[]>([]);
  const [serverProducts, setServerProducts] = useState<CatalogProduct[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target as Node)
      ) {
        setSortDropdownOpen(false);
      }
    }
    if (sortDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [sortDropdownOpen]);

  const handleSelectSort = (value: string) => {
    const nextSort = sort === value ? "featured" : value;
    setSort(nextSort);
    setCurrentPage(1);
    setSortDropdownOpen(false);
  };

  // Load category and brand metadata from backend
  useEffect(() => {
    let active = true;
    async function loadMeta() {
      try {
        const [cats, brs] = await Promise.all([
          catalogApi.listCategories(),
          catalogApi.listBrands(),
        ]);
        if (active) {
          setCategoriesList(cats);
          setBrandsList(brs);
        }
      } catch {
        // Handled via product fetch
      }
    }
    void loadMeta();
    return () => {
      active = false;
    };
  }, []);

  // Sync initial filters from URL query parameters (e.g. /products?categoryId=123)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const catId = params.get("categoryId");
    const brId = params.get("brandId");
    const q = params.get("q");
    if (catId && !isNaN(Number(catId))) {
      setSelectedCategoryId(Number(catId));
    }
    if (brId && !isNaN(Number(brId))) {
      setSelectedBrandId(Number(brId));
    }
    if (q) {
      setQuery(q);
    }
  }, []);

  // Fetch products from backend whenever filters, sort or page change
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let minPrice: number | undefined;
      let maxPrice: number | undefined;
      if (priceRange === "UNDER_5M") {
        minPrice = 0;
        maxPrice = 5000000;
      } else if (priceRange === "5M_15M") {
        minPrice = 5000000;
        maxPrice = 15000000;
      } else if (priceRange === "15M_30M") {
        minPrice = 15000000;
        maxPrice = 30000000;
      } else if (priceRange === "OVER_30M") {
        minPrice = 30000000;
      }

      const res = await catalogApi.list({
        q: query.trim() || undefined,
        categoryId: selectedCategoryId !== "ALL" ? selectedCategoryId : undefined,
        brandId: selectedBrandId !== "ALL" ? selectedBrandId : undefined,
        minPrice,
        maxPrice,
        page: Math.max(0, currentPage - 1),
        size: itemsPerPage,
        sort: sort !== "featured" ? sort : undefined,
      });

      let items = res.items;
      if (inStockOnly) {
        items = items.filter((p) => p.inStock);
      }
      setServerProducts(items);
      setTotalPages(res.totalPages || 1);
      setTotalItems(res.totalItems || items.length);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh mục sản phẩm từ máy chủ. Vui lòng kiểm tra lại dịch vụ backend.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    query,
    selectedCategoryId,
    selectedBrandId,
    priceRange,
    inStockOnly,
    currentPage,
    sort,
  ]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  // Dữ liệu sản phẩm trả về từ Server đã được sắp xếp chính xác theo yêu cầu người dùng
  const displayedProducts = useMemo(() => {
    return serverProducts || [];
  }, [serverProducts]);

  const resetFilters = () => {
    setQuery("");
    setSelectedCategoryId("ALL");
    setSelectedBrandId("ALL");
    setPriceRange("ALL");
    setInStockOnly(false);
    setSort("featured");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(query) ||
    selectedCategoryId !== "ALL" ||
    selectedBrandId !== "ALL" ||
    priceRange !== "ALL" ||
    inStockOnly ||
    sort !== "featured";

  const currentCategoryName =
    selectedCategoryId === "ALL"
      ? null
      : categoriesList.find((c) => c.categoryId === selectedCategoryId)?.name;

  const currentBrandName =
    selectedBrandId === "ALL"
      ? null
      : brandsList.find((b) => b.brandId === selectedBrandId)?.name;

  return (
    <>
      <Header />
      <main className="catalog-page container">
        <div className="catalog-hero">
          <span className="eyebrow">
            Catalog linh kiện & máy tính chính hãng từ máy chủ
          </span>
          <h1>
            Chọn món tiếp theo
            <br />
            <em>cho góc máy của bạn.</em>
          </h1>
          <p>
            Duyệt qua danh mục phần cứng chọn lọc, thông số chính xác và giá niêm yết rõ ràng.
          </p>
        </div>

        {/* Catalog Main Layout with Sidebar */}
        <div className="catalog-layout">
          <aside className="catalog-sidebar" aria-label="Bộ lọc sản phẩm">
            <div className="sidebar-filter-header">
              <span className="sidebar-title">
                <SlidersHorizontal size={18} /> Bộ lọc
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="reset-filter-btn"
                  onClick={resetFilters}
                >
                  Xóa lọc
                </button>
              )}
            </div>

            {/* Filter by Category */}
            <div className="filter-group">
              <label className="filter-group-label">Danh mục</label>
              <div className="filter-chips">
                <button
                  type="button"
                  className={`filter-chip ${selectedCategoryId === "ALL" ? "active" : ""}`}
                  onClick={() => {
                    setSelectedCategoryId("ALL");
                    setCurrentPage(1);
                  }}
                >
                  Tất cả
                </button>
                {categoriesList.map((c) => (
                  <button
                    key={c.categoryId}
                    type="button"
                    className={`filter-chip ${selectedCategoryId === c.categoryId ? "active" : ""}`}
                    onClick={() => {
                      setSelectedCategoryId(c.categoryId);
                      setCurrentPage(1);
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter by Brand */}
            <div className="filter-group">
              <label className="filter-group-label">Thương hiệu</label>
              <select
                value={selectedBrandId === "ALL" ? "ALL" : String(selectedBrandId)}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedBrandId(val === "ALL" ? "ALL" : Number(val));
                  setCurrentPage(1);
                }}
                className="filter-select"
              >
                <option value="ALL">Tất cả thương hiệu</option>
                {brandsList.map((b) => (
                  <option key={b.brandId} value={String(b.brandId)}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Price Range */}
            <div className="filter-group">
              <label className="filter-group-label">Khoảng giá</label>
              <div className="price-radios">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="price"
                    checked={priceRange === "ALL"}
                    onChange={() => {
                      setPriceRange("ALL");
                      setCurrentPage(1);
                    }}
                  />
                  <span>Tất cả mức giá</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="price"
                    checked={priceRange === "UNDER_5M"}
                    onChange={() => {
                      setPriceRange("UNDER_5M");
                      setCurrentPage(1);
                    }}
                  />
                  <span>Dưới 5 triệu</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="price"
                    checked={priceRange === "5M_15M"}
                    onChange={() => {
                      setPriceRange("5M_15M");
                      setCurrentPage(1);
                    }}
                  />
                  <span>5 triệu — 15 triệu</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="price"
                    checked={priceRange === "15M_30M"}
                    onChange={() => {
                      setPriceRange("15M_30M");
                      setCurrentPage(1);
                    }}
                  />
                  <span>15 triệu — 30 triệu</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="price"
                    checked={priceRange === "OVER_30M"}
                    onChange={() => {
                      setPriceRange("OVER_30M");
                      setCurrentPage(1);
                    }}
                  />
                  <span>Trên 30 triệu</span>
                </label>
              </div>
            </div>

            {/* Filter In Stock */}
            <div className="filter-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => {
                    setInStockOnly(e.target.checked);
                    setCurrentPage(1);
                  }}
                />
                <span>Chỉ hiện sản phẩm còn hàng</span>
              </label>
            </div>
          </aside>

          {/* Catalog Main Content */}
          <div className="catalog-content">
            <div className="catalog-toolbar">
              <label className="search-field">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Lọc nhanh tên hoặc thông số..."
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="clear-query-btn"
                    aria-label="Xóa từ khóa"
                  >
                    <X size={15} />
                  </button>
                )}
              </label>

              <div className="toolbar-right-actions">
                <div className="sort-dropdown-wrapper" ref={sortDropdownRef}>
                  <button
                    type="button"
                    className={`catalog-sort-icon-btn ${sort !== "featured" ? "active" : ""} ${sortDropdownOpen ? "open" : ""}`}
                    onClick={() => setSortDropdownOpen((prev) => !prev)}
                    aria-label="Bộ lọc sắp xếp theo giá"
                    title={
                      sort === "price-low"
                        ? "Đang chọn: Giá thấp đến cao (nhấn để đổi hoặc đóng)"
                        : sort === "price-high"
                        ? "Đang chọn: Giá cao đến thấp (nhấn để đổi hoặc đóng)"
                        : "Lọc & sắp xếp theo giá"
                    }
                    aria-expanded={sortDropdownOpen}
                  >
                    <SlidersHorizontal size={17} />
                    {sort !== "featured" && <span className="sort-active-badge" />}
                  </button>

                  {sortDropdownOpen && (
                    <div className="sort-dropdown-menu" role="menu">
                      <div className="sort-menu-header">Sắp xếp theo giá</div>
                      <button
                        type="button"
                        className={`sort-menu-item ${sort === "price-low" ? "active" : ""}`}
                        onClick={() => handleSelectSort("price-low")}
                        role="menuitem"
                      >
                        <span className="sort-menu-item-left">
                          <ArrowUp size={15} />
                          <span>Giá: Thấp đến cao</span>
                        </span>
                        {sort === "price-low" && <Check size={14} />}
                      </button>
                      <button
                        type="button"
                        className={`sort-menu-item ${sort === "price-high" ? "active" : ""}`}
                        onClick={() => handleSelectSort("price-high")}
                        role="menuitem"
                      >
                        <span className="sort-menu-item-left">
                          <ArrowDown size={15} />
                          <span>Giá: Cao đến thấp</span>
                        </span>
                        {sort === "price-high" && <Check size={14} />}
                      </button>

                      <div className="sort-menu-divider" />

                      <button
                        type="button"
                        className={`sort-menu-item ${sort === "featured" ? "active" : ""}`}
                        onClick={() => handleSelectSort("featured")}
                        role="menuitem"
                      >
                        <span className="sort-menu-item-left">
                          <Star size={15} />
                          <span>Ưu tiên nổi bật (Mặc định)</span>
                        </span>
                        {sort === "featured" && <Check size={14} />}
                      </button>
                    </div>
                  )}
                </div>

                <div className="view-mode-toggle" role="group" aria-label="Chế độ xem">
                  <button
                    type="button"
                    className={`view-mode-btn ${viewMode === "grid" ? "active" : ""}`}
                    onClick={() => setViewMode("grid")}
                    aria-label="Xem dạng lưới"
                  >
                    <Grid3X3 size={17} />
                  </button>
                  <button
                    type="button"
                    className={`view-mode-btn ${viewMode === "list" ? "active" : ""}`}
                    onClick={() => setViewMode("list")}
                    aria-label="Xem dạng danh sách"
                  >
                    <List size={17} />
                  </button>
                </div>
              </div>
            </div>

            <div className="catalog-count-row">
              <span className="count-label">
                Tìm thấy <strong>{totalItems}</strong> sản phẩm từ máy chủ
              </span>
              {hasActiveFilters && (
                <div className="active-filter-tags">
                  {currentCategoryName && (
                    <span className="active-tag">
                      {currentCategoryName}
                      <button onClick={() => setSelectedCategoryId("ALL")}>
                        ×
                      </button>
                    </span>
                  )}
                  {currentBrandName && (
                    <span className="active-tag">
                      {currentBrandName}
                      <button onClick={() => setSelectedBrandId("ALL")}>
                        ×
                      </button>
                    </span>
                  )}
                  {inStockOnly && (
                    <span className="active-tag">
                      Còn hàng
                      <button onClick={() => setInStockOnly(false)}>×</button>
                    </span>
                  )}
                  {sort !== "featured" && (
                    <span className="active-tag">
                      {sort === "price-low" ? "Giá: Thấp đến cao" : "Giá: Cao đến thấp"}
                      <button onClick={() => setSort("featured")} aria-label="Bỏ sắp xếp giá">×</button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {error ? (
              <div className="catalog-error-box" role="alert" style={{ padding: "2rem", background: "#fee2e2", color: "#b91c1c", borderRadius: "12px", margin: "1rem 0", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", textAlign: "center" }}>
                <AlertCircle size={40} />
                <div>
                  <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem" }}>Lỗi kết nối máy chủ Catalog</h3>
                  <p style={{ margin: 0, opacity: 0.9 }}>{error}</p>
                </div>
                <button onClick={() => void fetchProducts()} className="button button-primary" style={{ marginTop: "0.5rem" }}>
                  Thử tải lại dữ liệu
                </button>
              </div>
            ) : loading ? (
              <div className="product-grid" style={{ minHeight: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={36} className="animate-spin text-muted-foreground" />
              </div>
            ) : displayedProducts.length ? (
              <>
                <div
                  className={`product-grid ${viewMode === "list" ? "product-grid-list" : "product-grid-catalog"}`}
                >
                  {displayedProducts.map((product) => (
                    <ProductCard product={product} key={product.productId} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <nav className="catalog-pagination" aria-label="Phân trang">
                    <button
                      className="pagination-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      ← Trước
                    </button>
                    <div className="pagination-numbers">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          className={`pagination-number ${currentPage === i + 1 ? "active" : ""}`}
                          onClick={() => setCurrentPage(i + 1)}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      className="pagination-btn"
                      disabled={currentPage === totalPages}
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Sau →
                    </button>
                  </nav>
                )}
              </>
            ) : (
              <div className="empty-state">
                <Search size={40} className="empty-state-icon" />
                <h2>Không tìm thấy sản phẩm nào trên máy chủ</h2>
                <p>
                  Thử thay đổi bộ lọc hoặc tìm kiếm bằng từ khóa linh kiện chung.
                </p>
                <button
                  className="button button-dark"
                  onClick={resetFilters}
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export function ProductDetail({ slug }: { slug: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { add } = useCart();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchProduct() {
      setLoading(true);
      setError(null);
      try {
        const numId = parseServerProductId(slug);
        if (numId !== null) {
          const serverProd = await catalogApi.getById(numId);
          if (isMounted) {
            setProduct(toProductCardModel(serverProd));
          }
        } else if (isMounted) {
          setError("Không tìm thấy thông tin sản phẩm yêu cầu.");
        }
      } catch (err) {
        if (isMounted) {
          setProduct(null);
          setError(err instanceof Error ? err.message : "Không thể kết nối đến máy chủ để tải thông tin sản phẩm.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void fetchProduct();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <>
        <Header />
        <main
          className="container detail-page"
          style={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center", padding: "4rem 0" }}>
            <Loader2
              size={40}
              className="animate-spin text-muted-foreground"
              style={{ margin: "0 auto 1rem" }}
            />
            <p>Đang tải thông tin sản phẩm từ máy chủ...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <Header />
        <main
          className="container detail-page"
          style={{ minHeight: "60vh", padding: "4rem 1rem" }}
        >
          <div
            role="alert"
            style={{
              maxWidth: "600px",
              margin: "0 auto",
              textAlign: "center",
              padding: "3rem",
              background: "#fee2e2",
              color: "#b91c1c",
              borderRadius: "16px",
            }}
          >
            <AlertCircle size={48} style={{ margin: "0 auto 1rem" }} />
            <h2 style={{ marginBottom: "0.5rem" }}>Không tìm thấy sản phẩm</h2>
            <p style={{ marginBottom: "1.5rem" }}>
              {error ?? "Sản phẩm bạn đang tìm kiếm không tồn tại hoặc đã ngừng kinh doanh."}
            </p>
            <Link href="/products" className="button button-primary">
              ← Quay lại danh mục sản phẩm
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const images = product.images?.length
    ? product.images
    : ["Góc nhìn chính", "Góc nghiêng", "Bao bì sản phẩm"];
  const serverProductId = parseServerProductId(product.id);

  const handleAddToCart = async () => {
    if (!product || product.stock === 0 || isSubmitting || serverProductId === null) return;
    if (!user) {
      toast("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.", "info");
      router.push(`/auth/login?redirect=${encodeURIComponent(`/products/${slug}`)}`);
      return;
    }
    setIsSubmitting(true);
    try {
      await add(serverProductId, quantity);
      toast(`Đã thêm ${quantity}x "${product.name}" vào giỏ hàng!`, "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Không thể thêm vào giỏ hàng",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product || product.stock === 0 || isSubmitting || serverProductId === null) return;
    if (!user) {
      toast("Vui lòng đăng nhập để tiến hành mua hàng.", "info");
      router.push(`/auth/login?redirect=${encodeURIComponent(`/products/${slug}`)}`);
      return;
    }
    setIsSubmitting(true);
    try {
      await add(serverProductId, quantity);
      router.push("/checkout");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Không thể thêm vào giỏ hàng",
        "error",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="container detail-page">
        <nav className="breadcrumb" aria-label="Đường dẫn">
          <Link href="/">Trang chủ</Link>
          <span>/</span>
          <Link href="/products">Sản phẩm</Link>
          <span>/</span>
          <Link href={`/products?category=${encodeURIComponent(product.category)}`}>
            {product.category}
          </Link>
          <span>/</span>
          <span>{product.name}</span>
        </nav>

        <div className="detail-grid">
          {/* Image Gallery with Interactive Reticle Zoom & Fullscreen Lightbox */}
          <div className="detail-gallery">
            <ProductGalleryZoom
              product={product}
              images={images}
              selectedImageIdx={selectedImageIdx}
              onSelectImageIdx={setSelectedImageIdx}
            />
          </div>

          {/* Details & Actions */}
          <div className="detail-copy">
            <div className="detail-header-meta">
              <span className="eyebrow">
                {product.brand} · {product.category}
              </span>
              {product.rating && (
                <a href="#reviews" className="detail-rating-pill">
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  <strong>{product.rating}</strong>
                  <span>({product.reviewCount} đánh giá từ khách mua)</span>
                </a>
              )}
            </div>

            <h1>{product.name}</h1>
            <p className="detail-description">{product.description}</p>

            <div className="detail-price-box">
              <div className="detail-price">
                <strong>{formatPrice(product.price)}</strong>
                {product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}
              </div>
              {product.oldPrice && (
                <span className="detail-discount-tag">
                  Tiết kiệm {formatPrice(product.oldPrice - product.price)}
                </span>
              )}
            </div>

            <div
              className={
                product.stock === 0 || serverProductId === null ? "detail-stock out" : "detail-stock"
              }
            >
              <span className="pulse-indicator" />
              {serverProductId === null
                ? "Sản phẩm giới thiệu chưa có trong catalog hiện tại"
                : product.stock === 0
                ? "Sản phẩm tạm thời hết hàng tại showroom"
                : `Sẵn hàng trong kho · Có thể giao hỏa tốc (${product.stock} chiếc)`}
            </div>

            <div className="quantity-row">
              <label htmlFor="quantity">Số lượng:</label>
              <div className="quantity">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Giảm số lượng"
                >
                  −
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  disabled={serverProductId === null || quantity >= product.stock}
                  onClick={() =>
                    setQuantity(Math.min(product.stock, quantity + 1))
                  }
                  aria-label="Tăng số lượng"
                >
                  +
                </button>
              </div>
            </div>

            <div className="detail-actions-group">
              <button
                type="button"
                className="button button-outline detail-add-btn"
                disabled={product.stock === 0 || serverProductId === null || isSubmitting}
                onClick={handleAddToCart}
              >
                <ShoppingCart size={17} /> Thêm vào giỏ hàng
              </button>
              <button
                type="button"
                className="button button-primary detail-buy-now-btn"
                disabled={product.stock === 0 || serverProductId === null || isSubmitting}
                onClick={handleBuyNow}
              >
                Mua ngay <span>↗</span>
              </button>
            </div>

          </div>
        </div>

        {/* Technical Specs Section */}
        <section className="spec-section">
          <div className="spec-section-header">
            <span className="eyebrow">Bảng thông số chi tiết</span>
            <h2>Thông tin kỹ thuật sản phẩm.</h2>
          </div>
          <div className="spec-grid">
            {Object.entries(product.specs).map(([key, value]) => (
              <div key={key} className="spec-item">
                <span className="spec-key">{key}</span>
                <strong className="spec-val">{value}</strong>
              </div>
            ))}
            <div className="spec-item">
              <span className="spec-key">Thương hiệu</span>
              <strong className="spec-val">{product.brand}</strong>
            </div>
          </div>
        </section>

        {/* Product Reviews & Real Customer Feedback */}
        {serverProductId !== null && (
          <ProductReviewsSection
            productSlug={product.slug}
            productName={product.name}
            productId={serverProductId}
          />
        )}

      </main>
      <Footer />
    </>
  );
}

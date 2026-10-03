"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "./cart-provider";
import { useToast } from "./toast";
import { QuickSearch } from "./quick-search";
import { ProductReviewsSection } from "./reviews";
import { useMemo, useState } from "react";
import {
  categories,
  brands,
  formatPrice,
  Product,
  products,
} from "../lib/products";
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
} from "lucide-react";

export function Header() {
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
                    <strong>Nguyễn Minh Anh</strong>
                    <small>minhanh@example.com</small>
                  </div>
                  <div className="user-menu-divider" />
                  <Link href="/orders" className="user-menu-item">
                    📦 Đơn hàng của tôi
                  </Link>
                  <Link href="/builder" className="user-menu-item">
                    🛠️ Cấu hình PC đã lưu
                  </Link>
                  <Link href="/community" className="user-menu-item">
                    📸 Góc máy của tôi
                  </Link>
                  <div className="user-menu-divider" />
                  <Link href="/auth/login" className="user-menu-item text-muted">
                    Chuyển tài khoản khác
                  </Link>
                  <Link
                    href="/auth/register"
                    className="user-menu-item text-muted"
                  >
                    Đăng ký tài khoản mới
                  </Link>
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
            <Link href="/orders" onClick={() => setOpen(false)}>
              Đơn hàng của tôi
            </Link>
            <Link href="/auth/login" onClick={() => setOpen(false)}>
              Đăng nhập / Đăng ký
            </Link>
          </nav>
        )}
      </header>

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

function ProductVisual({
  product,
  large = false,
}: {
  product: Product;
  large?: boolean;
}) {
  return (
    <div
      className={`product-visual ${large ? "product-visual-large" : ""}`}
      style={{ "--product-accent": product.accent } as React.CSSProperties}
    >
      <span className="visual-orbit" />
      <span className="visual-label">{product.category}</span>
      <span className="visual-letter">{product.name.slice(0, 1)}</span>
      <span className="visual-brand">{product.brand}</span>
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const { toast } = useToast();

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock > 0) {
      add(product.id, 1);
      toast(`Đã thêm "${product.name}" vào giỏ hàng!`, "success");
    }
  };

  return (
    <article className="product-card">
      <Link href={`/products/${product.slug}`} className="product-card-link">
        <ProductVisual product={product} />
        <div className="product-card-body">
          <div className="product-meta">
            <span className="product-brand-tag">{product.brand}</span>
            {product.badge && (
              <span className="product-badge">{product.badge}</span>
            )}
          </div>
          <h3>{product.name}</h3>
          <p className="product-card-desc">{product.description}</p>

          <div className="product-card-specs">
            {Object.entries(product.specs)
              .slice(0, 2)
              .map(([k, v]) => (
                <span key={k} className="spec-tag">
                  {k}: {v}
                </span>
              ))}
          </div>

          <div className="product-price-row">
            <div className="product-price">
              <strong>{formatPrice(product.price)}</strong>
              {product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}
            </div>
            {product.rating && (
              <div className="product-card-rating">
                <Star size={13} fill="#f59e0b" color="#f59e0b" />
                <span>{product.rating}</span>
                <small>({product.reviewCount})</small>
              </div>
            )}
          </div>

          <div className="product-card-footer">
            <span className={product.stock === 0 ? "stock out" : "stock"}>
              {product.stock === 0
                ? "Tạm hết hàng"
                : `Còn ${product.stock} sản phẩm`}
            </span>
            <button
              type="button"
              className="quick-add-btn"
              disabled={product.stock === 0}
              onClick={handleQuickAdd}
              aria-label={`Thêm nhanh ${product.name}`}
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
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">PC Store · Bản nâng cấp 2026</span>
              <h1>
                Build your <em>next</em> level.
              </h1>
              <p>
                Những linh kiện đúng gu, hiệu năng đúng nhu cầu. Ráp cấu hình
                trong mơ với bộ kiểm tra tương thích thông minh.
              </p>
              <div className="hero-actions">
                <Link className="button button-primary" href="/products">
                  Khám phá linh kiện <span>↗</span>
                </Link>
                <Link className="button button-outline" href="/builder">
                  Tự ráp cấu hình PC <span>⚡</span>
                </Link>
              </div>
              <div className="hero-features-list">
                <span>✓ Kiểm tra tương thích tự động</span>
                <span>✓ Đặt cọc linh hoạt & COD</span>
                <span>✓ Miễn phí giao toàn quốc</span>
              </div>
            </div>
            <div className="hero-art">
              <div className="hero-ring" />
              <div className="hero-chip">
                <span>PC</span>
                <strong>∞</strong>
              </div>
              <div className="hero-spec">
                <span>01</span>
                <small>
                  Curated
                  <br />
                  hardware
                </small>
              </div>
              <div className="hero-floating">
                DESIGNED FOR
                <br />
                <b>YOUR FLOW</b>
              </div>
            </div>
          </div>
        </section>

        {/* Builder Banner Callout */}
        <section className="container section">
          <div className="builder-teaser-banner">
            <div className="builder-teaser-copy">
              <span className="eyebrow">PC Builder 2026</span>
              <h2>Bạn chưa biết linh kiện nào hợp nhau?</h2>
              <p>
                Công cụ PC Builder tự động tính tổng công suất nguồn (Watt),
                kiểm tra chân cắm Socket CPU - Mainboard và kích cỡ Vỏ case
                hoàn toàn tự động!
              </p>
              <Link href="/builder" className="button button-primary">
                Bắt đầu ráp máy ngay <span>⚡</span>
              </Link>
            </div>
            <div className="builder-teaser-stats">
              <div className="stat-card">
                <strong>8 Nhóm</strong>
                <span>Linh kiện chuẩn</span>
              </div>
              <div className="stat-card">
                <strong>100%</strong>
                <span>Quy tắc chuẩn đoán</span>
              </div>
              <div className="stat-card">
                <strong>1 Click</strong>
                <span>Thêm cả dàn vào giỏ</span>
              </div>
            </div>
          </div>
        </section>

        <section className="container section" id="categories">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Chọn điểm bắt đầu</span>
              <h2>Phần cứng cho mọi nhịp làm việc.</h2>
            </div>
            <Link className="text-link" href="/products">
              Xem tất cả sản phẩm ↗
            </Link>
          </div>
          <div className="category-grid">
            {categories.map((category, idx) => (
              <Link
                className={`category-tile category-${category.tone}`}
                href={`/products?category=${encodeURIComponent(category.name)}`}
                key={category.name}
              >
                <span className="category-index">0{idx + 1}</span>
                <span className="category-icon">
                  {category.name === "Laptop"
                    ? "▱"
                    : category.name === "PC Gaming"
                      ? "▣"
                      : category.name === "Linh kiện"
                        ? "⌘"
                        : "◈"}
                </span>
                <strong>{category.name}</strong>
                <small>{category.count}</small>
                <span className="tile-arrow">↗</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="container section featured-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Sản phẩm nổi bật</span>
              <h2>Được lựa chọn nhiều nhất trong tuần.</h2>
            </div>
            <Link className="text-link" href="/products">
              Xem toàn bộ catalog ↗
            </Link>
          </div>
          <div className="product-grid">
            {products
              .filter((product) => product.featured)
              .map((product) => (
                <ProductCard product={product} key={product.id} />
              ))}
          </div>
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
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [selectedBrand, setSelectedBrand] = useState("Tất cả");
  const [priceRange, setPriceRange] = useState("ALL");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const filtered = useMemo(() => {
    return products
      .filter((p) => {
        // Query search
        const matchQuery =
          !query.trim() ||
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.brand.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase());

        // Category
        const matchCategory =
          selectedCategory === "Tất cả" || p.category === selectedCategory;

        // Brand
        const matchBrand =
          selectedBrand === "Tất cả" || p.brand === selectedBrand;

        // In stock
        const matchStock = !inStockOnly || p.stock > 0;

        // Price range
        let matchPrice = true;
        if (priceRange === "UNDER_5M") matchPrice = p.price < 5000000;
        else if (priceRange === "5M_15M")
          matchPrice = p.price >= 5000000 && p.price <= 15000000;
        else if (priceRange === "15M_30M")
          matchPrice = p.price > 15000000 && p.price <= 30000000;
        else if (priceRange === "OVER_30M") matchPrice = p.price > 30000000;

        return matchQuery && matchCategory && matchBrand && matchStock && matchPrice;
      })
      .sort((a, b) => {
        if (sort === "price-low") return a.price - b.price;
        if (sort === "price-high") return b.price - a.price;
        if (sort === "rating") return (b.rating || 0) - (a.rating || 0);
        return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      });
  }, [query, selectedCategory, selectedBrand, priceRange, inStockOnly, sort]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const resetFilters = () => {
    setQuery("");
    setSelectedCategory("Tất cả");
    setSelectedBrand("Tất cả");
    setPriceRange("ALL");
    setInStockOnly(false);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    query ||
    selectedCategory !== "Tất cả" ||
    selectedBrand !== "Tất cả" ||
    priceRange !== "ALL" ||
    inStockOnly;

  return (
    <>
      <Header />
      <main className="catalog-page container">
        <div className="catalog-hero">
          <span className="eyebrow">
            Catalog linh kiện & máy tính chính hãng
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
                  className={`filter-chip ${selectedCategory === "Tất cả" ? "active" : ""}`}
                  onClick={() => {
                    setSelectedCategory("Tất cả");
                    setCurrentPage(1);
                  }}
                >
                  Tất cả
                </button>
                {categories.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className={`filter-chip ${selectedCategory === c.name ? "active" : ""}`}
                    onClick={() => {
                      setSelectedCategory(c.name);
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
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setCurrentPage(1);
                }}
                className="filter-select"
              >
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
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
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label="Sắp xếp sản phẩm"
                  className="catalog-sort-select"
                >
                  <option value="featured">Ưu tiên nổi bật</option>
                  <option value="price-low">Giá: Thấp đến cao</option>
                  <option value="price-high">Giá: Cao đến thấp</option>
                  <option value="rating">Đánh giá cao nhất</option>
                </select>

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
                Tìm thấy <strong>{filtered.length}</strong> sản phẩm phù hợp
              </span>
              {hasActiveFilters && (
                <div className="active-filter-tags">
                  {selectedCategory !== "Tất cả" && (
                    <span className="active-tag">
                      {selectedCategory}
                      <button onClick={() => setSelectedCategory("Tất cả")}>
                        ×
                      </button>
                    </span>
                  )}
                  {selectedBrand !== "Tất cả" && (
                    <span className="active-tag">
                      {selectedBrand}
                      <button onClick={() => setSelectedBrand("Tất cả")}>
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
                </div>
              )}
            </div>

            {filtered.length ? (
              <>
                <div
                  className={`product-grid ${viewMode === "list" ? "product-grid-list" : "product-grid-catalog"}`}
                >
                  {paginatedProducts.map((product) => (
                    <ProductCard product={product} key={product.id} />
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
                <h2>Không tìm thấy sản phẩm nào</h2>
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

export function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const { add } = useCart();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  const images = product.images?.length
    ? product.images
    : ["Góc nhìn chính", "Góc nghiêng", "Bao bì sản phẩm"];

  const handleAddToCart = () => {
    add(product.id, quantity);
    toast(`Đã thêm ${quantity}x "${product.name}" vào giỏ hàng!`, "success");
  };

  const handleBuyNow = () => {
    add(product.id, quantity);
    router.push("/checkout");
  };

  const relatedProducts = products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, 3);

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
          {/* Image Gallery */}
          <div className="detail-gallery">
            <div className="detail-main-visual">
              <ProductVisual product={product} large />
              <div className="detail-gallery-caption">
                Góc ảnh: <strong>{images[selectedImageIdx]}</strong>
              </div>
            </div>
            <div className="detail-thumbnails" role="group" aria-label="Danh sách ảnh">
              {images.map((imgLabel, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`thumbnail-btn ${selectedImageIdx === idx ? "active" : ""}`}
                  onClick={() => setSelectedImageIdx(idx)}
                >
                  <span
                    className="thumbnail-swatch"
                    style={{ background: product.accent }}
                  />
                  <small>{imgLabel}</small>
                </button>
              ))}
            </div>
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
                product.stock === 0 ? "detail-stock out" : "detail-stock"
              }
            >
              <span className="pulse-indicator" />
              {product.stock === 0
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
                  disabled={quantity >= product.stock}
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
                disabled={product.stock === 0}
                onClick={handleAddToCart}
              >
                <ShoppingCart size={17} /> Thêm vào giỏ hàng
              </button>
              <button
                type="button"
                className="button button-primary detail-buy-now-btn"
                disabled={product.stock === 0}
                onClick={handleBuyNow}
              >
                Mua ngay <span>↗</span>
              </button>
            </div>

            {/* Store Value Commitments */}
            <div className="store-commitments-grid">
              <div className="commitment-item">
                <ShieldCheck size={20} className="commitment-icon" />
                <div>
                  <strong>Bảo hành chính hãng</strong>
                  <p>{product.warranty ?? "24 - 36 tháng chính hãng"}</p>
                </div>
              </div>
              <div className="commitment-item">
                <Truck size={20} className="commitment-icon" />
                <div>
                  <strong>Miễn phí vận chuyển</strong>
                  <p>Áp dụng cho mọi đơn COD và Chuyển khoản</p>
                </div>
              </div>
              <div className="commitment-item">
                <RotateCcw size={20} className="commitment-icon" />
                <div>
                  <strong>Đổi mới 30 ngày</strong>
                  <p>Lỗi nhà sản xuất 1 đổi 1 ngay lập tức</p>
                </div>
              </div>
              <div className="commitment-item">
                <Headphones size={20} className="commitment-icon" />
                <div>
                  <strong>Hỗ trợ kỹ thuật 24/7</strong>
                  <p>Đội ngũ chuyên gia PC Store hỗ trợ ráp máy</p>
                </div>
              </div>
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
            <div className="spec-item">
              <span className="spec-key">Chính sách bảo hành</span>
              <strong className="spec-val">{product.warranty ?? "Chính hãng"}</strong>
            </div>
          </div>
        </section>

        {/* Product Reviews & Real Customer Feedback */}
        <ProductReviewsSection productSlug={product.slug} productName={product.name} />

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="related-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Gợi ý kèm theo</span>
                <h2>Sản phẩm cùng danh mục</h2>
              </div>
              <Link className="text-link" href="/products">
                Xem thêm ↗
              </Link>
            </div>
            <div className="product-grid">
              {relatedProducts.map((rel) => (
                <ProductCard product={rel} key={rel.id} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

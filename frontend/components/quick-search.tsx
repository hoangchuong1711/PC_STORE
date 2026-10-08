"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { catalogApi, type CatalogProduct } from "../lib/catalog-api";
import { formatPrice } from "../lib/products";

export function QuickSearch({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setQuery("");
    setResults([]);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Fetch search results from backend API with debouncing
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const page = await catalogApi.list({ q: trimmed, size: 6 });
        setResults(page.items);
      } catch {
        // If network error, clear results
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const popularKeywords = [
    "RTX 4070",
    "Ryzen 5",
    "Ryzen 7",
    "Kingston",
    "ASUS",
    "Samsung",
  ];

  return (
    <div className="search-modal-overlay" onClick={handleClose}>
      <div
        className="search-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Tìm kiếm nhanh sản phẩm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="search-modal-input-row">
          <Search size={22} className="search-modal-icon" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm CPU, GPU, Laptop, RAM..."
            className="search-modal-input"
          />
          {loading && <Loader2 size={18} className="animate-spin text-muted-foreground" />}
          {query && !loading && (
            <button
              onClick={() => setQuery("")}
              className="search-modal-clear"
              aria-label="Xóa nội dung"
            >
              <X size={18} />
            </button>
          )}
          <button onClick={handleClose} className="search-modal-close-btn">
            Đóng <kbd>ESC</kbd>
          </button>
        </div>

        <div className="search-modal-body">
          {!query.trim() ? (
            <div className="search-modal-suggestions">
              <span className="search-modal-section-title">
                <Sparkles size={15} /> Từ khóa tìm kiếm phổ biến
              </span>
              <div className="search-keywords-list">
                {popularKeywords.map((kw) => (
                  <button
                    key={kw}
                    className="search-keyword-chip"
                    onClick={() => setQuery(kw)}
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="search-results-list">
              <span className="search-modal-section-title">
                Tìm thấy {results.length} sản phẩm phù hợp từ máy chủ
              </span>
              {results.slice(0, 5).map((product) => {
                const brandName = product.brand?.name ?? "PC Store";
                const catName = product.category?.name ?? "Linh kiện";
                const isOutOfStock = !product.inStock || product.availableQuantity === 0;

                return (
                  <Link
                    key={product.productId}
                    href={`/products/${product.productId}`}
                    className="search-result-item"
                    onClick={handleClose}
                  >
                    <div
                      className="search-result-mark"
                      style={{ background: "#00539b" }}
                    >
                      <span>{product.name.slice(0, 1)}</span>
                    </div>
                    <div className="search-result-info">
                      <div className="search-result-meta">
                        <span className="search-result-brand">{brandName}</span>
                        <span className="search-result-cat">{catName}</span>
                      </div>
                      <span className="search-result-name">{product.name}</span>
                    </div>
                    <div className="search-result-price-col">
                      <strong className="search-result-price">
                        {formatPrice(product.price)}
                      </strong>
                      <span
                        className={`search-result-stock ${isOutOfStock ? "out" : ""}`}
                      >
                        {isOutOfStock ? "Hết hàng" : `Còn ${product.availableQuantity}`}
                      </span>
                    </div>
                  </Link>
                );
              })}
              {results.length > 5 && (
                <Link
                  href={`/products?q=${encodeURIComponent(query)}`}
                  className="search-modal-see-all"
                  onClick={handleClose}
                >
                  Xem tất cả {results.length} kết quả <ArrowRight size={16} />
                </Link>
              )}
            </div>
          ) : !loading ? (
            <div className="search-modal-empty">
              <p>
                Không tìm thấy sản phẩm nào khớp với &quot;<b>{query}</b>&quot;.
              </p>
              <small>
                Hãy thử kiểm tra lại chính tả hoặc tìm theo từ khóa chung như
                &quot;RAM&quot;, &quot;GPU&quot;, &quot;AMD&quot;.
              </small>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

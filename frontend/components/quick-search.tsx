"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, ArrowRight, Sparkles } from "lucide-react";
import { products, formatPrice, Product } from "../lib/products";

export function QuickSearch({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setQuery("");
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

  if (!isOpen) return null;

  const results: Product[] = query.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.brand.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase()) ||
          Object.values(p.specs).some((val) =>
            val.toLowerCase().includes(query.toLowerCase()),
          ),
      )
    : [];

  const popularKeywords = [
    "RTX 4070",
    "Intel i7",
    "Ryzen 7",
    "Kingston DDR5",
    "Laptop ROG",
    "Samsung 990",
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
          {query && (
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
                Tìm thấy {results.length} sản phẩm phù hợp
              </span>
              {results.slice(0, 5).map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="search-result-item"
                  onClick={handleClose}
                >
                  <div
                    className="search-result-mark"
                    style={{ background: product.accent }}
                  >
                    {product.name.slice(0, 1)}
                  </div>
                  <div className="search-result-info">
                    <div className="search-result-meta">
                      <span className="search-result-brand">
                        {product.brand}
                      </span>
                      <span className="search-result-cat">
                        {product.category}
                      </span>
                    </div>
                    <span className="search-result-name">{product.name}</span>
                  </div>
                  <div className="search-result-price-col">
                    <strong className="search-result-price">
                      {formatPrice(product.price)}
                    </strong>
                    <span
                      className={`search-result-stock ${product.stock === 0 ? "out" : ""}`}
                    >
                      {product.stock === 0 ? "Hết hàng" : "Còn hàng"}
                    </span>
                  </div>
                </Link>
              ))}
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
          ) : (
            <div className="search-modal-empty">
              <p>
                Không tìm thấy sản phẩm nào khớp với &quot;<b>{query}</b>&quot;.
              </p>
              <small>
                Hãy thử kiểm tra lại chính tả hoặc tìm theo từ khóa chung như
                &quot;RAM&quot;, &quot;GPU&quot;.
              </small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { X, Trash2, ShoppingBag, ArrowRight, AlertCircle } from "lucide-react";
import { useCart } from "./cart-provider";
import { summarizeSelection } from "../lib/cart";
import { formatPrice } from "../lib/products";

export function CartDrawer() {
  const { items, selectedIds, toggleSelected, selectAll, isOpen, closeCart, update, remove, error, loading } = useCart();
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        closeCart();
      }
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  const lines = items.map((item) => {
    const product = item.product ?? {
      id: item.id,
      productId: item.productId ?? 0,
      name: item.name,
      price: item.price,
      stock: item.stock ?? 0,
      brand: "",
      category: "",
      accent: "#00539b",
      slug: item.id,
    };
    return { ...item, product };
  });

  const { subtotal: total } = summarizeSelection(items, selectedIds);

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="cart-drawer-overlay" onClick={closeCart}>
      <aside
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Giỏ hàng xem nhanh"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cart-drawer-header">
          <div className="cart-drawer-title">
            <ShoppingBag size={20} />
            <h2>Giỏ hàng</h2>
            <span className="cart-drawer-count">{totalCount}</span>
          </div>
          <button
            className="cart-drawer-close"
            onClick={closeCart}
            aria-label="Đóng giỏ hàng"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="cart-drawer-error" role="alert" style={{ margin: "1rem", padding: "0.75rem", background: "#fee2e2", color: "#b91c1c", borderRadius: "8px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {lines.length === 0 ? (
          <div className="cart-drawer-empty">
            <div className="cart-drawer-empty-icon">
              <ShoppingBag size={48} />
            </div>
            <h3>Giỏ hàng đang trống</h3>
            <p>Hãy thêm linh kiện bạn yêu thích để bắt đầu ráp cấu hình.</p>
            <Link
              href="/products"
              className="button button-primary"
              onClick={closeCart}
            >
              Khám phá sản phẩm
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-drawer-items">
              <label className="mb-4 flex items-center gap-3 text-sm font-semibold">
                <input type="checkbox" className="h-5 w-5 shrink-0 accent-[#006ce1]"
                  checked={selectedIds.length === items.length}
                  ref={(node) => { if (node) node.indeterminate = selectedIds.length > 0 && selectedIds.length < items.length; }}
                  disabled={loading} onChange={(event) => selectAll(event.target.checked)} />
                Chọn tất cả ({selectedIds.length}/{items.length})
              </label>
              {lines.map((line) => {
                const targetKey = line.cartItemId ?? line.product.id;
                return (
                  <div key={line.cartItemId ? `cart-${line.cartItemId}` : `prod-${line.product.id}`} className="cart-drawer-item">
                    <input type="checkbox" className="mt-3 h-5 w-5 shrink-0 accent-[#006ce1]"
                      aria-label={`Chọn ${line.product.name}`} checked={selectedIds.includes(line.id)}
                      disabled={loading} onChange={() => toggleSelected(line.id)} />
                    <div
                      className="cart-drawer-item-mark"
                      style={{ background: line.product.accent }}
                    >
                      <span>{line.product.name.slice(0, 1)}</span>
                    </div>
                    <div className="cart-drawer-item-details">
                      <span className="cart-drawer-item-brand">
                        {line.product.brand}
                      </span>
                      <Link
                        href={`/products/${line.product.slug}`}
                        className="cart-drawer-item-name"
                        onClick={closeCart}
                      >
                        {line.product.name}
                      </Link>
                      <div className="cart-drawer-item-price">
                        {formatPrice(line.price)}
                      </div>
                      <div className="cart-drawer-item-controls">
                        <div className="quantity">
                          <button
                            disabled={line.quantity <= 1 || loading}
                            onClick={() => void update(targetKey, line.quantity - 1)}
                            aria-label="Giảm"
                          >
                            −
                          </button>
                          <span>{line.quantity}</span>
                          <button
                            disabled={line.quantity >= line.product.stock || loading}
                            onClick={() => void update(targetKey, line.quantity + 1)}
                            aria-label="Tăng"
                          >
                            +
                          </button>
                        </div>
                        <button
                          className="cart-drawer-remove"
                          disabled={loading}
                          onClick={() => void (remove ? remove(targetKey) : update(targetKey, 0))}
                          aria-label={`Xóa ${line.product.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cart-drawer-footer">
              <div className="cart-drawer-subtotal">
                <span>Tạm tính ({selectedIds.length} món đã chọn):</span>
                <strong aria-live="polite">{formatPrice(total)}</strong>
              </div>
              <p className="cart-drawer-shipping-note">
                Miễn phí vận chuyển toàn quốc cho mọi đơn hàng.
              </p>
              <div className="cart-drawer-actions">
                <button
                  type="button"
                  disabled={loading || selectedIds.length === 0}
                  className="button button-primary cart-drawer-checkout-btn disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => { closeCart(); router.push("/checkout"); }}
                >
                  Thanh toán ngay <ArrowRight size={16} />
                </button>
                <Link
                  href="/cart"
                  className="button button-outline cart-drawer-cart-btn"
                  onClick={closeCart}
                >
                  Xem giỏ hàng chi tiết
                </Link>
              </div>
              {selectedIds.length === 0 && <p role="status" className="mt-3 text-sm text-muted">Vui lòng chọn ít nhất một sản phẩm để thanh toán.</p>}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "./cart-provider";
import { formatPrice, products } from "../lib/products";

export function CartDrawer() {
  const { items, isOpen, closeCart, update } = useCart();

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

  const lines = items.flatMap((item) => {
    const product = products.find((p) => p.id === item.id);
    return product ? [{ ...item, product }] : [];
  });

  const total = lines.reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0,
  );
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
              {lines.map(({ product, quantity }) => (
                <div key={product.id} className="cart-drawer-item">
                  <div
                    className="cart-drawer-item-mark"
                    style={{ background: product.accent }}
                  >
                    <span>{product.name.slice(0, 1)}</span>
                  </div>
                  <div className="cart-drawer-item-details">
                    <span className="cart-drawer-item-brand">
                      {product.brand}
                    </span>
                    <Link
                      href={`/products/${product.slug}`}
                      className="cart-drawer-item-name"
                      onClick={closeCart}
                    >
                      {product.name}
                    </Link>
                    <div className="cart-drawer-item-price">
                      {formatPrice(product.price)}
                    </div>
                    <div className="cart-drawer-item-controls">
                      <div className="quantity">
                        <button
                          disabled={quantity <= 1}
                          onClick={() => update(product.id, quantity - 1)}
                          aria-label="Giảm"
                        >
                          −
                        </button>
                        <span>{quantity}</span>
                        <button
                          disabled={quantity >= product.stock}
                          onClick={() => update(product.id, quantity + 1)}
                          aria-label="Tăng"
                        >
                          +
                        </button>
                      </div>
                      <button
                        className="cart-drawer-remove"
                        onClick={() => update(product.id, 0)}
                        aria-label={`Xóa ${product.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-drawer-footer">
              <div className="cart-drawer-subtotal">
                <span>Tạm tính:</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              <p className="cart-drawer-shipping-note">
                Miễn phí vận chuyển toàn quốc cho mọi đơn hàng.
              </p>
              <div className="cart-drawer-actions">
                <Link
                  href="/checkout"
                  className="button button-primary cart-drawer-checkout-btn"
                  onClick={closeCart}
                >
                  Thanh toán ngay <ArrowRight size={16} />
                </Link>
                <Link
                  href="/cart"
                  className="button button-outline cart-drawer-cart-btn"
                  onClick={closeCart}
                >
                  Xem giỏ hàng chi tiết
                </Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

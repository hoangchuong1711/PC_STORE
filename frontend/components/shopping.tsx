"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { ShoppingBag, CheckCircle2, Trash2 } from "lucide-react";
import { Header, Footer } from "./storefront";
import { useCart } from "./cart-provider";
import { formatPrice, products } from "../lib/products";
import "./shopping.css";

export function ShoppingPage({ checkout = false }: { checkout?: boolean }) {
  const { items, add, update, clear } = useCart();
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState("");
  const [error, setError] = useState("");
  const [scenario, setScenario] = useState("success");
  const submitting = useRef(false);
  const lines = items.flatMap((item) => {
    const product = products.find((product) => product.id === item.id);
    return product ? [{ ...item, product }] : [];
  });
  const total = lines.reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !lines.length) return;
    const data = new FormData(event.currentTarget);
    if (
      String(data.get("name")).trim().length < 2 ||
      String(data.get("address")).trim().length < 10
    ) {
      setError("Nhập tên người nhận và địa chỉ đầy đủ, tối thiểu 10 ký tự.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    await new Promise((resolve) => setTimeout(resolve, 700));
    if (scenario !== "success") {
      setError(
        scenario === "stock"
          ? "Một sản phẩm không còn đủ số lượng. Quay lại giỏ để điều chỉnh."
          : "Giá sản phẩm đã thay đổi. Quay lại giỏ và kiểm tra trước khi tiếp tục.",
      );
    } else {
      setOrder(`DEMO-${Date.now().toString().slice(-6)}`);
      clear();
    }
    submitting.current = false;
    setBusy(false);
  }

  return (
    <>
      <Header />
      <main className="container shopping-page">
        <nav className="shopping-steps" aria-label="Các bước mua hàng">
          <Link href="/cart" aria-current={!checkout ? "page" : undefined}>
            1. Giỏ hàng
          </Link>
          <span aria-current={checkout ? "step" : undefined}>
            2. Thông tin nhận hàng
          </span>
          <span>3. Xác nhận</span>
        </nav>
        <h1>
          {order
            ? "Đã tạo đơn mẫu"
            : checkout
              ? "Sẵn sàng nhận hàng."
              : "Góc máy mới, trong giỏ."}
        </h1>
        <p className="shopping-intro">
          Bản xem thử giao diện · Không tạo đơn hàng thật. Giỏ mẫu được giữ khi
          chuyển trang và đặt lại khi tải lại trang.
        </p>

        {order ? (
          <section className="shopping-empty" role="status">
            <CheckCircle2 size={48} aria-hidden="true" />
            <h2>Cảm ơn bạn đã trải nghiệm!</h2>
            <p>
              Mã đơn mẫu: <strong>{order}</strong>
            </p>
            <p>Phương thức: thanh toán khi nhận hàng (COD).</p>
            <Link className="button button-primary" href="/products">
              Tiếp tục khám phá
            </Link>
          </section>
        ) : !lines.length ? (
          <section className="shopping-empty">
            <ShoppingBag size={48} aria-hidden="true" />
            <h2>Giỏ hàng đang trống</h2>
            <p>Chọn sản phẩm từ catalog hoặc thử nhanh với hai sản phẩm mẫu.</p>
            <div className="shopping-empty-actions">
              <Link className="button button-primary" href="/products">
                Khám phá sản phẩm
              </Link>
              <button
                className="button"
                onClick={() => {
                  add("p1", 1);
                  add("p5", 2);
                }}
              >
                Thử giỏ mẫu
              </button>
            </div>
          </section>
        ) : (
          <div className="shopping-layout">
            <section
              aria-label={
                checkout ? "Thông tin giao hàng" : "Sản phẩm trong giỏ"
              }
            >
              {checkout ? (
                <form
                  id="checkout-form"
                  className="shipping-form"
                  onSubmit={submit}
                >
                  <h2>Thông tin người nhận</h2>
                  <fieldset disabled={busy}>
                    <label htmlFor="receiver">Họ và tên</label>
                    <input
                      id="receiver"
                      name="name"
                      autoComplete="name"
                      required
                      minLength={2}
                      placeholder="Tên người nhận"
                    />
                    <label htmlFor="phone">Số điện thoại</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      pattern="(0[0-9]{9}|\+84[0-9]{9})"
                      required
                      placeholder="0901234567"
                      title="Nhập 10 chữ số bắt đầu bằng 0 hoặc +84 và 9 chữ số"
                    />
                    <label htmlFor="address">Địa chỉ nhận hàng</label>
                    <textarea
                      id="address"
                      name="address"
                      autoComplete="street-address"
                      required
                      minLength={10}
                      rows={3}
                      placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố"
                    />
                    <label htmlFor="notes">Ghi chú (không bắt buộc)</label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={2}
                      maxLength={500}
                      placeholder="Lưu ý khi giao hàng"
                    />
                    <div className="cod-option">
                      <strong>Thanh toán khi nhận hàng</strong>
                      <p>
                        COD · Kiểm tra thông tin trước khi xác nhận đơn mẫu.
                      </p>
                    </div>
                    <details className="demo-scenarios">
                      <summary>Tình huống xem thử</summary>
                      <label htmlFor="scenario">Kết quả đặt hàng</label>
                      <select
                        id="scenario"
                        value={scenario}
                        onChange={(event) => setScenario(event.target.value)}
                      >
                        <option value="success">Thành công</option>
                        <option value="stock">Không đủ tồn kho</option>
                        <option value="price">Giá thay đổi</option>
                      </select>
                    </details>
                  </fieldset>
                  {error && (
                    <p role="alert" className="form-message error">
                      {error} <Link href="/cart">Xem giỏ hàng</Link>
                    </p>
                  )}
                </form>
              ) : (
                <div className="cart-lines">
                  {lines.map(({ product, quantity }) => (
                    <article className="cart-line" key={product.id}>
                      <div className="cart-category" aria-hidden="true">
                        {product.category}
                      </div>
                      <div className="cart-line-info">
                        <span>{product.brand}</span>
                        <h2>
                          <Link href={`/products/${product.slug}`}>
                            {product.name}
                          </Link>
                        </h2>
                        <p>{formatPrice(product.price)} / sản phẩm</p>
                        <div className="cart-line-controls">
                          <div className="quantity">
                            <button
                              disabled={quantity <= 1}
                              onClick={() => update(product.id, quantity - 1)}
                              aria-label={`Giảm số lượng ${product.name}`}
                            >
                              −
                            </button>
                            <output aria-live="polite">{quantity}</output>
                            <button
                              disabled={quantity >= product.stock}
                              onClick={() => update(product.id, quantity + 1)}
                              aria-label={`Tăng số lượng ${product.name}`}
                            >
                              +
                            </button>
                          </div>
                          <button
                            className="remove-item"
                            onClick={() => update(product.id, 0)}
                            aria-label={`Xóa ${product.name}`}
                          >
                            <Trash2 size={16} /> Xóa
                          </button>
                        </div>
                        {quantity >= product.stock && (
                          <small>Đã đạt số lượng có sẵn trong mẫu.</small>
                        )}
                      </div>
                      <strong className="line-total">
                        {formatPrice(product.price * quantity)}
                      </strong>
                    </article>
                  ))}
                  <Link className="text-link" href="/products">
                    Tiếp tục chọn sản phẩm
                  </Link>
                </div>
              )}
            </section>
            <aside className="order-summary">
              <h2>Tóm tắt đơn hàng</h2>
              {checkout &&
                lines.map(({ product, quantity }) => (
                  <div className="summary-product" key={product.id}>
                    <span>
                      {product.name} × {quantity}
                    </span>
                    <strong>{formatPrice(product.price * quantity)}</strong>
                  </div>
                ))}
              <dl>
                <div>
                  <dt>Tạm tính</dt>
                  <dd>{formatPrice(total)}</dd>
                </div>
                <div>
                  <dt>Phí giao hàng mẫu</dt>
                  <dd>Miễn phí</dd>
                </div>
                <div className="summary-total">
                  <dt>Tổng cộng</dt>
                  <dd>{formatPrice(total)}</dd>
                </div>
              </dl>
              {checkout ? (
                <button
                  form="checkout-form"
                  type="submit"
                  className="button button-primary"
                  disabled={busy}
                >
                  {busy ? "Đang tạo đơn mẫu…" : "Xác nhận đơn mẫu"}
                </button>
              ) : (
                <Link className="button button-primary" href="/checkout">
                  Tiến hành đặt hàng
                </Link>
              )}
              <p>Giá và tồn kho chỉ phục vụ xem thử giao diện.</p>
              {checkout && <Link href="/cart">Quay lại chỉnh sửa giỏ</Link>}
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

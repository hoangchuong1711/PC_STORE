"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import {
  ShoppingBag,
  CheckCircle2,
  Trash2,
  CreditCard,
  QrCode,
  Tag,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { Header, Footer } from "./storefront";
import { useCart } from "./cart-provider";
import { useToast } from "./toast";
import { formatPrice, products } from "../lib/products";
import "./shopping.css";

const savedAddresses = [
  {
    id: "addr-1",
    label: "Nhà riêng (Mặc định)",
    name: "Nguyễn Minh Anh",
    phone: "090 123 4567",
    address: "24 Nguyễn Văn Linh, Phường Nam Dương, Quận Hải Châu, TP. Đà Nẵng",
  },
  {
    id: "addr-2",
    label: "Văn phòng công ty",
    name: "Nguyễn Minh Anh",
    phone: "090 123 4567",
    address: "Tầng 5, Tòa nhà Software Park, 02 Quang Trung, Hải Châu, Đà Nẵng",
  },
];

export function ShoppingPage({ checkout = false }: { checkout?: boolean }) {
  const { items, add, update, clear } = useCart();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState("");
  const [error, setError] = useState("");
  const [scenario, setScenario] = useState("success");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "BANK_TRANSFER">("COD");
  const [copied, setCopied] = useState(false);

  // Address selection
  const [addressMode, setAddressMode] = useState<"saved" | "custom">("saved");
  const [selectedAddrId, setSelectedAddrId] = useState("addr-1");

  // Promo code
  const [promoInput, setPromoInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
  } | null>(null);

  const submitting = useRef(false);

  const lines = items.flatMap((item) => {
    const product = products.find((product) => product.id === item.id);
    return product ? [{ ...item, product }] : [];
  });

  const subtotal = lines.reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0,
  );

  const discountAmount = appliedDiscount ? appliedDiscount.amount : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (code === "PCSTORE50K") {
      setAppliedDiscount({ code: "PCSTORE50K", amount: 50000 });
      toast("Đã áp dụng mã giảm giá 50.000₫!", "success");
      setPromoInput("");
    } else if (code === "VIPBUILD") {
      setAppliedDiscount({ code: "VIPBUILD", amount: 200000 });
      toast("Đã áp dụng mã VIP giảm 200.000₫!", "success");
      setPromoInput("");
    } else {
      toast("Mã ưu đãi không hợp lệ hoặc đã hết hạn!", "error");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast("Đã sao chép vào bộ nhớ tạm!", "info");
    setTimeout(() => setCopied(false), 2000);
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !lines.length) return;

    const data = new FormData(event.currentTarget);
    let recipientName = "";
    let recipientPhone = "";
    let recipientAddress = "";

    if (addressMode === "saved") {
      const addr = savedAddresses.find((a) => a.id === selectedAddrId);
      if (addr) {
        recipientName = addr.name;
        recipientPhone = addr.phone;
        recipientAddress = addr.address;
      }
    } else {
      recipientName = String(data.get("name") ?? "");
      recipientPhone = String(data.get("phone") ?? "");
      recipientAddress = String(data.get("address") ?? "");
    }

    if (
      recipientName.trim().length < 2 ||
      recipientPhone.trim().length < 9 ||
      recipientAddress.trim().length < 8
    ) {
      setError("Vui lòng kiểm tra lại tên người nhận, số điện thoại và địa chỉ đầy đủ.");
      return;
    }

    submitting.current = true;
    setBusy(true);
    setError("");

    await new Promise((resolve) => setTimeout(resolve, 800));

    if (scenario !== "success") {
      setError(
        scenario === "stock"
          ? "Một số linh kiện trong giỏ vừa hết hàng hoặc không đủ tồn kho."
          : "Giá một số sản phẩm đã được cập nhật. Vui lòng kiểm tra lại giỏ hàng.",
      );
      toast("Đặt hàng chưa thành công do kiểm tra kho!", "error");
    } else {
      const generatedCode = `PCS-${Date.now().toString().slice(-6)}`;
      setOrder(generatedCode);
      clear();
      toast(`Tạo đơn hàng ${generatedCode} thành công!`, "success");
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
            1. Giỏ hàng ({lines.length})
          </Link>
          <span aria-current={checkout ? "step" : undefined}>
            2. Thông tin nhận hàng & Thanh toán
          </span>
          <span className={order ? "active-step" : ""}>3. Hoàn tất đơn</span>
        </nav>

        <h1>
          {order
            ? "Đơn hàng đã được ghi nhận!"
            : checkout
              ? "Xác nhận địa chỉ & Thanh toán"
              : "Giỏ hàng linh kiện của bạn"}
        </h1>
        <p className="shopping-intro">
          PC Store cam kết 100% linh kiện chính hãng · Miễn phí giao hàng toàn quốc · Kiểm tra hàng trước khi nhận.
        </p>

        {order ? (
          <section className="shopping-empty order-success-card" role="status">
            <div className="success-icon-wrap">
              <CheckCircle2 size={54} className="success-check-icon" />
            </div>
            <h2>Cảm ơn bạn đã đặt hàng tại PC Store!</h2>
            <div className="order-success-code-box">
              <span>Mã đơn hàng của bạn:</span>
              <strong>{order}</strong>
            </div>

            {paymentMethod === "BANK_TRANSFER" ? (
              <div className="transfer-instruction-box">
                <div className="transfer-instruction-header">
                  <QrCode size={24} />
                  <div>
                    <h3>Thông tin chuyển khoản nhanh qua VietQR</h3>
                    <p>Quét mã bên dưới hoặc chuyển khoản theo thông tin chính xác:</p>
                  </div>
                </div>

                <div className="transfer-details-grid">
                  <div className="vietqr-mock-card">
                    <div className="qr-preview-box">
                      <QrCode size={110} />
                      <span className="qr-scan-badge">VietQR 24/7</span>
                    </div>
                    <small>Mở App ngân hàng bất kỳ để quét mã</small>
                  </div>

                  <div className="transfer-info-list">
                    <div className="info-row">
                      <span>Ngân hàng:</span>
                      <strong>MB Bank (Quân Đội)</strong>
                    </div>
                    <div className="info-row">
                      <span>Số tài khoản:</span>
                      <div className="copyable-val">
                        <strong>090123456789</strong>
                        <button
                          type="button"
                          onClick={() => handleCopy("090123456789")}
                          className="copy-btn"
                          aria-label="Sao chép số tài khoản"
                        >
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="info-row">
                      <span>Chủ tài khoản:</span>
                      <strong>CONG TY TNHH PC STORE VIET NAM</strong>
                    </div>
                    <div className="info-row">
                      <span>Số tiền:</span>
                      <strong className="transfer-amount">
                        {formatPrice(finalTotal)}
                      </strong>
                    </div>
                    <div className="info-row">
                      <span>Nội dung chuyển khoản:</span>
                      <div className="copyable-val">
                        <strong className="transfer-note-code">
                          {order}
                        </strong>
                        <button
                          type="button"
                          onClick={() => handleCopy(order)}
                          className="copy-btn"
                          aria-label="Sao chép nội dung"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="transfer-footer-alert">
                  <ShieldCheck size={18} />
                  <span>
                    Hệ thống sẽ tự động xác nhận đơn hàng sau 2-5 phút khi nhận được thanh toán.
                  </span>
                </div>
              </div>
            ) : (
              <div className="cod-instruction-box">
                <p>
                  Phương thức: <strong>Thanh toán tiền mặt khi nhận hàng (COD)</strong>.
                </p>
                <small>
                  Nhân viên giao nhận sẽ liên hệ số điện thoại trước khi giao. Vui lòng chuẩn bị sẵn số tiền {formatPrice(finalTotal)}.
                </small>
              </div>
            )}

            <div className="order-success-actions">
              <Link className="button button-primary" href="/orders">
                Theo dõi trong Đơn hàng của tôi
              </Link>
              <Link className="button button-outline" href="/products">
                Tiếp tục mua sắm
              </Link>
            </div>
          </section>
        ) : !lines.length ? (
          <section className="shopping-empty">
            <ShoppingBag size={54} className="shopping-empty-bag" />
            <h2>Giỏ hàng của bạn đang trống</h2>
            <p>
              Hãy khám phá danh mục linh kiện, laptop hoặc bắt đầu tự ráp một cấu hình PC mới.
            </p>
            <div className="shopping-empty-actions">
              <Link className="button button-primary" href="/products">
                Khám phá sản phẩm
              </Link>
              <Link className="button button-outline" href="/builder">
                Đi đến PC Builder
              </Link>
              <button
                className="button"
                onClick={() => {
                  add("p1", 1);
                  add("p5", 2);
                  toast("Đã thêm 2 sản phẩm mẫu vào giỏ hàng!", "info");
                }}
              >
                Thử giỏ mẫu nhanh
              </button>
            </div>
          </section>
        ) : (
          <div className="shopping-layout">
            <section
              aria-label={
                checkout ? "Thông tin giao hàng & thanh toán" : "Sản phẩm trong giỏ"
              }
              className="shopping-main-col"
            >
              {checkout ? (
                <form
                  id="checkout-form"
                  className="shipping-form"
                  onSubmit={submit}
                >
                  {/* Address Section */}
                  <div className="form-section-card">
                    <div className="form-section-title">
                      <MapPin size={20} />
                      <h2>Địa chỉ nhận hàng</h2>
                    </div>

                    <div className="address-tabs">
                      <button
                        type="button"
                        className={`address-tab ${addressMode === "saved" ? "active" : ""}`}
                        onClick={() => setAddressMode("saved")}
                      >
                        Sổ địa chỉ đã lưu (2)
                      </button>
                      <button
                        type="button"
                        className={`address-tab ${addressMode === "custom" ? "active" : ""}`}
                        onClick={() => setAddressMode("custom")}
                      >
                        + Nhập địa chỉ mới
                      </button>
                    </div>

                    {addressMode === "saved" ? (
                      <div className="saved-addresses-list">
                        {savedAddresses.map((addr) => (
                          <label
                            key={addr.id}
                            className={`saved-address-card ${selectedAddrId === addr.id ? "selected" : ""}`}
                          >
                            <input
                              type="radio"
                              name="saved_address"
                              value={addr.id}
                              checked={selectedAddrId === addr.id}
                              onChange={() => setSelectedAddrId(addr.id)}
                            />
                            <div className="saved-addr-content">
                              <div className="saved-addr-badge">{addr.label}</div>
                              <strong>{addr.name} · {addr.phone}</strong>
                              <p>{addr.address}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <fieldset disabled={busy} className="custom-address-inputs">
                        <label htmlFor="receiver">Họ và tên người nhận *</label>
                        <input
                          id="receiver"
                          name="name"
                          autoComplete="name"
                          required
                          minLength={2}
                          placeholder="Ví dụ: Nguyễn Văn A"
                        />
                        <label htmlFor="phone">Số điện thoại liên hệ *</label>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          inputMode="tel"
                          pattern="(0[0-9]{9}|\+84[0-9]{9})"
                          required
                          placeholder="0901 234 567"
                        />
                        <label htmlFor="address">Địa chỉ chi tiết *</label>
                        <textarea
                          id="address"
                          name="address"
                          autoComplete="street-address"
                          required
                          minLength={8}
                          rows={3}
                          placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                        />
                      </fieldset>
                    )}

                    <label htmlFor="notes" className="label-notes">
                      Ghi chú đơn hàng (Tùy chọn)
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={2}
                      maxLength={300}
                      placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi đến 15 phút..."
                    />
                  </div>

                  {/* Payment Methods Section */}
                  <div className="form-section-card">
                    <div className="form-section-title">
                      <CreditCard size={20} />
                      <h2>Phương thức thanh toán</h2>
                    </div>

                    <div className="payment-options-grid">
                      <label
                        className={`payment-option-card ${paymentMethod === "COD" ? "selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="payment_method"
                          value="COD"
                          checked={paymentMethod === "COD"}
                          onChange={() => setPaymentMethod("COD")}
                        />
                        <div className="payment-option-body">
                          <div className="payment-option-title">
                            <strong>Thanh toán khi nhận hàng (COD)</strong>
                            <span className="payment-type-badge">Tiền mặt</span>
                          </div>
                          <p>
                            Thanh toán trực tiếp cho nhân viên giao hàng sau khi đồng kiểm hàng hóa.
                          </p>
                        </div>
                      </label>

                      <label
                        className={`payment-option-card ${paymentMethod === "BANK_TRANSFER" ? "selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="payment_method"
                          value="BANK_TRANSFER"
                          checked={paymentMethod === "BANK_TRANSFER"}
                          onChange={() => setPaymentMethod("BANK_TRANSFER")}
                        />
                        <div className="payment-option-body">
                          <div className="payment-option-title">
                            <strong>Chuyển khoản VietQR 24/7</strong>
                            <span className="payment-type-badge popular">Khuyên dùng</span>
                          </div>
                          <p>
                            Quét mã QR tiện lợi qua app ngân hàng bất kỳ, xác nhận đơn tự động.
                          </p>
                        </div>
                      </label>
                    </div>

                    {paymentMethod === "BANK_TRANSFER" && (
                      <div className="bank-preview-notice">
                        <QrCode size={20} />
                        <span>
                          Mã QR VietQR và thông tin tài khoản chuyển khoản sẽ xuất hiện ngay sau khi bạn bấm Xác nhận đơn hàng.
                        </span>
                      </div>
                    )}

                    <details className="demo-scenarios">
                      <summary>⚙️ Giả lập kịch bản kiểm thử API</summary>
                      <label htmlFor="scenario">Kết quả đặt hàng:</label>
                      <select
                        id="scenario"
                        value={scenario}
                        onChange={(event) => setScenario(event.target.value)}
                      >
                        <option value="success">Thành công (200 OK)</option>
                        <option value="stock">Không đủ tồn kho (409 Conflict)</option>
                        <option value="price">Giá thay đổi (400 Bad Request)</option>
                      </select>
                    </details>
                  </div>

                  {error && (
                    <div role="alert" className="form-message error">
                      <span>{error}</span>
                      <Link href="/cart">Quay lại kiểm tra giỏ hàng</Link>
                    </div>
                  )}
                </form>
              ) : (
                /* Cart Items List */
                <div className="cart-lines">
                  {lines.map(({ product, quantity }) => (
                    <article className="cart-line" key={product.id}>
                      <div
                        className="cart-category"
                        style={{ background: product.accent }}
                        aria-hidden="true"
                      >
                        {product.name.slice(0, 1)}
                      </div>
                      <div className="cart-line-info">
                        <span className="cart-item-brand">{product.brand} · {product.category}</span>
                        <h2>
                          <Link href={`/products/${product.slug}`}>
                            {product.name}
                          </Link>
                        </h2>
                        <p className="cart-unit-price">
                          {formatPrice(product.price)} / sản phẩm
                        </p>
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
                            onClick={() => {
                              update(product.id, 0);
                              toast(`Đã gỡ "${product.name}" khỏi giỏ`, "info");
                            }}
                            aria-label={`Xóa ${product.name}`}
                          >
                            <Trash2 size={16} /> Gỡ bỏ
                          </button>
                        </div>
                        {quantity >= product.stock && (
                          <small className="stock-limit-note">
                            Đã đạt số lượng tồn kho tối đa ({product.stock}).
                          </small>
                        )}
                      </div>
                      <strong className="line-total">
                        {formatPrice(product.price * quantity)}
                      </strong>
                    </article>
                  ))}
                  <div className="cart-actions-row">
                    <Link className="text-link" href="/products">
                      ← Tiếp tục chọn thêm linh kiện
                    </Link>
                    <button
                      className="button button-outline clear-cart-btn"
                      onClick={() => {
                        clear();
                        toast("Đã làm trống giỏ hàng!", "info");
                      }}
                    >
                      Làm trống giỏ hàng
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Order Summary Sidebar */}
            <aside className="order-summary" aria-label="Tóm tắt đơn hàng">
              <h2>Tóm tắt thanh toán</h2>

              {checkout && (
                <div className="summary-items-list">
                  {lines.map(({ product, quantity }) => (
                    <div className="summary-product" key={product.id}>
                      <span className="summary-product-name">
                        {product.name} <small>×{quantity}</small>
                      </span>
                      <strong>{formatPrice(product.price * quantity)}</strong>
                    </div>
                  ))}
                </div>
              )}

              {/* Promo Code Box */}
              <div className="promo-box">
                <label htmlFor="promo" className="promo-label">
                  <Tag size={15} /> Mã giảm giá / Ưu đãi
                </label>
                <div className="promo-input-row">
                  <input
                    id="promo"
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Nhập PCSTORE50K hoặc VIPBUILD"
                    className="promo-input"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="promo-apply-btn"
                  >
                    Áp dụng
                  </button>
                </div>
                {appliedDiscount && (
                  <div className="applied-discount-tag">
                    <span>
                      Mã <b>{appliedDiscount.code}</b>: Giảm {formatPrice(appliedDiscount.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAppliedDiscount(null)}
                      className="remove-promo-btn"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              <dl className="summary-calculations">
                <div>
                  <dt>Tạm tính hàng ({lines.length} món)</dt>
                  <dd>{formatPrice(subtotal)}</dd>
                </div>
                {appliedDiscount && (
                  <div className="discount-row">
                    <dt>Khuyến mãi voucher</dt>
                    <dd>-{formatPrice(appliedDiscount.amount)}</dd>
                  </div>
                )}
                <div>
                  <dt>Phí vận chuyển</dt>
                  <dd className="free-shipping">Miễn phí</dd>
                </div>
                <div className="summary-total">
                  <dt>Tổng cộng</dt>
                  <dd>{formatPrice(finalTotal)}</dd>
                </div>
              </dl>

              {checkout ? (
                <button
                  form="checkout-form"
                  type="submit"
                  className="button button-primary checkout-submit-btn"
                  disabled={busy}
                >
                  {busy ? "Đang tạo đơn hàng…" : "Xác nhận đặt đơn"}
                </button>
              ) : (
                <Link className="button button-primary" href="/checkout">
                  Tiến hành đặt hàng <ArrowRight size={16} />
                </Link>
              )}

              <div className="summary-security-commitments">
                <ShieldCheck size={16} />
                <span>Bảo mật thanh toán 100% · Đổi trả linh kiện miễn phí</span>
              </div>

              {checkout && (
                <Link href="/cart" className="back-to-cart-link">
                  ← Quay lại chỉnh sửa giỏ hàng
                </Link>
              )}
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

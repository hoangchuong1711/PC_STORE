"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Clock3,
  PackageCheck,
  PackageOpen,
  Truck,
  RotateCcw,
  XCircle,
  QrCode,
  CreditCard,
  Star,
  CheckCircle2,
} from "lucide-react";
import { Footer, Header } from "./storefront";
import { useCart } from "./cart-provider";
import { useToast } from "./toast";
import { formatPrice } from "../lib/products";
import {
  filterOrders,
  formatOrderDate,
  getOrderProgress,
  orderStatusLabels,
  paymentMethodLabels,
  paymentStatusLabels,
  orders as initialOrders,
  type Order,
  type OrderFilter,
  type OrderStatus,
} from "../lib/orders";
import "./orders.css";

const filters: { value: OrderFilter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING", label: "Chờ xác nhận" },
  { value: "SHIPPING", label: "Đang giao" },
  { value: "DELIVERED", label: "Đã giao" },
  { value: "CANCELLED", label: "Đã hủy" },
];

const progressSteps: {
  value: OrderStatus;
  label: string;
  icon: typeof Clock3;
}[] = [
  { value: "PENDING", label: "Đã đặt hàng", icon: Clock3 },
  { value: "CONFIRMED", label: "Đã xác nhận", icon: Check },
  { value: "SHIPPING", label: "Đang giao", icon: Truck },
  { value: "DELIVERED", label: "Đã giao", icon: PackageCheck },
];

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`order-status status-${status.toLowerCase()}`}>
      {orderStatusLabels[status]}
    </span>
  );
}

function OrderRow({
  order,
  onReorder,
}: {
  order: Order;
  onReorder: (order: Order) => void;
}) {
  const itemCount = order.lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <article className="order-row">
      <div className="order-row-number">
        <span>Mã đơn hàng</span>
        <strong>{order.code}</strong>
        <small>{formatOrderDate(order.createdAt)}</small>
      </div>

      <div className="order-row-products">
        <span>{itemCount} sản phẩm</span>
        <strong>{order.lines.map((line) => line.name).join(" · ")}</strong>
      </div>

      <div className="order-row-status-col">
        <StatusBadge status={order.status} />
        <small className="order-payment-method-tag">
          {order.paymentMethod === "BANK_TRANSFER" ? "VietQR 24/7" : "COD"}
        </small>
      </div>

      <div className="order-row-total">
        <span>Tổng thanh toán</span>
        <strong>{formatPrice(order.total)}</strong>
      </div>

      <div className="order-row-actions">
        <button
          type="button"
          className="order-row-reorder-btn"
          onClick={() => onReorder(order)}
          title="Thêm lại sản phẩm vào giỏ"
        >
          <RotateCcw size={14} /> Mua lại
        </button>
        <Link
          href={`/orders/${order.id}`}
          className="order-row-link"
          aria-label={`Xem chi tiết đơn ${order.code}`}
        >
          Chi tiết <ChevronRight size={17} />
        </Link>
      </div>
    </article>
  );
}

export function OrdersPage() {
  const [orderList] = useState<Order[]>(initialOrders);
  const [filter, setFilter] = useState<OrderFilter>("ALL");
  const [scenario, setScenario] = useState<"content" | "empty" | "error">(
    "content",
  );
  const { add } = useCart();
  const { toast } = useToast();

  const handleReorder = (order: Order) => {
    order.lines.forEach((line) => {
      add(line.productId, line.quantity);
    });
    toast(`Đã thêm ${order.lines.length} sản phẩm của đơn ${order.code} vào giỏ hàng!`, "success");
  };

  const visibleOrders = useMemo(
    () => (scenario === "content" ? filterOrders(orderList, filter) : []),
    [filter, scenario, orderList],
  );

  return (
    <>
      <Header />
      <main className="container orders-page">
        <div className="orders-heading">
          <div>
            <span className="eyebrow">Tài khoản · Quản lý mua sắm</span>
            <h1>Đơn hàng của tôi.</h1>
            <p>
              Theo dõi lộ trình giao hàng, kiểm tra chi tiết linh kiện và thanh toán.
            </p>
          </div>
          <label className="order-scenario">
            <span>Tình huống giả lập:</span>
            <select
              value={scenario}
              onChange={(event) =>
                setScenario(event.target.value as "content" | "empty" | "error")
              }
            >
              <option value="content">Danh sách đơn mẫu</option>
              <option value="empty">Tài khoản chưa có đơn</option>
              <option value="error">Mô phỏng lỗi kết nối API</option>
            </select>
          </label>
        </div>

        <div className="order-filters" role="group" aria-label="Lọc đơn hàng">
          {filters.map((item) => (
            <button
              key={item.value}
              className={filter === item.value ? "active" : ""}
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
            >
              {item.label}
            </button>
          ))}
        </div>

        {scenario === "error" ? (
          <section className="orders-message" role="alert">
            <AlertCircle size={38} aria-hidden="true" />
            <h2>Không thể tải danh sách đơn hàng</h2>
            <p>Lỗi kết nối máy chủ Tomcat. Vui lòng kiểm tra lại dịch vụ backend.</p>
            <button
              className="button button-primary"
              onClick={() => setScenario("content")}
            >
              Thử tải lại
            </button>
          </section>
        ) : visibleOrders.length ? (
          <section className="order-list" aria-label="Danh sách đơn hàng">
            <div className="order-list-caption">
              <span>Hiển thị {visibleOrders.length} đơn hàng</span>
              <span>Cập nhật tự động · Thời gian thực</span>
            </div>
            {visibleOrders.map((order) => (
              <OrderRow key={order.id} order={order} onReorder={handleReorder} />
            ))}
          </section>
        ) : (
          <section className="orders-message">
            <PackageOpen size={48} aria-hidden="true" />
            <h2>Chưa có đơn hàng nào ở mục này</h2>
            <p>
              {scenario === "empty"
                ? "Bạn chưa có đơn hàng nào. Hãy khám phá linh kiện hoặc tạo dàn PC mới!"
                : "Không tìm thấy đơn hàng nào ở trạng thái đã chọn."}
            </p>
            <Link className="button button-primary" href="/products">
              Khám phá linh kiện ngay
            </Link>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

export function OrderDetail({ order: initialOrder }: { order: Order }) {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("Đổi ý không muốn mua nữa");
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const progress = getOrderProgress(order.status);
  const { add } = useCart();
  const { toast } = useToast();

  const handleReorder = () => {
    order.lines.forEach((line) => {
      add(line.productId, line.quantity);
    });
    toast(`Đã thêm ${order.lines.length} sản phẩm vào giỏ hàng!`, "success");
  };

  const handleConfirmCancel = () => {
    setOrder((prev) => ({
      ...prev,
      status: "CANCELLED",
      cancelReason,
    }));
    setCancelModalOpen(false);
    toast(`Đã hủy đơn hàng ${order.code}!`, "info");
  };

  return (
    <>
      <Header />
      <main className="container order-detail-page">
        <nav className="breadcrumb" aria-label="Đường dẫn">
          <Link href="/">Trang chủ</Link>
          <span>/</span>
          <Link href="/orders">Đơn hàng của tôi</Link>
          <span>/</span>
          <span>{order.code}</span>
        </nav>

        <div className="order-detail-heading">
          <div>
            <span className="eyebrow">
              Thời gian đặt: {formatOrderDate(order.createdAt)}
            </span>
            <h1>Đơn hàng #{order.code}</h1>
          </div>
          <div className="order-detail-header-actions">
            <StatusBadge status={order.status} />
            <button
              type="button"
              className="button button-outline detail-reorder-btn"
              onClick={handleReorder}
            >
              <RotateCcw size={15} /> Mua lại
            </button>
            {order.status === "PENDING" && (
              <button
                type="button"
                className="cancel-order-btn"
                onClick={() => setCancelModalOpen(true)}
              >
                <XCircle size={15} /> Hủy đơn hàng
              </button>
            )}
          </div>
        </div>

        {/* Cancelled Alert or Progress Tracker */}
        {order.status === "CANCELLED" ? (
          <section className="cancelled-note" role="alert">
            <AlertCircle size={28} className="cancelled-alert-icon" />
            <div>
              <strong>Đơn hàng đã được hủy</strong>
              <p>
                Lý do: {order.cancelReason || "Người mua yêu cầu hủy đơn."}.
                Tồn kho linh kiện đã được giải phóng tự động.
              </p>
            </div>
          </section>
        ) : (
          <ol className="order-progress" aria-label="Tiến trình đơn hàng">
            {progressSteps.map((step) => {
              const reached = progress.includes(step.value);
              const Icon = step.icon;
              return (
                <li key={step.value} className={reached ? "reached" : ""}>
                  <span className="progress-icon">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <span className="progress-step-label">{step.label}</span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="order-detail-grid">
          {/* Products Panel */}
          <section className="order-products-panel">
            <div className="panel-heading">
              <h2>Danh sách linh kiện trong đơn</h2>
              <span>{order.lines.length} sản phẩm</span>
            </div>

            {order.lines.map((line) => (
              <article className="ordered-product" key={line.productId}>
                <div className="ordered-product-mark" aria-hidden="true">
                  {line.name.slice(0, 1)}
                </div>
                <div className="ordered-product-info">
                  <span className="ordered-cat">{line.category}</span>
                  <h3>
                    <Link href={`/products/${line.slug}`}>{line.name}</Link>
                  </h3>
                  <p>
                    Đơn giá: {formatPrice(line.unitPrice)} · Số lượng: <b>{line.quantity}</b>
                  </p>
                  {order.status === "DELIVERED" && (
                    <button
                      type="button"
                      className="line-review-btn"
                      onClick={() =>
                        toast(`Tính năng đánh giá sẽ mở ở Giai đoạn 3!`, "info")
                      }
                    >
                      <Star size={14} /> Viết đánh giá linh kiện
                    </button>
                  )}
                </div>
                <strong className="ordered-line-total">
                  {formatPrice(line.unitPrice * line.quantity)}
                </strong>
              </article>
            ))}

            <dl className="order-total">
              <div>
                <dt>Phí vận chuyển</dt>
                <dd>Miễn phí</dd>
              </div>
              <div>
                <dt>Phương thức thanh toán</dt>
                <dd>{paymentMethodLabels[order.paymentMethod]}</dd>
              </div>
              <div className="order-total-sum">
                <dt>Tổng cộng</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </section>

          {/* Recipient & Payment Panel */}
          <aside className="recipient-panel">
            <div className="panel-sub-card">
              <span className="eyebrow">Địa chỉ nhận hàng</span>
              <h2>{order.recipient.name}</h2>
              <p className="recipient-phone">{order.recipient.phone}</p>
              <p className="recipient-address">{order.recipient.address}</p>
            </div>

            <div className="panel-sub-card payment-detail-card">
              <span className="eyebrow">Chi tiết thanh toán</span>
              <div className="payment-type-row">
                <CreditCard size={18} />
                <strong>{paymentMethodLabels[order.paymentMethod]}</strong>
              </div>

              <div className="payment-status-row">
                <span>Trạng thái tiền:</span>
                <span
                  className={`payment-pill ${order.paymentStatus === "PAID" ? "paid" : "pending"}`}
                >
                  {paymentStatusLabels[order.paymentStatus]}
                </span>
              </div>

              {order.paymentMethod === "BANK_TRANSFER" && (
                <div className="bank-action-box">
                  {order.paymentStatus === "PENDING" && order.status !== "CANCELLED" ? (
                    <button
                      type="button"
                      className="button button-outline view-qr-btn"
                      onClick={() => setQrModalOpen(true)}
                    >
                      <QrCode size={16} /> Quét mã VietQR chuyển khoản
                    </button>
                  ) : (
                    <div className="paid-check-badge">
                      <CheckCircle2 size={16} /> Đã nhận được thanh toán
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="support-card">
              <strong>Cần hỗ trợ về đơn hàng này?</strong>
              <p>Hotline CSKH: 1900 6868 hoặc nhắn qua Zalo hỗ trợ kỹ thuật.</p>
            </div>
          </aside>
        </div>

        {/* Cancel Confirmation Modal */}
        {cancelModalOpen && (
          <div
            className="modal-overlay"
            onClick={() => setCancelModalOpen(false)}
          >
            <div
              className="modal-content"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="cancel-title">Xác nhận hủy đơn hàng</h2>
              <p>
                Bạn có chắc chắn muốn hủy đơn hàng <b>{order.code}</b> không?
              </p>
              <label htmlFor="cancelReasonSelect" className="cancel-reason-label">
                Lý do hủy đơn:
              </label>
              <select
                id="cancelReasonSelect"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="cancel-select"
              >
                <option value="Đổi ý không muốn mua nữa">Đổi ý không muốn mua nữa</option>
                <option value="Muốn thay đổi địa chỉ nhận hàng">Muốn thay đổi địa chỉ nhận hàng</option>
                <option value="Muốn đổi sang linh kiện khác">Muốn đổi sang linh kiện khác</option>
                <option value="Tìm thấy giá rẻ hơn ở nơi khác">Tìm thấy giá rẻ hơn ở nơi khác</option>
                <option value="Khác">Khác...</option>
              </select>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setCancelModalOpen(false)}
                >
                  Không, giữ lại đơn
                </button>
                <button
                  type="button"
                  className="button button-danger"
                  onClick={handleConfirmCancel}
                >
                  Xác nhận hủy đơn
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VietQR View Modal */}
        {qrModalOpen && (
          <div className="modal-overlay" onClick={() => setQrModalOpen(false)}>
            <div
              className="modal-content qr-modal"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <h2>Mã QR chuyển khoản đơn {order.code}</h2>
              <div className="qr-preview-box">
                <QrCode size={140} />
                <span className="qr-scan-badge">VietQR 24/7</span>
              </div>
              <div className="qr-modal-details">
                <p>Ngân hàng: <b>MB Bank</b></p>
                <p>STK: <b>090123456789</b></p>
                <p>Chủ tài khoản: <b>CONG TY TNHH PC STORE VIET NAM</b></p>
                <p>Số tiền: <b>{formatPrice(order.total)}</b></p>
                <p>Nội dung: <b>{order.code}</b></p>
              </div>
              <button
                type="button"
                className="button button-primary"
                onClick={() => setQrModalOpen(false)}
              >
                Đã hiểu, đóng cửa sổ
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

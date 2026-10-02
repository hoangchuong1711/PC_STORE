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
} from "lucide-react";
import { Footer, Header } from "./storefront";
import { formatPrice } from "../lib/products";
import {
  filterOrders,
  formatOrderDate,
  getOrderProgress,
  orderStatusLabels,
  orders,
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

function OrderRow({ order }: { order: Order }) {
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
      <StatusBadge status={order.status} />
      <div className="order-row-total">
        <span>Tổng cộng</span>
        <strong>{formatPrice(order.total)}</strong>
      </div>
      <Link
        href={`/orders/${order.id}`}
        className="order-row-link"
        aria-label={`Xem chi tiết đơn ${order.code}`}
      >
        Chi tiết <ChevronRight size={17} />
      </Link>
    </article>
  );
}

export function OrdersPage() {
  const [filter, setFilter] = useState<OrderFilter>("ALL");
  const [scenario, setScenario] = useState<"content" | "empty" | "error">(
    "content",
  );
  const visibleOrders = useMemo(
    () => (scenario === "content" ? filterOrders(orders, filter) : []),
    [filter, scenario],
  );

  return (
    <>
      <Header />
      <main className="container orders-page">
        <div className="orders-heading">
          <div>
            <span className="eyebrow">Tài khoản · Đơn hàng</span>
            <h1>Lịch sử mua sắm.</h1>
            <p>
              Theo dõi trạng thái và xem lại từng món trong các đơn hàng mẫu.
            </p>
          </div>
          <label className="order-scenario">
            <span>Tình huống xem thử</span>
            <select
              value={scenario}
              onChange={(event) =>
                setScenario(event.target.value as "content" | "empty" | "error")
              }
            >
              <option value="content">Có đơn hàng</option>
              <option value="empty">Chưa có đơn</option>
              <option value="error">Lỗi tải dữ liệu</option>
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
            <h2>Chưa thể tải đơn hàng</h2>
            <p>Đây là trạng thái lỗi mẫu để chuẩn bị cho bước kết nối API.</p>
            <button
              className="button button-primary"
              onClick={() => setScenario("content")}
            >
              Thử lại
            </button>
          </section>
        ) : visibleOrders.length ? (
          <section className="order-list" aria-label="Danh sách đơn hàng">
            <div className="order-list-caption">
              <span>{visibleOrders.length} đơn hàng mẫu</span>
              <span>Cập nhật gần nhất · 18/10/2025</span>
            </div>
            {visibleOrders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </section>
        ) : (
          <section className="orders-message">
            <PackageOpen size={42} aria-hidden="true" />
            <h2>Chưa có đơn hàng ở đây</h2>
            <p>
              {scenario === "empty"
                ? "Khi hoàn tất mua sắm, đơn hàng của bạn sẽ xuất hiện tại đây."
                : "Chưa có đơn hàng nào khớp với trạng thái đã chọn."}
            </p>
            <Link className="button button-primary" href="/products">
              Khám phá sản phẩm
            </Link>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

export function OrderDetail({ order }: { order: Order }) {
  const progress = getOrderProgress(order.status);

  return (
    <>
      <Header />
      <main className="container order-detail-page">
        <nav className="breadcrumb" aria-label="Đường dẫn">
          <Link href="/orders">Đơn hàng</Link>
          <span>/</span>
          <span>{order.code}</span>
        </nav>

        <div className="order-detail-heading">
          <div>
            <span className="eyebrow">
              Đặt lúc {formatOrderDate(order.createdAt)}
            </span>
            <h1>Đơn {order.code}</h1>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {order.status === "CANCELLED" ? (
          <section className="cancelled-note">
            <AlertCircle size={24} aria-hidden="true" />
            <div>
              <strong>Đơn hàng đã được hủy</strong>
              <p>Không có hoạt động giao hàng nào tiếp theo cho đơn này.</p>
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
                  <span>{step.label}</span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="order-detail-grid">
          <section className="order-products-panel">
            <div className="panel-heading">
              <h2>Sản phẩm</h2>
              <span>{order.lines.length} dòng sản phẩm</span>
            </div>
            {order.lines.map((line) => (
              <article className="ordered-product" key={line.productId}>
                <div className="ordered-product-mark" aria-hidden="true">
                  {line.name.slice(0, 1)}
                </div>
                <div>
                  <span>{line.category}</span>
                  <h3>
                    <Link href={`/products/${line.slug}`}>{line.name}</Link>
                  </h3>
                  <p>
                    {formatPrice(line.unitPrice)} × {line.quantity}
                  </p>
                </div>
                <strong>{formatPrice(line.unitPrice * line.quantity)}</strong>
              </article>
            ))}
            <dl className="order-total">
              <div>
                <dt>Phí giao hàng</dt>
                <dd>Miễn phí</dd>
              </div>
              <div>
                <dt>Tổng cộng</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </section>

          <aside className="recipient-panel">
            <span className="eyebrow">Giao đến</span>
            <h2>{order.recipient.name}</h2>
            <p>{order.recipient.phone}</p>
            <p>{order.recipient.address}</p>
            <div className="payment-note">
              <span>Thanh toán</span>
              <strong>COD · Khi nhận hàng</strong>
            </div>
            <p className="fixture-note">
              Thông tin mẫu phục vụ kiểm tra giao diện. Dữ liệu thật sẽ đến từ
              API đơn hàng.
            </p>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}

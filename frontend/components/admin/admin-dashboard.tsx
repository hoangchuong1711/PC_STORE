"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Package,
  Plus,
  ShoppingBag,
  TrendingUp,
  TriangleAlert,
  Users,
} from "lucide-react";
import {
  dashboardRevenueTrend,
  formatAdminDate,
  formatAdminPrice,
  initialAdminOrders,
  initialAdminProducts,
  orderStatusLabels,
  productStatusLabels,
  type DashboardChartPoint,
} from "../../lib/admin";

const numberFormat = new Intl.NumberFormat("vi-VN");

const statusTone: Record<string, string> = {
  PENDING: "is-warning",
  CONFIRMED: "is-info",
  SHIPPING: "is-info",
  DELIVERED: "is-success",
  CANCELLED: "is-muted",
  ACTIVE: "is-success",
  DRAFT: "is-warning",
  HIDDEN: "is-muted",
  OUT_OF_STOCK: "is-danger",
};

export function AdminDashboard() {
  const [activeChartPoint, setActiveChartPoint] = useState<DashboardChartPoint | null>(
    dashboardRevenueTrend[dashboardRevenueTrend.length - 1],
  );

  const activeProducts = initialAdminProducts.filter((product) => product.status !== "DISCONTINUED");
  const lowStockProducts = activeProducts
    .filter((product) => product.stock <= 5)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);
  const pendingOrders = initialAdminOrders.filter((order) => order.status === "PENDING").length;
  const paidRevenue = initialAdminOrders
    .filter((order) => order.status !== "CANCELLED")
    .reduce((sum, order) => sum + order.total, 0);

  const maxRevenue = Math.max(...dashboardRevenueTrend.map((p) => p.revenue), 60_000_000);
  const chartHeight = 160;
  const chartWidth = 520;
  const paddingX = 40;
  const paddingY = 24;

  const points = dashboardRevenueTrend.map((point, index) => {
    const x = paddingX + (index * (chartWidth - 2 * paddingX)) / (dashboardRevenueTrend.length - 1);
    const y = chartHeight - paddingY - (point.revenue / maxRevenue) * (chartHeight - 2 * paddingY);
    return { ...point, x, y };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPoints = `${points[0].x},${chartHeight - paddingY} ${polylinePoints} ${
    points[points.length - 1].x
  },${chartHeight - paddingY}`;

  const stats = [
    {
      label: "Sản phẩm đang quản lý",
      value: numberFormat.format(activeProducts.length),
      note: "2 cập nhật tuần này",
      icon: Package,
      tone: "is-blue",
    },
    {
      label: "Đơn cần xử lý",
      value: numberFormat.format(pendingOrders),
      note: "Cần kiểm tra trong hôm nay",
      icon: ClipboardList,
      tone: "is-amber",
    },
    {
      label: "Doanh thu kỳ này",
      value: formatAdminPrice(paidRevenue),
      note: "Từ các đơn chưa hủy",
      icon: ShoppingBag,
      tone: "is-green",
    },
    {
      label: "Sản phẩm sắp hết",
      value: numberFormat.format(lowStockProducts.length),
      note: "Tồn kho từ 5 sản phẩm trở xuống",
      icon: TriangleAlert,
      tone: "is-red",
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-heading admin-dashboard-heading">
        <div>
          <span className="admin-eyebrow">Thứ ba, 06 tháng 10, 2026</span>
          <h1>Chào buổi sáng, Minh Anh</h1>
          <p>Dưới đây là bức tranh vận hành tổng thể về đơn hàng, kho và doanh thu hôm nay.</p>
        </div>
        <div className="admin-heading-actions">
          <Link href="/admin/products" className="admin-button admin-button-secondary">
            <Package size={16} />
            Xem sản phẩm
          </Link>
          <Link href="/admin/orders" className="admin-button admin-button-primary">
            <ClipboardList size={16} />
            Xử lý đơn hàng
          </Link>
        </div>
      </div>

      <section className="admin-stat-grid" aria-label="Chỉ số cửa hàng">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article className="admin-stat-card" key={stat.label}>
              <div className={`admin-stat-icon ${stat.tone}`}>
                <Icon size={18} />
              </div>
              <div className="admin-stat-copy">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <small>{stat.note}</small>
              </div>
            </article>
          );
        })}
      </section>

      {/* Biểu đồ xu hướng doanh thu 7 ngày */}
      <section className="admin-panel admin-chart-panel" aria-label="Xu hướng doanh thu">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-panel-kicker">Phân tích dòng tiền</span>
            <h2>Doanh thu & Số lượng đơn 7 ngày qua</h2>
          </div>
          {activeChartPoint && (
            <div className="admin-chart-tooltip-badge">
              <strong>{activeChartPoint.fullDate}:</strong>{" "}
              <span>{formatAdminPrice(activeChartPoint.revenue)}</span> ·{" "}
              <small>{activeChartPoint.orders} đơn</small>
            </div>
          )}
        </div>

        <div className="admin-chart-container">
          <svg
            className="admin-revenue-svg"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4b6e91" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#4b6e91" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Đường lưới ngang */}
            <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="#e4e8ec" strokeWidth="1" />
            <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="#edf0f3" strokeDasharray="3 3" strokeWidth="1" />
            <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="#edf0f3" strokeDasharray="3 3" strokeWidth="1" />

            {/* Vùng mờ diện tích */}
            <polygon points={areaPoints} fill="url(#revenueFill)" />

            {/* Đường biểu đồ doanh thu */}
            <polyline points={polylinePoints} fill="none" stroke="#346294" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Cột số lượng đơn hàng (Bar representation) */}
            {points.map((p) => {
              const barHeight = p.orders * 18;
              const barY = chartHeight - paddingY - barHeight;
              return (
                <rect
                  key={`bar-${p.label}`}
                  x={p.x - 5}
                  y={barY}
                  width="10"
                  height={barHeight}
                  rx="3"
                  className="admin-chart-bar"
                  opacity="0.35"
                />
              );
            })}

            {/* Điểm tròn tương tác */}
            {points.map((p) => {
              const isHovered = activeChartPoint?.label === p.label;
              return (
                <g key={p.label} className="admin-chart-point-group" onMouseEnter={() => setActiveChartPoint(p)}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 6 : 4}
                    className={`admin-chart-dot ${isHovered ? "is-active" : ""}`}
                  />
                  <text
                    x={p.x}
                    y={chartHeight - 6}
                    textAnchor="middle"
                    className="admin-chart-axis-label"
                  >
                    {p.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="admin-chart-legend">
          <span className="admin-legend-item">
            <span className="admin-legend-line" /> Doanh thu (VNĐ)
          </span>
          <span className="admin-legend-item">
            <span className="admin-legend-bar" /> Số đơn phát sinh
          </span>
          <span className="admin-legend-note">Rê chuột vào điểm dữ liệu để xem chi tiết từng ngày</span>
        </div>
      </section>

      <div className="admin-dashboard-grid">
        <section className="admin-panel admin-recent-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-kicker">Dòng tiền mới nhất</span>
              <h2>Đơn hàng gần đây</h2>
            </div>
            <Link href="/admin/orders" className="admin-text-link">
              Xem tất cả <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table admin-dashboard-orders">
              <thead>
                <tr>
                  <th>Đơn hàng</th>
                  <th>Khách hàng</th>
                  <th>Trạng thái</th>
                  <th className="align-right">Tổng tiền</th>
                </tr>
              </thead>
              <tbody>
                {initialAdminOrders.slice(0, 4).map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong className="admin-table-primary">{order.code}</strong>
                      <span className="admin-table-secondary">{formatAdminDate(order.createdAt)}</span>
                    </td>
                    <td>
                      <strong className="admin-table-primary">{order.customerName}</strong>
                      <span className="admin-table-secondary">{order.itemCount} sản phẩm</span>
                    </td>
                    <td>
                      <span className={`admin-status-pill ${statusTone[order.status]}`}>
                        {orderStatusLabels[order.status]}
                      </span>
                    </td>
                    <td className="align-right admin-price-cell">{formatAdminPrice(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-panel admin-stock-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-kicker">Cần bổ sung sớm</span>
              <h2>Tồn kho thấp</h2>
            </div>
            <Link href="/admin/products" className="admin-icon-link" aria-label="Mở danh sách sản phẩm">
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="admin-stock-list">
            {lowStockProducts.map((product) => (
              <Link href="/admin/products" className="admin-stock-item" key={product.id}>
                <span className="admin-product-avatar" style={{ backgroundColor: product.imageColor }}>
                  <Image src={product.imageUrl} alt="" width={34} height={34} unoptimized />
                </span>
                <span className="admin-stock-copy">
                  <strong>{product.name}</strong>
                  <small>{productStatusLabels[product.status]}</small>
                </span>
                <span className={`admin-stock-count ${product.stock === 0 ? "is-empty" : ""}`}>
                  {product.stock === 0 ? "Hết" : `${product.stock} sản phẩm`}
                </span>
              </Link>
            ))}
          </div>
          <Link href="/admin/products" className="admin-panel-footer-link">
            Quản lý tồn kho <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>

      <section className="admin-quick-actions">
        <div className="admin-quick-copy">
          <span className="admin-panel-kicker">Lối tắt thao tác</span>
          <h2>Bắt đầu một việc mới</h2>
          <p>Đi thẳng đến khu vực vận hành bạn thường dùng nhất.</p>
        </div>
        <div className="admin-quick-links">
          <Link href="/admin/products" className="admin-quick-link">
            <span className="admin-quick-link-icon">
              <Plus size={17} />
            </span>
            <span>
              <strong>Thêm sản phẩm</strong>
              <small>Tạo mặt hàng mới vào catalog</small>
            </span>
            <ArrowUpRight size={15} />
          </Link>
          <Link href="/admin/orders" className="admin-quick-link">
            <span className="admin-quick-link-icon">
              <ClipboardList size={17} />
            </span>
            <span>
              <strong>Kiểm tra đơn hàng</strong>
              <small>{pendingOrders} đơn đang chờ xử lý</small>
            </span>
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
}

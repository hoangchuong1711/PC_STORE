"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  formatAdminDate,
  formatAdminPrice,
  orderStatusLabels,
  productStatusLabels,
} from "../../lib/admin";
import { adminProductApi, type AdminProductItem } from "../../lib/admin-product-api";
import { adminOrderApi } from "../../lib/admin-order-api";
import type { OrderResponse } from "../../lib/order-api";
import { buildDashboardData, type DashboardPoint } from "../../lib/dashboard";
import { useAuth } from "../auth-provider";

const numberFormat = new Intl.NumberFormat("vi-VN");

const statusTone: Record<string, string> = {
  PENDING: "bg-admin-amber-soft text-admin-amber",
  CONFIRMED: "bg-admin-blue-soft text-admin-blue",
  SHIPPING: "bg-admin-blue-soft text-admin-blue",
  DELIVERED: "bg-admin-green-soft text-admin-green",
  CANCELLED: "bg-slate-100 text-slate-500",
  ACTIVE: "bg-admin-green-soft text-admin-green",
  DRAFT: "bg-admin-amber-soft text-admin-amber",
  HIDDEN: "bg-slate-100 text-slate-500",
  OUT_OF_STOCK: "bg-admin-red-soft text-admin-red",
};

export function AdminDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState<AdminProductItem[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeChartPoint, setActiveChartPoint] = useState<DashboardPoint | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([adminProductApi.list(), adminOrderApi.list()])
      .then(([loadedProducts, loadedOrders]) => {
        if (!cancelled) {
          setProducts(loadedProducts);
          setOrders(loadedOrders);
          setLoadError("");
        }
      })
      .catch((cause) => {
        if (!cancelled) setLoadError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu tổng quan.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const { activeProducts, lowStockProducts, pendingOrders, paidRevenue, recentOrders, trend } =
    buildDashboardData(products, orders);
  const selectedChartPoint = activeChartPoint ?? trend[trend.length - 1];
  const maxRevenue = Math.max(...trend.map((p) => p.revenue), 1);
  const chartHeight = 160;
  const chartWidth = 520;
  const paddingX = 40;
  const paddingY = 24;

  const points = trend.map((point, index) => {
    const x = paddingX + (index * (chartWidth - 2 * paddingX)) / (trend.length - 1);
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
      note: "Sản phẩm đang bán",
      icon: Package,
      tone: "bg-admin-blue-soft text-admin-blue",
    },
    {
      label: "Đơn cần xử lý",
      value: numberFormat.format(pendingOrders),
      note: "Cần kiểm tra trong hôm nay",
      icon: ClipboardList,
      tone: "bg-admin-amber-soft text-admin-amber",
    },
    {
      label: "Doanh thu đã thanh toán",
      value: formatAdminPrice(paidRevenue),
      note: "Từ các đơn đã thanh toán",
      icon: ShoppingBag,
      tone: "bg-admin-green-soft text-admin-green",
    },
    {
      label: "Sản phẩm sắp hết",
      value: numberFormat.format(lowStockProducts.length),
      note: "Tồn kho từ 5 sản phẩm trở xuống",
      icon: TriangleAlert,
      tone: "bg-admin-red-soft text-admin-red",
    },
  ];

  return (
    <div className="max-w-[1250px] mx-auto font-sans">
      {loading && <p role="status" className="mb-4 text-admin-muted">Đang tải dữ liệu tổng quan...</p>}
      {loadError && <p role="alert" className="mb-4 text-admin-red">{loadError}</p>}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-7">
        <div>
          <span className="block text-[10px] font-bold text-admin-soft tracking-wider uppercase">{new Intl.DateTimeFormat("vi-VN", { dateStyle: "full" }).format(new Date())}</span>
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-admin-ink tracking-tight mt-1 mb-1.5 leading-tight">Xin chào, {user?.fullName ?? "quản trị viên"}</h1>
          <p className="text-sm text-admin-muted max-w-[570px] m-0">Dưới đây là bức tranh vận hành tổng thể về đơn hàng, kho và doanh thu hôm nay.</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/admin/products" className="inline-flex items-center justify-center gap-2 min-h-[38px] px-3.5 rounded-lg text-xs font-bold border border-admin-line bg-white hover:border-[#bbc3cc] hover:bg-admin-bg text-admin-ink transition-colors">
            <Package size={16} />
            Xem sản phẩm
          </Link>
          <Link href="/admin/orders" className="inline-flex items-center justify-center gap-2 min-h-[38px] px-3.5 rounded-lg text-xs font-bold bg-admin-accent-dark hover:bg-[#1e252c] text-white transition-colors">
            <ClipboardList size={16} />
            Xử lý đơn hàng
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5" aria-label="Chỉ số cửa hàng">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article className="flex items-center gap-3.5 min-h-[86px] p-4 rounded-xl border border-admin-line bg-admin-surface shadow-xs" key={stat.label}>
              <div className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-lg ${stat.tone}`}>
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-admin-muted">{stat.label}</span>
                <strong className="block text-xl sm:text-2xl font-extrabold text-admin-ink tracking-tight my-0.5 truncate font-mono">{stat.value}</strong>
                <small className="block text-[10px] text-admin-soft">{stat.note}</small>
              </div>
            </article>
          );
        })}
      </section>

      {/* Biểu đồ xu hướng doanh thu 7 ngày */}
      <section className="rounded-xl border border-admin-line bg-admin-surface p-5 sm:p-6 mb-5" aria-label="Xu hướng doanh thu">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div>
            <span className="block text-[10px] font-bold text-admin-soft tracking-wider uppercase">Phân tích dòng tiền</span>
            <h2 className="text-base font-bold text-admin-ink tracking-tight mt-1 mb-0">Doanh thu & Số lượng đơn 7 ngày qua</h2>
          </div>
          {selectedChartPoint && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-admin-bg border border-admin-line text-xs font-semibold text-admin-ink">
              <strong>{selectedChartPoint.fullDate}:</strong>{" "}
              <span className="text-admin-blue font-bold">{formatAdminPrice(selectedChartPoint.revenue)}</span> ·{" "}
              <small className="text-admin-muted">{selectedChartPoint.orders} đơn</small>
            </div>
          )}
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            className="w-full h-44 min-w-[500px]"
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
                  className="fill-admin-blue opacity-35 hover:opacity-75 transition-opacity cursor-pointer"
                />
              );
            })}

            {/* Điểm tròn tương tác */}
            {points.map((p) => {
              const isHovered = selectedChartPoint?.label === p.label;
              return (
                <g key={p.label} className="cursor-pointer" onMouseEnter={() => setActiveChartPoint(p)}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 6 : 4}
                    className={`transition-all ${isHovered ? "fill-white stroke-admin-accent-dark stroke-[3px]" : "fill-admin-blue stroke-white stroke-2"}`}
                  />
                  <text
                    x={p.x}
                    y={chartHeight - 6}
                    textAnchor="middle"
                    className="text-[10px] fill-admin-soft font-semibold"
                  >
                    {p.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-admin-line text-xs text-admin-muted">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="inline-block w-3.5 h-[2.5px] bg-[#346294] rounded-full" /> Doanh thu (VNĐ)
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="inline-block w-2.5 h-3 bg-admin-blue/35 rounded-xs" /> Số đơn phát sinh
          </span>
          <span className="text-[11px] text-admin-soft ml-auto hidden md:inline">Rê chuột vào điểm dữ liệu để xem chi tiết từng ngày</span>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.9fr)] gap-5 mb-5">
        <section className="rounded-xl border border-admin-line bg-admin-surface p-5 sm:p-6 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <span className="block text-[10px] font-bold text-admin-soft tracking-wider uppercase">Dòng tiền mới nhất</span>
              <h2 className="text-base font-bold text-admin-ink tracking-tight mt-1 mb-0">Đơn hàng gần đây</h2>
            </div>
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs font-bold text-admin-blue hover:text-admin-accent-dark">
              Xem tất cả <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr>
                  <th className="py-3 px-3.5 border-y border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap">Đơn hàng</th>
                  <th className="py-3 px-3.5 border-y border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap">Khách hàng</th>
                  <th className="py-3 px-3.5 border-y border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap">Trạng thái</th>
                  <th className="py-3 px-3.5 border-y border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap text-right">Tổng tiền</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.slice(0, 4).map((order) => (
                  <tr key={order.orderId} className="hover:bg-admin-bg/50 transition-colors">
                    <td className="py-3.5 px-3.5 border-b border-[#edf0f2] align-middle">
                      <strong className="block text-xs font-bold text-admin-ink">#{order.orderId}</strong>
                      <span className="block text-[10px] text-admin-soft mt-0.5">{formatAdminDate(order.orderDate)}</span>
                    </td>
                    <td className="py-3.5 px-3.5 border-b border-[#edf0f2] align-middle">
                      <strong className="block text-xs font-bold text-admin-ink">{order.shippingName}</strong>
                      <span className="block text-[10px] text-admin-soft mt-0.5">{order.items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm</span>
                    </td>
                    <td className="py-3.5 px-3.5 border-b border-[#edf0f2] align-middle">
                      <span className={`inline-flex items-center min-h-[22px] px-2 rounded text-[10px] font-bold whitespace-nowrap ${statusTone[order.status]}`}>
                        {orderStatusLabels[order.status as keyof typeof orderStatusLabels] ?? order.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5 border-b border-[#edf0f2] align-middle text-right font-bold text-admin-ink whitespace-nowrap">{formatAdminPrice(order.totalAmount)}</td>
                  </tr>
                ))}
                {recentOrders.length === 0 && <tr><td colSpan={4} className="py-5 text-center text-admin-muted">Chưa có đơn hàng.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-admin-line bg-admin-surface p-5 sm:p-6 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <span className="block text-[10px] font-bold text-admin-soft tracking-wider uppercase">Cần bổ sung sớm</span>
              <h2 className="text-base font-bold text-admin-ink tracking-tight mt-1 mb-0">Tồn kho thấp</h2>
            </div>
            <Link href="/admin/products" className="grid h-7 w-7 place-items-center rounded-lg border border-admin-line text-admin-muted hover:bg-admin-bg hover:text-admin-ink transition-colors" aria-label="Mở danh sách sản phẩm">
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-[#edf0f2] flex-1 my-2">
            {lowStockProducts.map((product) => (
              <Link href="/admin/products" className="flex items-center gap-3 py-2.5 hover:bg-admin-bg/50 px-1 rounded-lg transition-colors" key={product.productId}>
                <span className="w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center p-0.5 border border-admin-line">
                  <Package size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-xs font-semibold text-admin-ink truncate">{product.name}</strong>
                  <small className="block text-[10px] text-admin-soft">{productStatusLabels[product.status]}</small>
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${product.availableQuantity === 0 ? "bg-admin-red-soft text-admin-red" : "bg-slate-100 text-admin-muted"}`}>
                  {product.availableQuantity === 0 ? "Hết" : `${product.availableQuantity} sp`}
                </span>
              </Link>
            ))}
            {lowStockProducts.length === 0 && <p className="py-5 text-center text-admin-muted">Không có sản phẩm sắp hết.</p>}
          </div>
          <Link href="/admin/products" className="inline-flex items-center gap-1 text-xs font-bold text-admin-blue hover:text-admin-accent-dark mt-auto pt-3 border-t border-admin-line">
            Quản lý tồn kho <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>

      <section className="rounded-xl border border-admin-line bg-admin-surface p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="max-w-md">
          <span className="block text-[10px] font-bold text-admin-soft tracking-wider uppercase">Lối tắt thao tác</span>
          <h2 className="text-base font-bold text-admin-ink tracking-tight mt-1 mb-1">Bắt đầu một việc mới</h2>
          <p className="text-xs text-admin-muted m-0">Đi thẳng đến khu vực vận hành bạn thường dùng nhất.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/admin/products" className="flex items-center gap-3.5 p-3.5 rounded-xl border border-admin-line hover:border-[#bbc3cc] hover:bg-admin-bg transition-colors group">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-admin-bg group-hover:bg-admin-surface text-admin-ink border border-admin-line transition-colors">
              <Plus size={17} />
            </span>
            <span>
              <strong className="block text-xs font-bold text-admin-ink">Thêm sản phẩm</strong>
              <small className="block text-[10px] text-admin-soft">Tạo mặt hàng mới vào catalog</small>
            </span>
            <ArrowUpRight size={15} className="text-admin-soft group-hover:text-admin-ink ml-1" />
          </Link>
          <Link href="/admin/orders" className="flex items-center gap-3.5 p-3.5 rounded-xl border border-admin-line hover:border-[#bbc3cc] hover:bg-admin-bg transition-colors group">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-admin-bg group-hover:bg-admin-surface text-admin-ink border border-admin-line transition-colors">
              <ClipboardList size={17} />
            </span>
            <span>
              <strong className="block text-xs font-bold text-admin-ink">Kiểm tra đơn hàng</strong>
              <small className="block text-[10px] text-admin-soft">{pendingOrders} đơn đang chờ xử lý</small>
            </span>
            <ArrowUpRight size={15} className="text-admin-soft group-hover:text-admin-ink ml-1" />
          </Link>
        </div>
      </section>
    </div>
  );
}

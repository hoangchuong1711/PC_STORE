import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  ClipboardList,
  Package,
  Plus,
  ShoppingBag,
  TriangleAlert,
  Users,
} from "lucide-react";
import {
  formatAdminDate,
  formatAdminPrice,
  initialAdminOrders,
  initialAdminProducts,
  orderStatusLabels,
  productStatusLabels,
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
  const activeProducts = initialAdminProducts.filter((product) => product.status !== "DISCONTINUED");
  const lowStockProducts = activeProducts
    .filter((product) => product.stock <= 5)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);
  const pendingOrders = initialAdminOrders.filter((order) => order.status === "PENDING").length;
  const paidRevenue = initialAdminOrders
    .filter((order) => order.status !== "CANCELLED")
    .reduce((sum, order) => sum + order.total, 0);

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
      label: "Doanh thu mẫu",
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
          <span className="admin-eyebrow">Thứ hai, 04 tháng 10, 2026</span>
          <h1>Chào buổi sáng, Minh Anh</h1>
          <p>Đây là những việc đang cần bạn chú ý trong cửa hàng hôm nay.</p>
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
          <span className="admin-panel-kicker">Lối tắt</span>
          <h2>Bắt đầu một việc mới</h2>
          <p>Đi thẳng đến khu vực bạn thường dùng nhất.</p>
        </div>
        <div className="admin-quick-links">
          <Link href="/admin/products" className="admin-quick-link">
            <span className="admin-quick-link-icon"><Plus size={17} /></span>
            <span><strong>Thêm sản phẩm</strong><small>Tạo mặt hàng mới</small></span>
            <ArrowUpRight size={15} />
          </Link>
          <Link href="/admin/orders" className="admin-quick-link">
            <span className="admin-quick-link-icon"><Users size={17} /></span>
            <span><strong>Kiểm tra đơn</strong><small>Đơn đang chờ xử lý</small></span>
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
}

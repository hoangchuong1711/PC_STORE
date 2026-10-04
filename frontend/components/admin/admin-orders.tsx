"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CreditCard,
  Eye,
  PackageCheck,
  Search,
  Truck,
  X,
} from "lucide-react";
import {
  filterAdminOrders,
  formatAdminDate,
  formatAdminPrice,
  getNextOrderStatuses,
  initialAdminOrders,
  orderStatusLabels,
  paymentMethodLabels,
  paymentStatusLabels,
  type AdminOrder,
  type AdminOrderFilters,
  type AdminOrderStatus,
  type AdminPaymentStatus,
} from "../../lib/admin";

const itemsPerPage = 5;

const statusTone: Record<AdminOrderStatus, string> = {
  PENDING: "is-warning",
  CONFIRMED: "is-info",
  SHIPPING: "is-info",
  DELIVERED: "is-success",
  CANCELLED: "is-muted",
};

const paymentTone: Record<AdminPaymentStatus, string> = {
  PENDING: "is-warning",
  PAID: "is-success",
};

export function AdminOrders() {
  const [items, setItems] = useState(initialAdminOrders);
  const [filters, setFilters] = useState<AdminOrderFilters>({ query: "", status: "ALL", paymentStatus: "ALL" });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [feedback, setFeedback] = useState("");

  const filteredOrders = useMemo(() => filterAdminOrders(items, filters), [items, filters]);
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const visibleOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const pendingPaymentCount = items.filter((order) => order.paymentStatus === "PENDING").length;
  const pendingOrderCount = items.filter((order) => order.status === "PENDING").length;

  function updateFilter<K extends keyof AdminOrderFilters>(key: K, value: AdminOrderFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setCurrentPage(1);
  }

  function updateStatus(status: AdminOrderStatus) {
    if (!selectedOrder || !getNextOrderStatuses(selectedOrder.status).includes(status)) return;
    const nextOrder = { ...selectedOrder, status };
    setItems((current) => current.map((order) => order.id === selectedOrder.id ? nextOrder : order));
    setSelectedOrder(nextOrder);
    setFeedback(`Đơn ${selectedOrder.code} đã chuyển sang ${orderStatusLabels[status].toLowerCase()}.`);
  }

  function confirmPayment() {
    if (!selectedOrder || selectedOrder.paymentStatus === "PAID") return;
    const nextOrder = { ...selectedOrder, paymentStatus: "PAID" as const };
    setItems((current) => current.map((order) => order.id === selectedOrder.id ? nextOrder : order));
    setSelectedOrder(nextOrder);
    setFeedback(`Đã xác nhận thanh toán cho ${selectedOrder.code}.`);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Xử lý sau bán hàng</span>
          <h1>Đơn hàng</h1>
          <p>Theo dõi trạng thái giao hàng, thanh toán và thông tin người nhận.</p>
        </div>
        <div className="admin-heading-summary">
          <span><strong>{pendingOrderCount}</strong> đơn mới</span>
          <span><strong>{pendingPaymentCount}</strong> chờ thanh toán</span>
        </div>
      </div>

      {feedback && (
        <div className="admin-feedback" role="status">
          <Check size={16} />
          <span>{feedback}</span>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setFeedback("")}><X size={15} /></button>
        </div>
      )}

      <section className="admin-panel admin-list-panel">
        <div className="admin-list-toolbar">
          <label className="admin-search-field">
            <Search size={16} />
            <span className="sr-only">Tìm đơn hàng</span>
            <input type="search" value={filters.query} placeholder="Tìm mã đơn, tên khách..." onChange={(event) => updateFilter("query", event.target.value)} />
          </label>
          <select aria-label="Lọc trạng thái đơn" value={filters.status} onChange={(event) => updateFilter("status", event.target.value as AdminOrderFilters["status"])}>
            <option value="ALL">Tất cả trạng thái</option>
            {Object.entries(orderStatusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
          </select>
          <select aria-label="Lọc thanh toán" value={filters.paymentStatus} onChange={(event) => updateFilter("paymentStatus", event.target.value as AdminOrderFilters["paymentStatus"])}>
            <option value="ALL">Tất cả thanh toán</option>
            {Object.entries(paymentStatusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
          </select>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table admin-orders-table">
            <thead>
              <tr>
                <th>Đơn hàng</th>
                <th>Khách hàng</th>
                <th>Thanh toán</th>
                <th>Trạng thái</th>
                <th className="align-right">Tổng tiền</th>
                <th className="align-right"> </th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((order) => (
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
                    <span className={`admin-payment-stack ${paymentTone[order.paymentStatus]}`}>
                      <strong>{paymentMethodLabels[order.paymentMethod]}</strong>
                      <small>{paymentStatusLabels[order.paymentStatus]}</small>
                    </span>
                  </td>
                  <td><span className={`admin-status-pill ${statusTone[order.status]}`}>{orderStatusLabels[order.status]}</span></td>
                  <td className="align-right admin-price-cell">{formatAdminPrice(order.total)}</td>
                  <td className="align-right"><button type="button" className="admin-table-action" onClick={() => setSelectedOrder(order)}><Eye size={15} /> Xem</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleOrders.length === 0 && <div className="admin-empty-state"><ClipboardListFallback /><strong>Không có đơn phù hợp</strong><span>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</span></div>}
        </div>

        <div className="admin-table-footer">
          <span>Hiển thị <strong>{visibleOrders.length}</strong> trên <strong>{filteredOrders.length}</strong> đơn hàng</span>
          <div className="admin-pagination">
            <button type="button" className="admin-pagination-button" aria-label="Trang trước" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}><ChevronLeft size={16} /></button>
            <span>Trang <strong>{currentPage}</strong> / {totalPages}</span>
            <button type="button" className="admin-pagination-button" aria-label="Trang sau" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}><ChevronRight size={16} /></button>
          </div>
        </div>
      </section>

      {selectedOrder && (
        <div className="admin-drawer-layer">
          <button type="button" className="admin-drawer-overlay" aria-label="Đóng chi tiết đơn" onClick={() => setSelectedOrder(null)} />
          <aside className="admin-drawer admin-order-drawer" aria-label="Chi tiết đơn hàng">
            <div className="admin-drawer-heading">
              <div><span className="admin-panel-kicker">Chi tiết đơn hàng</span><h2>{selectedOrder.code}</h2></div>
              <button type="button" className="admin-icon-button" aria-label="Đóng chi tiết" onClick={() => setSelectedOrder(null)}><X size={18} /></button>
            </div>

            <div className="admin-order-summary-card">
              <div><span>Trạng thái hiện tại</span><strong className={`admin-status-pill ${statusTone[selectedOrder.status]}`}>{orderStatusLabels[selectedOrder.status]}</strong></div>
              <div><span>Tổng đơn</span><strong>{formatAdminPrice(selectedOrder.total)}</strong></div>
            </div>

            <div className="admin-drawer-section">
              <div className="admin-drawer-section-heading"><h3>Người nhận</h3><span>{selectedOrder.customerEmail}</span></div>
              <div className="admin-recipient-card"><strong>{selectedOrder.customerName}</strong><span>{selectedOrder.customerPhone}</span><span>{selectedOrder.shippingAddress}</span></div>
            </div>

            <div className="admin-drawer-section">
              <div className="admin-drawer-section-heading"><h3>Sản phẩm</h3><span>{selectedOrder.itemCount} sản phẩm</span></div>
              <div className="admin-order-lines">
                {selectedOrder.lines.map((line) => <div className="admin-order-line" key={line.productName}><span><strong>{line.productName}</strong><small>Số lượng: {line.quantity}</small></span><strong>{formatAdminPrice(line.unitPrice * line.quantity)}</strong></div>)}
              </div>
            </div>

            <div className="admin-drawer-section">
              <div className="admin-drawer-section-heading"><h3>Thanh toán</h3><CreditCard size={16} /></div>
              <div className="admin-payment-detail"><span>{paymentMethodLabels[selectedOrder.paymentMethod]}</span><span className={`admin-status-pill ${paymentTone[selectedOrder.paymentStatus]}`}>{paymentStatusLabels[selectedOrder.paymentStatus]}</span></div>
              {selectedOrder.paymentMethod === "BANK_TRANSFER" && selectedOrder.paymentStatus === "PENDING" && <button type="button" className="admin-button admin-button-secondary admin-full-button" onClick={confirmPayment}><CircleCheck size={16} />Xác nhận đã nhận tiền</button>}
            </div>

            <div className="admin-drawer-section">
              <div className="admin-drawer-section-heading"><h3>Cập nhật trạng thái</h3><span>Chỉ chọn bước hợp lệ tiếp theo</span></div>
              {getNextOrderStatuses(selectedOrder.status).length > 0 ? <div className="admin-order-next-actions">{getNextOrderStatuses(selectedOrder.status).map((status) => {
                const paymentRequired = status === "SHIPPING" && selectedOrder.paymentMethod === "BANK_TRANSFER" && selectedOrder.paymentStatus !== "PAID";
                return <button type="button" className={`admin-button ${status === "CANCELLED" ? "admin-button-danger" : "admin-button-secondary"}`} key={status} disabled={paymentRequired} title={paymentRequired ? "Cần xác nhận thanh toán trước" : undefined} onClick={() => updateStatus(status)}>{status === "SHIPPING" ? <Truck size={16} /> : status === "DELIVERED" ? <PackageCheck size={16} /> : <ArrowRight size={16} />}{orderStatusLabels[status]}</button>;
              })}</div> : <div className="admin-final-status-note"><Check size={15} />Đơn này đã ở trạng thái cuối.</div>}
              {selectedOrder.paymentMethod === "BANK_TRANSFER" && selectedOrder.paymentStatus !== "PAID" && getNextOrderStatuses(selectedOrder.status).includes("SHIPPING") && <p className="admin-inline-hint"><CreditCard size={14} />Xác nhận thanh toán trước khi chuyển sang đang giao.</p>}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function ClipboardListFallback() {
  return <span className="admin-empty-icon"><ClipboardIcon /></span>;
}

function ClipboardIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 5h6M9 3h6a1 1 0 0 1 1 1v1h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2V4a1 1 0 0 1 1-1Z" /><path d="M8 11h8M8 15h6" /></svg>;
}

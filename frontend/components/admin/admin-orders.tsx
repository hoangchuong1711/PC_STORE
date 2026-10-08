"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CreditCard,
  Eye,
  FileText,
  Loader2,
  PackageCheck,
  Printer,
  RotateCcw,
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
  orderDateFilterLabels,
  orderStatusLabels,
  paymentMethodLabels,
  paymentStatusLabels,
  type AdminOrder,
  type AdminOrderDateFilter,
  type AdminOrderFilters,
  type AdminOrderStatus,
  type AdminPaymentMethod,
  type AdminPaymentStatus,
} from "../../lib/admin";
import { adminOrderApi } from "../../lib/admin-order-api";
import type { OrderResponse } from "../../lib/order-api";

function toAdminOrderModel(res: OrderResponse): AdminOrder {
  const status = (["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED"].includes(res.status)
    ? res.status
    : "PENDING") as AdminOrderStatus;
  const paymentMethod = (res.payment?.method === "BANK_TRANSFER" ? "BANK_TRANSFER" : "COD") as AdminPaymentMethod;
  const paymentStatus = (res.payment?.status === "PAID" ? "PAID" : "PENDING") as AdminPaymentStatus;

  return {
    id: String(res.orderId),
    code: `#${res.orderId}`,
    customerName: res.shippingName,
    customerEmail: "khachhang@pcstore.vn",
    customerPhone: res.shippingPhone,
    shippingAddress: res.shippingAddressText,
    createdAt: res.orderDate,
    total: res.totalAmount,
    status,
    paymentMethod,
    paymentStatus,
    itemCount: (res.items || []).reduce((sum, item) => sum + item.quantity, 0),
    lines: (res.items || []).map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  };
}

const itemsPerPage = 5;

const statusTone: Record<AdminOrderStatus, string> = {
  PENDING: "bg-admin-amber-soft text-admin-amber",
  CONFIRMED: "bg-admin-blue-soft text-admin-blue",
  SHIPPING: "bg-admin-blue-soft text-admin-blue",
  DELIVERED: "bg-admin-green-soft text-admin-green",
  CANCELLED: "bg-slate-100 text-slate-500",
};

const paymentTone: Record<AdminPaymentStatus, string> = {
  PENDING: "bg-admin-amber-soft text-admin-amber",
  PAID: "bg-admin-green-soft text-admin-green",
};

const cancellationReasons = [
  "Khách hàng yêu cầu hủy đơn",
  "Hết hàng tồn kho tại chi nhánh",
  "Không liên lạc được người nhận",
  "Thông tin địa chỉ giao hàng không hợp lệ",
  "Đơn hàng trùng lặp",
];

export function AdminOrders() {
  const [items, setItems] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AdminOrderFilters>({
    query: "",
    status: "ALL",
    paymentStatus: "ALL",
    dateRange: "ALL",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<AdminOrder | null>(null);
  const [selectedCancelReason, setSelectedCancelReason] = useState(cancellationReasons[0]);
  const [customCancelReason, setCustomCancelReason] = useState("");
  const [staffNoteDraft, setStaffNoteDraft] = useState("");
  const [feedback, setFeedback] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminOrderApi.list();
      setItems(res.map(toAdminOrderModel));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể tải danh sách đơn hàng từ máy chủ.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => filterAdminOrders(items, filters), [items, filters]);
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const visibleOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const pendingPaymentCount = items.filter((order) => order.paymentStatus === "PENDING").length;
  const pendingOrderCount = items.filter((order) => order.status === "PENDING").length;

  function updateFilter<K extends keyof AdminOrderFilters>(key: K, value: AdminOrderFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setCurrentPage(1);
  }

  function resetFilters() {
    setFilters({ query: "", status: "ALL", paymentStatus: "ALL", dateRange: "ALL" });
    setCurrentPage(1);
  }

  function handleOpenOrder(order: AdminOrder) {
    setSelectedOrder(order);
    setStaffNoteDraft(order.staffNotes ?? "");
  }

  async function updateStatus(status: AdminOrderStatus) {
    if (!selectedOrder) return;
    if (status === "CANCELLED") {
      setCancelModalOrder(selectedOrder);
      return;
    }
    if (!getNextOrderStatuses(selectedOrder.status).includes(status)) return;

    try {
      const numId = /^\d+$/.test(selectedOrder.id) ? Number(selectedOrder.id) : null;
      if (numId !== null) {
        const updatedRes = await adminOrderApi.updateStatus(numId, status);
        const nextOrder = toAdminOrderModel(updatedRes);
        setItems((current) => current.map((order) => (order.id === selectedOrder.id ? nextOrder : order)));
        setSelectedOrder(nextOrder);
      } else {
        const nextOrder = { ...selectedOrder, status };
        setItems((current) => current.map((order) => (order.id === selectedOrder.id ? nextOrder : order)));
        setSelectedOrder(nextOrder);
      }
      setFeedback(`Đơn ${selectedOrder.code} đã chuyển sang ${orderStatusLabels[status].toLowerCase()}.`);
    } catch (err) {
      setFeedback(err instanceof Error ? `Lỗi: ${err.message}` : "Không thể cập nhật trạng thái đơn hàng");
    }
  }

  async function confirmCancellation() {
    if (!cancelModalOrder) return;
    const finalReason = customCancelReason.trim()
      ? `${selectedCancelReason}: ${customCancelReason.trim()}`
      : selectedCancelReason;

    try {
      const numId = /^\d+$/.test(cancelModalOrder.id) ? Number(cancelModalOrder.id) : null;
      let nextOrder: AdminOrder;
      if (numId !== null) {
        const updatedRes = await adminOrderApi.updateStatus(numId, "CANCELLED");
        nextOrder = {
          ...toAdminOrderModel(updatedRes),
          cancellationReason: finalReason,
        };
      } else {
        nextOrder = {
          ...cancelModalOrder,
          status: "CANCELLED",
          cancellationReason: finalReason,
        };
      }

      setItems((current) => current.map((order) => (order.id === cancelModalOrder.id ? nextOrder : order)));
      if (selectedOrder?.id === cancelModalOrder.id) {
        setSelectedOrder(nextOrder);
      }
      setCancelModalOrder(null);
      setCustomCancelReason("");
      setFeedback(`Đơn ${cancelModalOrder.code} đã bị hủy. Lý do: ${finalReason}.`);
    } catch (err) {
      setFeedback(err instanceof Error ? `Lỗi: ${err.message}` : "Không thể hủy đơn hàng");
    }
  }

  function saveStaffNotes() {
    if (!selectedOrder) return;
    const nextOrder = { ...selectedOrder, staffNotes: staffNoteDraft.trim() };
    setItems((current) => current.map((order) => (order.id === selectedOrder.id ? nextOrder : order)));
    setSelectedOrder(nextOrder);
    setFeedback("Đã lưu ghi chú nội bộ cho đơn hàng.");
  }

  function handlePrintOrder() {
    window.print();
  }

  return (
    <div className="max-w-[1250px] mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-7">
        <div>
          <span className="block text-[10px] font-bold text-admin-soft tracking-wider uppercase">Xử lý sau bán hàng</span>
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-admin-ink tracking-tight mt-1 mb-1.5 leading-tight">Đơn hàng</h1>
          <p className="text-sm text-admin-muted max-w-[570px] m-0">Theo dõi trạng thái giao hàng, kiểm tra thanh toán và xử lý từng kiện hàng.</p>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-admin-muted">
          <span className="px-3 py-2 rounded-lg border border-admin-line bg-white shadow-xs">
            <strong className="text-admin-ink font-bold">{pendingOrderCount}</strong> đơn mới
          </span>
          <span className="px-3 py-2 rounded-lg border border-admin-line bg-white shadow-xs">
            <strong className="text-admin-ink font-bold">{pendingPaymentCount}</strong> chờ thanh toán
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between text-xs font-semibold" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center min-h-[32px] px-3 rounded-lg border border-red-300 bg-white hover:bg-red-50 text-red-800 transition-colors cursor-pointer"
            onClick={() => void fetchOrders()}
          >
            Tải lại
          </button>
        </div>
      )}

      {feedback && (
        <div className="flex items-center justify-between gap-2.5 p-3 rounded-lg bg-admin-green-soft border border-admin-green/20 text-xs font-semibold text-admin-green mb-5" role="status">
          <div className="flex items-center gap-2">
            <Check size={16} />
            <span>{feedback}</span>
          </div>
          <button type="button" aria-label="Đóng thông báo" className="cursor-pointer text-admin-green/70 hover:text-admin-green" onClick={() => setFeedback("")}>
            <X size={15} />
          </button>
        </div>
      )}

      <section className="rounded-xl border border-admin-line bg-admin-surface overflow-hidden">
        <div className="p-3.5 border-b border-admin-line bg-white flex flex-wrap items-center gap-3">
          <label className="relative flex items-center flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3 text-admin-soft pointer-events-none" />
            <span className="sr-only">Tìm đơn hàng</span>
            <input
              type="search"
              value={filters.query}
              placeholder="Tìm mã đơn, tên khách, email..."
              onChange={(event) => updateFilter("query", event.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink placeholder:text-admin-soft focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue transition-colors"
            />
          </label>
          <select
            aria-label="Lọc thời gian"
            value={filters.dateRange ?? "ALL"}
            onChange={(event) => updateFilter("dateRange", event.target.value as AdminOrderDateFilter)}
            className="h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue cursor-pointer"
          >
            {Object.entries(orderDateFilterLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc trạng thái đơn"
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value as AdminOrderFilters["status"])}
            className="h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            {Object.entries(orderStatusLabels).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc thanh toán"
            value={filters.paymentStatus}
            onChange={(event) => updateFilter("paymentStatus", event.target.value as AdminOrderFilters["paymentStatus"])}
            className="h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue cursor-pointer"
          >
            <option value="ALL">Tất cả thanh toán</option>
            {Object.entries(paymentStatusLabels).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-admin-line bg-white text-xs font-semibold text-admin-muted hover:bg-admin-bg hover:text-admin-ink transition-colors cursor-pointer"
            onClick={resetFilters}
          >
            <RotateCcw size={15} />
            Đặt lại
          </button>
        </div>

        <div className="w-full overflow-x-auto">
          {loading ? (
            <div className="min-h-[260px] flex items-center justify-center">
              <Loader2 size={36} className="animate-spin text-admin-soft" />
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr>
                  <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">Đơn hàng</th>
                  <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">Khách hàng</th>
                  <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">Thanh toán</th>
                  <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">Trạng thái</th>
                  <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30 text-right">Tổng tiền</th>
                  <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-admin-bg/40 transition-colors">
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                      <strong className="block text-xs font-bold text-admin-ink">{order.code}</strong>
                      <span className="block text-[10px] text-admin-soft mt-0.5">{formatAdminDate(order.createdAt)}</span>
                    </td>
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                      <strong className="block text-xs font-bold text-admin-ink">{order.customerName}</strong>
                      <span className="block text-[10px] text-admin-soft mt-0.5">
                        {order.itemCount} sản phẩm · {order.customerPhone}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                      <div className="flex flex-col gap-0.5">
                        <strong className="text-xs font-semibold text-admin-ink">{paymentMethodLabels[order.paymentMethod]}</strong>
                        <span className={`inline-block w-fit px-1.5 py-0.5 rounded text-[9px] font-bold ${paymentTone[order.paymentStatus]}`}>
                          {paymentStatusLabels[order.paymentStatus]}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                      <span className={`inline-flex items-center min-h-[22px] px-2 rounded text-[10px] font-bold whitespace-nowrap ${statusTone[order.status]}`}>
                        {orderStatusLabels[order.status]}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle text-right font-bold text-admin-ink font-mono whitespace-nowrap">
                      {formatAdminPrice(order.total)}
                    </td>
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle text-right whitespace-nowrap">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-admin-blue hover:bg-admin-blue-soft transition-colors cursor-pointer"
                        onClick={() => handleOpenOrder(order)}
                      >
                        <Eye size={15} /> Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && visibleOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center text-admin-muted gap-2">
              <ClipboardIcon />
              <strong className="text-xs font-bold text-admin-ink">Không có đơn phù hợp</strong>
              <span className="text-[11px]">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-admin-line bg-admin-bg/30 text-xs text-admin-muted gap-3">
          <span>
            Hiển thị <strong>{visibleOrders.length}</strong> trên <strong>{filteredOrders.length}</strong> đơn hàng
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-lg border border-admin-line bg-white text-admin-ink hover:bg-admin-bg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Trang trước"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs">
              Trang <strong>{currentPage}</strong> / {totalPages}
            </span>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-lg border border-admin-line bg-white text-admin-ink hover:bg-admin-bg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Trang sau"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Drawer Chi Tiết Đơn Hàng */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="fixed inset-0 bg-black/40 backdrop-blur-xs border-0 cursor-pointer"
            aria-label="Đóng chi tiết đơn"
            onClick={() => setSelectedOrder(null)}
          />
          <aside className="relative z-10 w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-y-auto" aria-label="Chi tiết đơn hàng">
            <div className="flex items-center justify-between p-5 border-b border-admin-line">
              <div>
                <span className="block text-[10px] font-bold text-admin-soft tracking-wider uppercase">Chi tiết đơn hàng</span>
                <h2 className="text-base font-bold text-admin-ink mt-0.5">{selectedOrder.code}</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-transparent text-admin-muted hover:border-admin-line hover:bg-admin-bg hover:text-admin-ink cursor-pointer"
                  title="In phiếu giao hàng"
                  onClick={handlePrintOrder}
                >
                  <Printer size={17} />
                </button>
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-transparent text-admin-muted hover:border-admin-line hover:bg-admin-bg hover:text-admin-ink cursor-pointer"
                  aria-label="Đóng chi tiết"
                  onClick={() => setSelectedOrder(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 bg-admin-bg border border-admin-line rounded-xl m-5 mb-0">
              <div>
                <span className="block text-[10px] font-semibold text-admin-soft uppercase">Trạng thái hiện tại</span>
                <span className={`inline-flex items-center min-h-[22px] px-2 rounded text-[10px] font-bold whitespace-nowrap mt-1 ${statusTone[selectedOrder.status]}`}>
                  {orderStatusLabels[selectedOrder.status]}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-admin-soft uppercase">Tổng tiền thanh toán</span>
                <strong className="block text-base font-extrabold text-admin-ink font-mono mt-0.5">{formatAdminPrice(selectedOrder.total)}</strong>
              </div>
            </div>

            {selectedOrder.status === "CANCELLED" && selectedOrder.cancellationReason && (
              <div className="mx-5 mt-4 p-3 bg-admin-red-soft border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-950">
                <AlertTriangle size={16} className="text-admin-red shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-admin-red font-bold">Đơn hàng đã bị hủy</strong>
                  <span>Lý do: {selectedOrder.cancellationReason}</span>
                </div>
              </div>
            )}

            <div className="p-5 flex flex-col gap-5 overflow-y-auto flex-1">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold text-admin-ink">
                  <h3>Người nhận hàng</h3>
                  <span className="text-[11px] font-normal text-admin-soft">{selectedOrder.customerEmail}</span>
                </div>
                <div className="p-3 bg-admin-bg/60 border border-admin-line rounded-lg text-xs flex flex-col gap-1 text-admin-ink">
                  <strong className="text-xs font-bold">{selectedOrder.customerName}</strong>
                  <span className="text-admin-muted">SĐT: {selectedOrder.customerPhone}</span>
                  <span className="text-admin-muted">Địa chỉ: {selectedOrder.shippingAddress}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold text-admin-ink">
                  <h3>Sản phẩm trong kiện</h3>
                  <span className="text-[11px] font-normal text-admin-soft">{selectedOrder.itemCount} sản phẩm</span>
                </div>
                <div className="flex flex-col divide-y divide-admin-line border border-admin-line rounded-lg p-3 bg-white">
                  {selectedOrder.lines.map((line) => (
                    <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 text-xs" key={line.productName}>
                      <div className="min-w-0 pr-3">
                        <strong className="block text-xs font-semibold text-admin-ink truncate">{line.productName}</strong>
                        <small className="block text-[10px] text-admin-soft mt-0.5">Số lượng: {line.quantity} × {formatAdminPrice(line.unitPrice)}</small>
                      </div>
                      <strong className="text-xs font-bold text-admin-ink font-mono whitespace-nowrap">{formatAdminPrice(line.unitPrice * line.quantity)}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold text-admin-ink">
                  <h3>Thanh toán</h3>
                  <CreditCard size={16} className="text-admin-soft" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-admin-line bg-white text-xs">
                  <span className="font-semibold text-admin-ink">{paymentMethodLabels[selectedOrder.paymentMethod]}</span>
                  <span className={`inline-flex items-center min-h-[22px] px-2 rounded text-[10px] font-bold ${paymentTone[selectedOrder.paymentStatus]}`}>
                    {paymentStatusLabels[selectedOrder.paymentStatus]}
                  </span>
                </div>
                {selectedOrder.paymentMethod === "COD" && selectedOrder.paymentStatus === "PENDING" && (
                  <p className="text-[11px] text-admin-muted m-0 leading-relaxed">
                    * Hệ thống sẽ tự động cập nhật sang Đã thanh toán khi đơn hàng chuyển sang Đã giao hàng.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold text-admin-ink">
                  <h3>Ghi chú nội bộ nhân viên</h3>
                  <span className="text-[11px] font-normal text-admin-soft">Chỉ Admin nhìn thấy</span>
                </div>
                <div className="flex flex-col gap-2">
                  <textarea
                    rows={2}
                    value={staffNoteDraft}
                    onChange={(e) => setStaffNoteDraft(e.target.value)}
                    placeholder="Ghi chú về hẹn giờ giao, tình trạng đóng gói..."
                    className="w-full rounded-lg border border-admin-line p-2.5 text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue resize-none"
                  />
                  <button
                    type="button"
                    className="self-end inline-flex items-center justify-center min-h-[32px] px-3 rounded-lg text-xs font-bold border border-admin-line bg-white hover:bg-admin-bg text-admin-ink transition-colors cursor-pointer"
                    onClick={saveStaffNotes}
                  >
                    Lưu ghi chú
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-admin-line">
                <div className="flex items-center justify-between text-xs font-bold text-admin-ink">
                  <h3>Cập nhật trạng thái</h3>
                  <span className="text-[11px] font-normal text-admin-soft">Chỉ chọn bước kế tiếp hợp lệ</span>
                </div>
                {getNextOrderStatuses(selectedOrder.status).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {getNextOrderStatuses(selectedOrder.status).map((status) => {
                      const paymentRequired =
                        status === "SHIPPING" &&
                        selectedOrder.paymentMethod === "BANK_TRANSFER" &&
                        selectedOrder.paymentStatus !== "PAID";
                      return (
                        <button
                          type="button"
                          className={`inline-flex items-center justify-center gap-1.5 min-h-[38px] px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            status === "CANCELLED"
                              ? "border border-rose-200 bg-admin-red-soft hover:bg-rose-100 text-admin-red"
                              : "border border-admin-line bg-white hover:border-[#bbc3cc] hover:bg-admin-bg text-admin-ink"
                          }`}
                          key={status}
                          disabled={paymentRequired}
                          title={paymentRequired ? "Cần xác nhận thanh toán trước" : undefined}
                          onClick={() => updateStatus(status)}
                        >
                          {status === "SHIPPING" ? (
                            <Truck size={16} />
                          ) : status === "DELIVERED" ? (
                            <PackageCheck size={16} />
                          ) : (
                            <ArrowRight size={16} />
                          )}
                          {status === "CANCELLED" ? "Hủy đơn hàng..." : orderStatusLabels[status]}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-admin-bg text-xs text-admin-muted font-medium">
                    <Check size={15} className="text-admin-green" />
                    Đơn hàng này đã ở trạng thái kết thúc ({orderStatusLabels[selectedOrder.status]}).
                  </div>
                )}
                {selectedOrder.paymentMethod === "BANK_TRANSFER" &&
                  selectedOrder.paymentStatus !== "PAID" &&
                  getNextOrderStatuses(selectedOrder.status).includes("SHIPPING") && (
                    <p className="flex items-center gap-1.5 text-[11px] text-admin-amber mt-1">
                      <CreditCard size={14} />
                      Xác nhận thanh toán trước khi chuyển sang đang giao.
                    </p>
                  )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Modal Xác Nhận Hủy Đơn Hàng */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="cancel-modal-title">
          <button
            type="button"
            className="fixed inset-0 bg-transparent border-0 cursor-pointer"
            aria-label="Đóng hộp thoại hủy đơn"
            onClick={() => setCancelModalOrder(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-admin-line flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-admin-red-soft text-admin-red">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 id="cancel-modal-title" className="text-base font-bold text-admin-ink">Xác nhận hủy đơn hàng</h3>
                <p className="text-xs text-admin-muted mt-0.5">Đơn <strong className="text-admin-ink">{cancelModalOrder.code}</strong> ({formatAdminPrice(cancelModalOrder.total)})</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs text-admin-muted leading-relaxed m-0">
                Sau khi hủy, đơn hàng sẽ dừng toàn bộ quá trình giao nhận và không thể phục hồi. Vui lòng chọn lý do:
              </p>

              <label className="flex flex-col gap-1.5 text-xs font-semibold text-admin-ink">
                <span>Lý do hủy đơn:</span>
                <select
                  value={selectedCancelReason}
                  onChange={(e) => setSelectedCancelReason(e.target.value)}
                  className="w-full h-9 rounded-lg border border-admin-line px-2.5 text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue bg-white cursor-pointer"
                >
                  {cancellationReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-semibold text-admin-ink">
                <span>Ghi chú bổ sung (tùy chọn):</span>
                <input
                  type="text"
                  placeholder="Chi tiết yêu cầu của khách hoặc nguyên nhân..."
                  value={customCancelReason}
                  onChange={(e) => setCustomCancelReason(e.target.value)}
                  className="w-full h-9 rounded-lg border border-admin-line px-2.5 text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-admin-line">
              <button
                type="button"
                className="inline-flex items-center justify-center min-h-[38px] px-3.5 rounded-lg text-xs font-bold border border-admin-line bg-white hover:bg-admin-bg text-admin-ink transition-colors cursor-pointer"
                onClick={() => setCancelModalOrder(null)}
              >
                Giữ đơn hàng
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center min-h-[38px] px-3.5 rounded-lg text-xs font-bold border border-rose-200 bg-admin-red-soft hover:bg-rose-100 text-admin-red transition-colors cursor-pointer"
                onClick={confirmCancellation}
              >
                Xác nhận hủy đơn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClipboardIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-admin-soft">
      <path d="M9 5h6M9 3h6a1 1 0 0 1 1 1v1h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2V4a1 1 0 0 1 1-1Z" />
      <path d="M8 11h8M8 15h6" />
    </svg>
  );
}

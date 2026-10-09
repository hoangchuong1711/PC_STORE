"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  CreditCard,
  Star,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Footer, Header } from "./storefront";
import { useCart } from "./cart-provider";
import { useAuth } from "./auth-provider";
import { orderApi } from "../lib/order-api";
import { useToast } from "./toast";
import { WriteReviewModal } from "./reviews";
import { hasUserReviewedProduct } from "../lib/reviews";
import { formatPrice } from "../lib/products";
import {
  filterOrders,
  formatOrderDate,
  getOrderProgress,
  orderStatusLabels,
  paymentMethodLabels,
  paymentStatusLabels,
  toOrderModel,
  getOrder,
  type Order,
  type OrderFilter,
  type OrderStatus,
} from "../lib/orders";

const filters: { value: OrderFilter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING", label: "Chờ xác nhận" },
  { value: "SHIPPING", label: "Đang giao" },
  { value: "DELIVERED", label: "Đã giao" },
  { value: "CANCELLED", label: "Đã hủy" },
  { value: "EXPIRED_PENDING_RECONCILIATION", label: "Chờ đối soát" },
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
  const colorMap: Record<OrderStatus, string> = {
    PENDING: "bg-amber-100 text-amber-800 border-amber-200",
    CONFIRMED: "bg-sky-100 text-sky-800 border-sky-200",
    SHIPPING: "bg-indigo-100 text-indigo-800 border-indigo-200",
    DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    CANCELLED: "bg-red-100 text-red-800 border-red-200",
    EXPIRED_PENDING_RECONCILIATION: "bg-rose-100 text-rose-800 border-rose-200",
  };

  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md font-specs text-[11px] font-bold tracking-wider uppercase border ${
        colorMap[status] || "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
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
    <article className="grid grid-cols-1 md:grid-cols-[1.1fr_1.6fr_1fr_1fr_1.1fr] items-center gap-5 py-6 border-t border-[#e0e0e0]">
      <div className="font-specs text-sm font-bold text-ink tracking-wide flex flex-col">
        <span className="text-[11px] font-sans font-normal text-muted">Mã đơn hàng</span>
        <strong className="text-base text-ink">{order.code}</strong>
        <small className="text-xs font-normal text-muted">{formatOrderDate(order.createdAt)}</small>
      </div>

      <div className="flex flex-col">
        <span className="text-[11px] text-muted">{itemCount} sản phẩm</span>
        <strong className="text-sm text-slate-800 font-semibold truncate">
          {order.lines.map((line) => line.name).join(" · ")}
        </strong>
      </div>

      <div className="flex flex-col gap-1.5 items-start">
        <StatusBadge status={order.status} />
        <div className="flex items-center gap-1.5 flex-wrap">
          <small className="text-[10px] text-slate-500 font-semibold">
            {order.paymentMethod === "VNPAY" ? "VNPAY" : "COD"}
          </small>
          {order.paymentMethod === "VNPAY" && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                order.paymentStatus === "PAID"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : order.paymentStatus === "FAILED"
                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              {paymentStatusLabels[order.paymentStatus]}
            </span>
          )}
        </div>
      </div>

      <div className="text-left md:text-right flex flex-col">
        <span className="text-[11px] text-muted">Tổng thanh toán</span>
        <strong className="font-specs text-base font-bold text-ink">
          {formatPrice(order.total)}
        </strong>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-lg text-xs font-semibold text-slate-700 transition-colors cursor-pointer border border-slate-200"
          onClick={() => onReorder(order)}
          title="Thêm lại sản phẩm vào giỏ"
        >
          <RotateCcw size={14} /> Mua lại
        </button>
        <Link
          href={`/orders/${order.id}`}
          className="inline-flex items-center gap-1 text-[#006ce1] font-bold text-xs md:text-sm hover:underline"
          aria-label={`Xem chi tiết đơn ${order.code}`}
        >
          Chi tiết <ChevronRight size={17} />
        </Link>
      </div>
    </article>
  );
}

export function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orderList, setOrderList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderFilter>("ALL");
  const { add } = useCart();
  const { toast } = useToast();

  const fetchOrders = async () => {
    if (!user) {
      setOrderList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await orderApi.list();
      setOrderList(res.map(toOrderModel));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể tải danh sách đơn hàng từ máy chủ.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      void fetchOrders();
    }
  }, [authLoading, user]);

  const handleReorder = (order: Order) => {
    order.lines.forEach((line) => {
      const numId = /^\d+$/.test(line.productId)
        ? Number(line.productId)
        : parseInt(line.productId.replace(/^p-?/i, ""), 10) || 1;
      add(numId, line.quantity);
    });
    toast(`Đã thêm ${order.lines.length} sản phẩm của đơn ${order.code} vào giỏ hàng!`, "success");
  };

  const visibleOrders = useMemo(
    () => filterOrders(orderList, filter),
    [filter, orderList],
  );

  return (
    <>
      <Header />
      <main className="container py-12 pb-28 min-h-[72vh]">
        <div className="flex items-end justify-between gap-7 flex-wrap">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#006ce1] block mb-1">
              Tài khoản · Quản lý mua sắm
            </span>
            <h1 className="font-heading m-0 mb-2.5 text-3xl md:text-5xl font-extrabold tracking-tight text-ink">
              Đơn hàng của tôi.
            </h1>
            <p className="font-sans m-0 text-sm md:text-base text-muted">
              Theo dõi lộ trình giao hàng, kiểm tra chi tiết linh kiện và thanh toán trực tiếp từ máy chủ.
            </p>
          </div>
        </div>

        <div className="flex gap-2 my-8 pb-3 overflow-x-auto border-b border-[#e0e0e0]" role="group" aria-label="Lọc đơn hàng">
          {filters.map((item) => (
            <button
              key={item.value}
              className={`shrink-0 px-4 py-2 rounded-xl font-nav text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                filter === item.value
                  ? "bg-[#006ce1] text-white shadow-sm"
                  : "bg-transparent text-muted hover:bg-slate-100 hover:text-[#006ce1]"
              }`}
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
            >
              {item.label}
            </button>
          ))}
        </div>

        {!user && !authLoading ? (
          <section className="grid place-items-center py-16 px-6 border border-[#e0e0e0] rounded-2xl bg-white text-center" role="alert">
            <PackageOpen size={48} className="text-[#006ce1] mb-5" aria-hidden="true" />
            <h2 className="text-2xl font-bold text-ink m-0 mb-2">Vui lòng đăng nhập</h2>
            <p className="text-sm text-muted max-w-md m-0 mb-5">Đăng nhập vào tài khoản của bạn để xem và theo dõi lịch sử đơn hàng.</p>
            <Link
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm"
              href="/account"
            >
              Đăng nhập tài khoản
            </Link>
          </section>
        ) : error ? (
          <section className="grid place-items-center py-16 px-6 border border-[#e0e0e0] rounded-2xl bg-white text-center" role="alert">
            <AlertCircle size={40} className="text-red-500 mb-4" aria-hidden="true" />
            <h2 className="text-2xl font-bold text-ink m-0 mb-2">Không thể tải danh sách đơn hàng</h2>
            <p className="text-sm text-muted max-w-md m-0 mb-5">{error}</p>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm cursor-pointer"
              onClick={() => void fetchOrders()}
            >
              Thử tải lại
            </button>
          </section>
        ) : loading ? (
          <div className="min-h-[300px] flex items-center justify-center">
            <Loader2 size={36} className="animate-spin text-muted" />
          </div>
        ) : visibleOrders.length ? (
          <section className="border-t-2 border-ink" aria-label="Danh sách đơn hàng">
            <div className="flex justify-between gap-5 py-3.5 text-xs text-muted">
              <span>Hiển thị {visibleOrders.length} đơn hàng</span>
              <span>Cập nhật tự động · Thời gian thực</span>
            </div>
            {visibleOrders.map((order) => (
              <OrderRow key={order.id} order={order} onReorder={handleReorder} />
            ))}
          </section>
        ) : (
          <section className="grid place-items-center py-16 px-6 border border-[#e0e0e0] rounded-2xl bg-white text-center">
            <PackageOpen size={48} className="text-[#006ce1] mb-5" aria-hidden="true" />
            <h2 className="text-2xl font-bold text-ink m-0 mb-2">Chưa có đơn hàng nào ở mục này</h2>
            <p className="text-sm text-muted max-w-md m-0 mb-5">Không tìm thấy đơn hàng nào ở trạng thái đã chọn.</p>
            <Link
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm"
              href="/products"
            >
              Khám phá linh kiện ngay
            </Link>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

function VNPayCountdown({
  expiresAt,
  onExpire,
}: {
  expiresAt?: string | null;
  onExpire?: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (!expiresAt) return 0;
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
        onExpire?.();
      } else {
        setTimeLeft(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (!expiresAt) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft < 300; // less than 5 min

  if (timeLeft <= 0) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
        <Clock3 size={15} className="shrink-0 text-rose-600" />
        <span>Hết thời hạn thanh toán 15 phút</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
        isUrgent
          ? "bg-rose-50/80 border-rose-200 text-rose-900"
          : "bg-blue-50/80 border-blue-200 text-blue-900"
      }`}
    >
      <div className="flex items-center gap-2 text-xs">
        <Clock3
          size={16}
          className={`shrink-0 ${isUrgent ? "text-rose-600 animate-pulse" : "text-[#006ce1]"}`}
        />
        <span className="font-medium">Thời gian giữ chỗ thanh toán:</span>
      </div>
      <span className="font-specs font-bold text-sm tabular-nums tracking-wide px-2 py-0.5 rounded-md bg-white border border-current shadow-xs">
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}

export function OrderDetail({
  order: initialOrder,
  id,
}: {
  order?: Order | null;
  id?: string;
}) {
  const [order, setOrder] = useState<Order | null>(initialOrder ?? null);
  const [loading, setLoading] = useState<boolean>(!initialOrder && Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("Đổi ý không muốn mua nữa");
  const [isPayingVNPay, setIsPayingVNPay] = useState(false);
  const [isSyncingVNPay, setIsSyncingVNPay] = useState(false);
  const [reviewProduct, setReviewProduct] = useState<{
    slug: string;
    name: string;
  } | null>(null);
  const [, setReviewVersion] = useState(0);
  const { add } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    if (initialOrder) {
      setOrder(initialOrder);
      return;
    }
    if (!id) return;

    let isMounted = true;
    async function loadOrder() {
      setLoading(true);
      setError(null);
      try {
        const cleanId = id!.replace(/^#|^ord-?/i, "");
        const numId = /^\d+$/.test(cleanId) ? Number(cleanId) : null;
        if (numId !== null && numId > 0) {
          const res = await orderApi.getById(numId);
          const model = toOrderModel(res);
          if (isMounted) setOrder(model);

          if (model.paymentMethod === "VNPAY" && model.paymentStatus === "PENDING") {
            void orderApi
              .syncPayment(numId)
              .then((synced) => {
                if (isMounted && synced.payment?.status === "PAID") {
                  setOrder(toOrderModel(synced));
                }
              })
              .catch(() => {});
          }
        } else {
          if (isMounted) setError("Mã đơn hàng không hợp lệ.");
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Không thể tải thông tin đơn hàng.",
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    void loadOrder();
    return () => {
      isMounted = false;
    };
  }, [initialOrder, id]);

  const progress = order ? getOrderProgress(order.status) : [];

  const handleReorder = () => {
    if (!order) return;
    order.lines.forEach((line) => {
      const numId = /^\d+$/.test(line.productId)
        ? Number(line.productId)
        : parseInt(line.productId.replace(/^p-?/i, ""), 10) || 1;
      add(numId, line.quantity);
    });
    toast(`Đã thêm ${order.lines.length} sản phẩm vào giỏ hàng!`, "success");
  };

  const handleConfirmCancel = async () => {
    if (!order) return;
    try {
      const numId = /^\d+$/.test(order.id) ? Number(order.id) : null;
      if (numId !== null) {
        const updated = await orderApi.cancel(numId);
        setOrder(toOrderModel(updated));
      } else {
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                status: "CANCELLED",
                cancelReason,
              }
            : prev,
        );
      }
      setCancelModalOpen(false);
      toast(`Đã hủy đơn hàng ${order.code}!`, "info");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Không thể hủy đơn hàng",
        "error",
      );
    }
  };

  const handlePayVNPay = async () => {
    if (!order) return;
    const numId = /^\d+$/.test(order.id) ? Number(order.id) : null;
    if (!numId) {
      toast("Mã đơn hàng không hợp lệ.", "error");
      return;
    }
    setIsPayingVNPay(true);
    try {
      const res = await orderApi.createVNPayUrl(numId);
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else {
        toast("Không tạo được liên kết thanh toán VNPay.", "error");
      }
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Lỗi kết nối cổng thanh toán VNPay.",
        "error",
      );
    } finally {
      setIsPayingVNPay(false);
    }
  };

  const handleSyncVNPay = async () => {
    if (!order) return;
    const numId = /^\d+$/.test(order.id) ? Number(order.id) : null;
    if (!numId) {
      toast("Mã đơn hàng không hợp lệ.", "error");
      return;
    }
    setIsSyncingVNPay(true);
    try {
      const res = await orderApi.syncPayment(numId);
      const updatedModel = toOrderModel(res);
      setOrder(updatedModel);
      if (updatedModel.paymentStatus === "PAID") {
        toast("Đồng bộ thành công: Đơn hàng đã được xác nhận thanh toán!", "success");
      } else {
        toast("Kết quả từ VNPay: Chưa có thông tin giao dịch thành công cho đơn này.", "info");
      }
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Không thể kiểm tra với VNPay lúc này.",
        "error",
      );
    } finally {
      setIsSyncingVNPay(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="container min-h-[60vh] flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 size={40} className="animate-spin text-muted mx-auto mb-4" />
            <p className="text-sm text-muted">Đang tải thông tin đơn hàng từ máy chủ...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <Header />
        <main className="container min-h-[60vh] py-16 px-4">
          <div
            role="alert"
            className="max-w-[600px] mx-auto text-center p-12 bg-red-100 text-red-800 rounded-2xl"
          >
            <AlertCircle size={48} className="mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Không tìm thấy đơn hàng</h2>
            <p className="text-sm mb-6">
              {error ?? "Đơn hàng không tồn tại hoặc bạn không có quyền xem đơn hàng này."}
            </p>
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm"
            >
              ← Danh sách đơn hàng
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="container py-12 pb-28 min-h-[72vh]">
        <nav className="flex items-center gap-2 text-xs md:text-sm text-muted mb-8" aria-label="Đường dẫn">
          <Link href="/" className="hover:text-ink">Trang chủ</Link>
          <span>/</span>
          <Link href="/orders" className="hover:text-ink">Đơn hàng của tôi</Link>
          <span>/</span>
          <span className="text-ink font-semibold">{order.code}</span>
        </nav>

        <div className="flex items-start md:items-center justify-between gap-6 flex-wrap pb-6 border-b-2 border-ink mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#006ce1] block mb-1">
              Thời gian đặt: {formatOrderDate(order.createdAt)}
            </span>
            <h1 className="font-heading m-0 text-2xl md:text-4xl font-extrabold tracking-tight text-ink">
              Đơn hàng #{order.code}
            </h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={order.status} />
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold text-ink border border-[#e0e0e0] hover:border-slate-400 bg-white transition-colors cursor-pointer"
              onClick={handleReorder}
            >
              <RotateCcw size={15} /> Mua lại
            </button>
            {order.status === "PENDING" && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-100 hover:bg-red-600 hover:text-white border border-red-300 rounded-xl text-red-800 text-xs md:text-sm font-semibold cursor-pointer transition-colors"
                onClick={() => setCancelModalOpen(true)}
              >
                <XCircle size={15} /> Hủy đơn hàng
              </button>
            )}
          </div>
        </div>

        {/* Cancelled Alert, Expired Reconciliation Alert, or Progress Tracker */}
        {order.status === "CANCELLED" ? (
          <section className="flex items-start gap-4 my-7 p-5 border border-red-200 bg-red-50 rounded-2xl text-red-900" role="alert">
            <AlertCircle size={28} className="shrink-0 mt-0.5 text-red-600" />
            <div>
              <strong className="block text-base mb-1">Đơn hàng đã được hủy</strong>
              <p className="m-0 text-sm">
                Lý do: {order.cancelReason || "Người mua yêu cầu hủy đơn."}.
                Tồn kho linh kiện đã được giải phóng tự động.
              </p>
            </div>
          </section>
        ) : order.status === "EXPIRED_PENDING_RECONCILIATION" ? (
          <section className="flex items-start gap-4 my-7 p-5 border border-rose-200 bg-rose-50 rounded-2xl text-rose-900" role="alert">
            <Clock3 size={28} className="shrink-0 mt-0.5 text-rose-600" />
            <div>
              <strong className="block text-base mb-1">Đơn hàng hết hạn thanh toán — Chờ đối soát</strong>
              <p className="m-0 text-sm leading-relaxed">
                Đơn hàng đã vượt quá thời hạn 15 phút thanh toán trực tuyến. Hệ thống đang tiến hành đối soát kết quả giao dịch với VNPay. Linh kiện trong đơn hàng của bạn tạm thời vẫn được giữ chỗ an toàn. Nếu bạn đã hoàn tất thanh toán trên VNPay, trạng thái sẽ tự động cập nhật sau khi đối soát thành công. Vui lòng không thực hiện thanh toán mới.
              </p>
            </div>
          </section>
        ) : (
          <ol className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-0 py-8 mb-8 list-none p-0" aria-label="Tiến trình đơn hàng">
            {progressSteps.map((step) => {
              const reached = progress.includes(step.value);
              const Icon = step.icon;
              return (
                <li
                  key={step.value}
                  className={`flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2.5 relative ${
                    reached ? "text-ink font-semibold" : "text-slate-400 font-normal"
                  }`}
                >
                  <span
                    className={`z-10 grid place-items-center w-11 h-11 rounded-full border-2 transition-colors ${
                      reached
                        ? "border-[#006ce1] bg-[#006ce1] text-white"
                        : "border-slate-300 bg-white text-slate-400"
                    }`}
                  >
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <span className="text-xs md:text-sm font-semibold">{step.label}</span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)] gap-8 items-start">
          {/* Products Panel */}
          <section className="border border-[#e0e0e0] rounded-2xl bg-white overflow-hidden">
            <div className="flex items-center justify-between p-5 md:p-6 border-b border-[#e0e0e0]">
              <h2 className="m-0 text-lg font-bold text-ink">Danh sách linh kiện trong đơn</h2>
              <span className="text-xs text-muted">{order.lines.length} sản phẩm</span>
            </div>

            {order.lines.map((line) => (
              <article className="grid grid-cols-[60px_minmax(0,1fr)_auto] items-center gap-4.5 p-5 md:p-6 border-b border-[#e0e0e0]" key={line.productId}>
                <div className="grid place-items-center aspect-square bg-blue-50 text-[#006ce1] text-2xl font-extrabold rounded-xl" aria-hidden="true">
                  {line.name.slice(0, 1)}
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-muted block mb-0.5">{line.category}</span>
                  <h3 className="m-0 mb-1 text-sm md:text-base font-bold text-ink">
                    <Link href={`/products/${line.slug}`} className="hover:text-[#006ce1] transition-colors">
                      {line.name}
                    </Link>
                  </h3>
                  <p className="m-0 mb-2 text-xs md:text-sm text-muted">
                    Đơn giá: {formatPrice(line.unitPrice)} · Số lượng: <b>{line.quantity}</b>
                  </p>
                  {order.status === "DELIVERED" && (
                    hasUserReviewedProduct(line.slug, order.id) ? (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-lg">
                        <CheckCircle2 size={13} /> Đã đánh giá linh kiện
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 bg-slate-50 border border-[#e0e0e0] text-ink text-xs font-semibold px-3 py-1.5 rounded-lg hover:border-amber-400 hover:text-amber-700 transition-colors cursor-pointer"
                        onClick={() =>
                          setReviewProduct({ slug: line.slug, name: line.name })
                        }
                      >
                        <Star size={14} /> Viết đánh giá linh kiện
                      </button>
                    )
                  )}
                </div>
                <strong className="text-sm md:text-base text-ink font-specs font-bold">
                  {formatPrice(line.unitPrice * line.quantity)}
                </strong>
              </article>
            ))}

            <dl className="m-0 p-5 md:p-6 text-sm">
              <div className="flex justify-between py-1.5">
                <dt className="text-muted">Phí vận chuyển</dt>
                <dd className="m-0 font-semibold text-ink">Miễn phí</dd>
              </div>
              <div className="flex justify-between py-1.5">
                <dt className="text-muted">Phương thức thanh toán</dt>
                <dd className="m-0 font-semibold text-ink">{paymentMethodLabels[order.paymentMethod]}</dd>
              </div>
              <div className="flex justify-between pt-4 mt-2 border-t border-[#e0e0e0] text-lg font-extrabold text-ink font-specs">
                <dt>Tổng cộng</dt>
                <dd className="m-0">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </section>

          {/* Recipient & Payment Panel */}
          <aside className="flex flex-col gap-5">
            <div className="border border-[#e0e0e0] rounded-2xl bg-white p-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#006ce1] block mb-1">
                Địa chỉ nhận hàng
              </span>
              <h2 className="m-0 mb-1 text-lg font-bold text-ink">{order.recipient.name}</h2>
              <p className="m-0 mb-1 text-sm font-semibold text-ink">{order.recipient.phone}</p>
              <p className="m-0 text-xs md:text-sm text-slate-600 leading-relaxed">{order.recipient.address}</p>
            </div>

            <div className="border border-[#e0e0e0] rounded-2xl bg-white p-6 flex flex-col gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#006ce1] block">
                Chi tiết thanh toán
              </span>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard size={18} className="text-muted" />
                <strong className="text-ink">{paymentMethodLabels[order.paymentMethod]}</strong>
              </div>

              <div className="flex justify-between items-center text-xs md:text-sm text-muted">
                <span>Trạng thái tiền:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    order.paymentStatus === "PAID"
                      ? "bg-emerald-100 text-emerald-800"
                      : order.paymentStatus === "FAILED"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {paymentStatusLabels[order.paymentStatus]}
                </span>
              </div>

              {order.paymentMethod === "VNPAY" && (
                <div className="mt-2 flex flex-col gap-3">
                  {order.paymentStatus === "PAID" ? (
                    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs md:text-sm font-semibold">
                      <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                      <span>Đã thanh toán thành công qua VNPay</span>
                    </div>
                  ) : order.status === "EXPIRED_PENDING_RECONCILIATION" ? (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-rose-800">
                        <AlertCircle size={15} className="shrink-0 text-rose-600" />
                        <span>Hết hạn 15 phút — Đang đối soát</span>
                      </div>
                      <p className="m-0 text-[11px] text-rose-800 leading-relaxed">
                        Đơn hàng đã hết thời gian thanh toán trực tuyến. Tồn kho vẫn được giữ chỗ trong khi hệ thống xác minh giao dịch với VNPay.
                      </p>
                      <button
                        type="button"
                        disabled={isSyncingVNPay}
                        className="w-full inline-flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-semibold text-rose-800 bg-rose-100/70 hover:bg-rose-200 border border-rose-300 transition-colors cursor-pointer disabled:opacity-50"
                        onClick={handleSyncVNPay}
                      >
                        <RefreshCw size={13} className={isSyncingVNPay ? "animate-spin" : ""} />
                        {isSyncingVNPay ? "Đang đối soát với VNPay..." : "Đối soát kết quả thanh toán ngay"}
                      </button>
                    </div>
                  ) : order.status !== "CANCELLED" ? (
                    <>
                      <VNPayCountdown
                        expiresAt={order.paymentExpiresAt}
                        onExpire={() => {
                          const cleanId = order.id.replace(/^#|^ord-?/i, "");
                          const numId = /^\d+$/.test(cleanId) ? Number(cleanId) : null;
                          if (numId) {
                            void orderApi.getById(numId).then((res) => setOrder(toOrderModel(res))).catch(() => {});
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={isPayingVNPay}
                        className="w-full inline-flex items-center justify-center gap-2 p-3 rounded-xl text-xs md:text-sm font-bold text-white bg-[#006ce1] hover:bg-[#0051a8] disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
                        onClick={handlePayVNPay}
                      >
                        {isPayingVNPay ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Đang kết nối cổng VNPay...
                          </>
                        ) : (
                          <>
                            <CreditCard size={16} />
                            Thanh toán ngay qua VNPay
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={isSyncingVNPay}
                        className="w-full inline-flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer disabled:opacity-50"
                        onClick={handleSyncVNPay}
                      >
                        <RefreshCw size={14} className={isSyncingVNPay ? "animate-spin" : ""} />
                        {isSyncingVNPay ? "Đang kiểm tra với VNPay..." : "Đã thanh toán? Bấm để kiểm tra / đồng bộ"}
                      </button>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            <div className="border border-[#e0e0e0] rounded-2xl bg-slate-50 p-5 text-xs md:text-sm">
              <strong className="block mb-1 text-ink font-bold">Cần hỗ trợ về đơn hàng này?</strong>
              <p className="m-0 text-muted">Hotline CSKH: 1900 6868 hoặc nhắn qua Zalo hỗ trợ kỹ thuật.</p>
            </div>
          </aside>
        </div>

        {/* Cancel Confirmation Modal */}
        {cancelModalOpen && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 grid place-items-center p-5"
            onClick={() => setCancelModalOpen(false)}
          >
            <div
              className="bg-white rounded-2xl p-7 md:p-8 max-w-[480px] w-full shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="cancel-title" className="m-0 mb-2.5 text-xl font-bold text-ink tracking-tight">
                Xác nhận hủy đơn hàng
              </h2>
              <p className="m-0 mb-4 text-sm text-slate-600">
                Bạn có chắc chắn muốn hủy đơn hàng <b>{order.code}</b> không?
              </p>
              <label htmlFor="cancelReasonSelect" className="block text-xs font-semibold text-ink mb-1.5">
                Lý do hủy đơn:
              </label>
              <select
                id="cancelReasonSelect"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none mb-6"
              >
                <option value="Đổi ý không muốn mua nữa">Đổi ý không muốn mua nữa</option>
                <option value="Muốn thay đổi địa chỉ nhận hàng">Muốn thay đổi địa chỉ nhận hàng</option>
                <option value="Muốn đổi sang linh kiện khác">Muốn đổi sang linh kiện khác</option>
                <option value="Tìm thấy giá rẻ hơn ở nơi khác">Tìm thấy giá rẻ hơn ở nơi khác</option>
                <option value="Khác">Khác...</option>
              </select>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-ink border border-[#e0e0e0] hover:border-slate-400 bg-white transition-colors cursor-pointer"
                  onClick={() => setCancelModalOpen(false)}
                >
                  Không, giữ lại đơn
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm cursor-pointer"
                  onClick={handleConfirmCancel}
                >
                  Xác nhận hủy đơn
                </button>
              </div>
            </div>
          </div>
        )}

        {reviewProduct && (
          <WriteReviewModal
            isOpen={Boolean(reviewProduct)}
            onClose={() => setReviewProduct(null)}
            productSlug={reviewProduct.slug}
            productName={reviewProduct.name}
            orderId={order.id}
            onSuccess={() => setReviewVersion((v) => v + 1)}
          />
        )}
      </main>
      <Footer />
    </>
  );
}

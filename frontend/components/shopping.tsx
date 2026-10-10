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
  Loader2,
} from "lucide-react";
import { Header, Footer } from "./storefront";
import { useCart } from "./cart-provider";
import { useAuth } from "./auth-provider";
import { orderApi, OrderApiError } from "../lib/order-api";
import { useToast } from "./toast";
import { formatPrice, products } from "../lib/products";

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
  const { user } = useAuth();
  const { items, add, update, clear } = useCart();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState("");
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const [orderTotalAmount, setOrderTotalAmount] = useState<number>(0);
  const [isGeneratingPaymentUrl, setIsGeneratingPaymentUrl] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "VNPAY">("COD");
  const [paymentUrl, setPaymentUrl] = useState<string>("");
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

  const lines = items.map((item) => {
    const foundProduct = products.find((product) => product.id === item.id || product.id === `p${item.id}`);
    const product = foundProduct ?? {
      id: item.id,
      slug: item.id,
      name: item.name,
      price: item.price ?? item.unitPrice,
      stock: item.stock ?? 999,
      brand: item.product?.brand ?? "PC Store",
      category: item.product?.category ?? "Linh kiện",
      description: "",
      specs: {},
      accent: item.product?.accent ?? "#00539b",
      featured: false,
      rating: 5,
      reviewCount: 0,
      warranty: "Chính hãng",
      images: ["Góc nhìn chính"],
    };
    return { ...item, product };
  });

  const subtotal = lines.reduce(
    (sum, line) => sum + (line.price || line.product.price) * line.quantity,
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

    if (!user) {
      setError("Vui lòng đăng nhập tài khoản để tiến hành đặt hàng.");
      toast("Vui lòng đăng nhập để tiếp tục thanh toán!", "error");
      return;
    }

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

    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await orderApi.checkout(
        {
          shippingName: recipientName.trim(),
          shippingPhone: recipientPhone.trim(),
          shippingAddressText: recipientAddress.trim(),
          paymentMethod: paymentMethod,
        },
        idempotencyKey,
      );

      const orderCode = `#${res.order.orderId}`;
      setOrder(orderCode);
      setCreatedOrderId(res.order.orderId);
      setOrderTotalAmount(res.order.totalAmount);
      await clear();

      if (paymentMethod === "VNPAY") {
        setIsGeneratingPaymentUrl(true);
        try {
          const vnpayRes = await orderApi.createVNPayUrl(res.order.orderId);
          if (vnpayRes.paymentUrl) {
            setPaymentUrl(vnpayRes.paymentUrl);
          }
        } catch (vnpayErr) {
          console.error("Lỗi tạo URL VNPay:", vnpayErr);
        } finally {
          setIsGeneratingPaymentUrl(false);
        }
      }

      toast(
        res.replayed
          ? `Đơn hàng ${orderCode} đã được tạo trước đó.`
          : `Tạo đơn hàng ${orderCode} thành công!`,
        "success",
      );
    } catch (err) {
      if (err instanceof OrderApiError) {
        if (err.code === "CART_EMPTY") {
          setError("Giỏ hàng trên máy chủ đang trống. Vui lòng thêm sản phẩm vào giỏ.");
        } else if (err.code === "OUT_OF_STOCK") {
          setError("Một số sản phẩm trong giỏ hàng đã hết hàng hoặc không đủ số lượng.");
        } else if (err.code === "UNAUTHORIZED") {
          setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.");
        } else {
          setError(err.message || `Lỗi đặt hàng: ${err.code}`);
        }
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Có lỗi xảy ra khi gửi yêu cầu đặt hàng. Vui lòng thử lại.",
        );
      }
      toast("Đặt hàng chưa thành công!", "error");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <Header />
      <main className="container py-12 pb-24 min-h-[70vh]">
        <nav className="flex flex-wrap gap-x-7 gap-y-3 mb-10 text-muted text-sm font-medium" aria-label="Các bước mua hàng">
          <Link
            href="/cart"
            className={!checkout ? "text-[#006ce1] font-bold" : "hover:text-ink"}
            aria-current={!checkout ? "page" : undefined}
          >
            1. Giỏ hàng ({lines.length})
          </Link>
          <span className={checkout ? "text-[#006ce1] font-bold" : ""} aria-current={checkout ? "step" : undefined}>
            2. Thông tin nhận hàng & Thanh toán
          </span>
          <span className={order ? "text-emerald-600 font-bold" : ""}>3. Hoàn tất đơn</span>
        </nav>

        <h1 className="font-heading text-3xl md:text-5xl font-extrabold tracking-tight mb-2 text-ink">
          {order
            ? "Đơn hàng đã được ghi nhận!"
            : checkout
              ? "Xác nhận địa chỉ & Thanh toán"
              : "Giỏ hàng linh kiện của bạn"}
        </h1>
        <p className="text-muted max-w-2xl mb-9 text-sm leading-relaxed">
          PC Store cam kết 100% linh kiện chính hãng · Miễn phí giao hàng toàn quốc · Kiểm tra hàng trước khi nhận.
        </p>

        {order ? (
          <section className="max-w-[680px] mx-auto p-8 md:p-11 bg-white border border-[#e0e0e0] rounded-2xl text-center shadow-sm" role="status">
            <div className="w-20 h-20 rounded-full bg-emerald-100 grid place-items-center mx-auto mb-4.5 text-emerald-600">
              <CheckCircle2 size={52} />
            </div>
            <h2 className="text-2xl font-bold text-ink mb-2">Cảm ơn bạn đã đặt hàng tại PC Store!</h2>
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3.5 px-5 my-4.5 mb-7 inline-flex gap-2.5 items-center text-sm">
              <span className="text-muted">Mã đơn hàng của bạn:</span>
              <strong className="text-lg text-[#006ce1] font-mono">{order}</strong>
            </div>

            {paymentMethod === "VNPAY" ? (
              <div className="bg-slate-50 border border-[#e0e0e0] rounded-2xl p-6 text-left mb-7">
                <div className="flex items-start gap-3 mb-5 text-ink">
                  <CreditCard size={24} className="text-[#006ce1] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="m-0 mb-1 text-base md:text-lg font-bold">Thanh toán trực tuyến VNPay Sandbox</h3>
                    <p className="m-0 text-xs md:text-sm text-muted">Đơn hàng có thời hạn thanh toán 15 phút tính từ lúc đặt hàng:</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 text-xs md:text-sm bg-white p-4 rounded-xl border border-slate-200 mb-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-muted">Cổng thanh toán:</span>
                    <strong className="text-ink">VNPay Sandbox (VietQR / ATM / Thẻ quốc tế)</strong>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-muted">Số tiền thanh toán:</span>
                    <strong className="text-base text-red-600 font-specs font-bold">
                      {formatPrice(orderTotalAmount || finalTotal)}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Mã đơn hàng:</span>
                    <strong className="font-mono text-sm text-[#006ce1]">{order}</strong>
                  </div>
                </div>

                {isGeneratingPaymentUrl ? (
                  <div className="inline-flex items-center justify-center gap-2 w-full py-3 bg-blue-50 text-[#006ce1] border border-blue-200 rounded-xl font-bold text-sm">
                    <Loader2 size={16} className="animate-spin text-[#006ce1]" />
                    Đang khởi tạo cổng thanh toán VNPay...
                  </div>
                ) : paymentUrl ? (
                  <a
                    href={paymentUrl}
                    className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#006ce1] hover:bg-[#0051a8] text-white rounded-xl font-bold text-sm transition-colors text-center shadow-sm cursor-pointer"
                  >
                    Tiếp tục thanh toán trên VNPay <ArrowRight size={16} />
                  </a>
                ) : (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-2.5 px-3.5 text-xs text-blue-900">
                    <ShieldCheck size={18} className="shrink-0 text-[#006ce1]" />
                    <span>
                      Đơn hàng đã được ghi nhận. Bạn có thể mở chi tiết đơn trong mục Đơn hàng để thanh toán lại trong vòng 15 phút.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-6 text-left">
                <p className="m-0 mb-1.5 text-emerald-900 text-sm">
                  Phương thức: <strong>Thanh toán tiền mặt khi nhận hàng (COD)</strong>.
                </p>
                <small className="text-emerald-700 text-xs">
                  Nhân viên giao nhận sẽ liên hệ số điện thoại trước khi giao. Vui lòng chuẩn bị sẵn số tiền {formatPrice(orderTotalAmount || finalTotal)}.
                </small>
              </div>
            )}

            <div className="flex justify-center gap-3 flex-wrap">
              <Link
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm"
                href="/orders"
              >
                Theo dõi trong Đơn hàng của tôi
              </Link>
              <Link
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-ink border border-[#e0e0e0] hover:border-slate-400 bg-white transition-colors"
                href="/products"
              >
                Tiếp tục mua sắm
              </Link>
            </div>
          </section>
        ) : !lines.length ? (
          <section className="p-14 md:p-16 px-6 text-center bg-white border border-[#e0e0e0] rounded-2xl">
            <ShoppingBag size={54} className="mx-auto mb-5 text-muted" />
            <h2 className="text-2xl font-bold text-ink mb-2.5">Giỏ hàng của bạn đang trống</h2>
            <p className="text-sm text-muted max-w-md mx-auto mb-6">
              Hãy khám phá danh mục linh kiện, laptop hoặc bắt đầu tự ráp một cấu hình PC mới.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm"
                href="/products"
              >
                Khám phá sản phẩm
              </Link>
              <Link
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-ink border border-[#e0e0e0] hover:border-slate-400 bg-white transition-colors"
                href="/builder"
              >
                Đi đến PC Builder
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border-none cursor-pointer"
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
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-8 items-start">
            <section
              aria-label={
                checkout ? "Thông tin giao hàng & thanh toán" : "Sản phẩm trong giỏ"
              }
              className="flex flex-col gap-6"
            >
              {checkout ? (
                <form
                  id="checkout-form"
                  className="space-y-6"
                  onSubmit={submit}
                >
                  {/* Address Section */}
                  <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 md:p-7">
                    <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-[#e0e0e0]">
                      <MapPin size={20} className="text-[#006ce1]" />
                      <h2 className="text-lg font-bold text-ink m-0">Địa chỉ nhận hàng</h2>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <button
                        type="button"
                        className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                          addressMode === "saved"
                            ? "bg-ink text-white"
                            : "bg-slate-50 text-slate-700 border border-[#e0e0e0] hover:bg-slate-100"
                        }`}
                        onClick={() => setAddressMode("saved")}
                      >
                        Sổ địa chỉ đã lưu (2)
                      </button>
                      <button
                        type="button"
                        className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                          addressMode === "custom"
                            ? "bg-ink text-white"
                            : "bg-slate-50 text-slate-700 border border-[#e0e0e0] hover:bg-slate-100"
                        }`}
                        onClick={() => setAddressMode("custom")}
                      >
                        + Nhập địa chỉ mới
                      </button>
                    </div>

                    {addressMode === "saved" ? (
                      <div className="flex flex-col gap-3">
                        {savedAddresses.map((addr) => (
                          <label
                            key={addr.id}
                            className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                              selectedAddrId === addr.id
                                ? "border-[#006ce1] bg-blue-50/50 ring-1 ring-[#006ce1]"
                                : "border-[#e0e0e0] hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="saved_address"
                              value={addr.id}
                              checked={selectedAddrId === addr.id}
                              onChange={() => setSelectedAddrId(addr.id)}
                              className="mt-1 text-[#006ce1]"
                            />
                            <div>
                              <span className="inline-block text-[11px] font-bold bg-blue-100 text-[#006ce1] px-2 py-0.5 rounded-full mb-1.5">
                                {addr.label}
                              </span>
                              <strong className="block text-sm text-ink mb-0.5">{addr.name} · {addr.phone}</strong>
                              <p className="m-0 text-xs md:text-sm text-slate-600 leading-relaxed">{addr.address}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <fieldset disabled={busy} className="border-0 p-0 grid gap-3">
                        <div>
                          <label htmlFor="receiver" className="block text-xs font-semibold text-ink mb-1">Họ và tên người nhận *</label>
                          <input
                            id="receiver"
                            name="name"
                            autoComplete="name"
                            required
                            minLength={2}
                            placeholder="Ví dụ: Nguyễn Văn A"
                            className="w-full p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#006ce1]"
                          />
                        </div>
                        <div>
                          <label htmlFor="phone" className="block text-xs font-semibold text-ink mb-1">Số điện thoại liên hệ *</label>
                          <input
                            id="phone"
                            name="phone"
                            type="tel"
                            autoComplete="tel"
                            inputMode="tel"
                            pattern="(0[0-9]{9}|\+84[0-9]{9})"
                            required
                            placeholder="0901 234 567"
                            className="w-full p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#006ce1]"
                          />
                        </div>
                        <div>
                          <label htmlFor="address" className="block text-xs font-semibold text-ink mb-1">Địa chỉ chi tiết *</label>
                          <textarea
                            id="address"
                            name="address"
                            autoComplete="street-address"
                            required
                            minLength={8}
                            rows={3}
                            placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                            className="w-full p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#006ce1]"
                          />
                        </div>
                      </fieldset>
                    )}

                    <div className="mt-4">
                      <label htmlFor="notes" className="block text-xs font-semibold text-ink mb-1">
                        Ghi chú đơn hàng (Tùy chọn)
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        rows={2}
                        maxLength={300}
                        placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi đến 15 phút..."
                        className="w-full p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#006ce1]"
                      />
                    </div>
                  </div>

                  {/* Payment Methods Section */}
                  <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 md:p-7">
                    <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-[#e0e0e0]">
                      <CreditCard size={20} className="text-[#006ce1]" />
                      <h2 className="text-lg font-bold text-ink m-0">Phương thức thanh toán</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <label
                        className={`flex items-start gap-3 p-4.5 border rounded-xl cursor-pointer transition-all ${
                          paymentMethod === "COD"
                            ? "bg-blue-50/50 border-[#006ce1] shadow-sm ring-1 ring-[#006ce1]"
                            : "bg-white border-[#e0e0e0] hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment_method"
                          value="COD"
                          checked={paymentMethod === "COD"}
                          onChange={() => setPaymentMethod("COD")}
                          className="mt-1 text-[#006ce1]"
                        />
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <strong className="text-sm text-ink">Thanh toán khi nhận hàng (COD)</strong>
                            <span className="text-[10px] font-bold bg-blue-100 text-[#006ce1] px-1.5 py-0.5 rounded">Mặc định</span>
                          </div>
                          <p className="m-0 text-xs text-slate-600 leading-relaxed">
                            Thanh toán trực tiếp bằng tiền mặt cho nhân viên giao hàng sau khi đồng kiểm hàng hóa.
                          </p>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-3 p-4.5 border rounded-xl cursor-pointer transition-all ${
                          paymentMethod === "VNPAY"
                            ? "bg-blue-50/50 border-[#006ce1] shadow-sm ring-1 ring-[#006ce1]"
                            : "bg-white border-[#e0e0e0] hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment_method"
                          value="VNPAY"
                          checked={paymentMethod === "VNPAY"}
                          onChange={() => setPaymentMethod("VNPAY")}
                          className="mt-1 text-[#006ce1]"
                        />
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <strong className="text-sm text-ink">Cổng thanh toán VNPay Sandbox</strong>
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">VietQR / Thẻ ATM</span>
                          </div>
                          <p className="m-0 text-xs text-slate-600 leading-relaxed">
                            Quét mã VietQR 24/7 từ mọi ứng dụng ngân hàng hoặc thẻ ATM nội địa. Thời hạn thanh toán 15 phút.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {error && (
                    <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs md:text-sm flex justify-between items-center">
                      <span>{error}</span>
                      <Link href="/cart" className="underline font-semibold ml-2">Quay lại kiểm tra giỏ hàng</Link>
                    </div>
                  )}
                </form>
              ) : (
                /* Cart Items List */
                <div className="flex flex-col gap-4">
                  {lines.map(({ product, quantity }) => (
                    <article className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-6 bg-white border border-[#e0e0e0] rounded-2xl hover:border-slate-300 transition-colors" key={product.id}>
                      <div
                        className="w-18 h-18 rounded-xl text-white font-gaming text-2xl font-bold shrink-0 grid place-items-center"
                        style={{ background: product.accent }}
                        aria-hidden="true"
                      >
                        {product.name.slice(0, 1)}
                      </div>

                      <div className="flex-1 min-w-[170px]">
                        <span className="font-specs text-[11px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                          {product.brand} · {product.category}
                        </span>
                        <h2 className="font-heading text-base md:text-lg font-bold text-ink m-0 mb-1">
                          <Link href={`/products/${product.slug}`} className="hover:text-[#006ce1] transition-colors">
                            {product.name}
                          </Link>
                        </h2>
                        <p className="font-specs text-xs md:text-sm font-semibold text-muted m-0 mb-3">
                          {formatPrice(product.price)} / sản phẩm
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="inline-flex items-center border border-[#e0e0e0] rounded-xl overflow-hidden bg-white">
                            <button
                              type="button"
                              disabled={quantity <= 1}
                              onClick={() => update(product.id, quantity - 1)}
                              aria-label={`Giảm số lượng ${product.name}`}
                              className="w-8 h-8 grid place-items-center text-sm font-bold hover:bg-slate-100 disabled:opacity-40 cursor-pointer border-none bg-transparent"
                            >
                              −
                            </button>
                            <output aria-live="polite" className="w-8 text-center text-sm font-bold text-ink">
                              {quantity}
                            </output>
                            <button
                              type="button"
                              disabled={quantity >= product.stock}
                              onClick={() => update(product.id, quantity + 1)}
                              aria-label={`Tăng số lượng ${product.name}`}
                              className="w-8 h-8 grid place-items-center text-sm font-bold hover:bg-slate-100 disabled:opacity-40 cursor-pointer border-none bg-transparent"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 text-red-600 hover:bg-red-50 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                            onClick={() => {
                              update(product.id, 0);
                              toast(`Đã gỡ "${product.name}" khỏi giỏ`, "info");
                            }}
                            aria-label={`Xóa ${product.name}`}
                          >
                            <Trash2 size={15} /> Gỡ bỏ
                          </button>
                        </div>
                        {quantity >= product.stock && (
                          <small className="block text-[11px] text-amber-600 mt-1.5">
                            Đã đạt số lượng tồn kho tối đa ({product.stock}).
                          </small>
                        )}
                      </div>
                      <strong className="font-specs text-lg font-bold text-ink whitespace-nowrap">
                        {formatPrice(product.price * quantity)}
                      </strong>
                    </article>
                  ))}
                  <div className="flex justify-between items-center pt-2.5">
                    <Link className="text-xs md:text-sm font-semibold text-[#006ce1] hover:underline" href="/products">
                      ← Tiếp tục chọn thêm linh kiện
                    </Link>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-ink border border-[#e0e0e0] hover:border-slate-400 bg-white transition-colors cursor-pointer"
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
            <aside className="bg-white border border-[#e0e0e0] rounded-2xl p-7 sticky top-24 shadow-sm" aria-label="Tóm tắt đơn hàng">
              <h2 className="text-lg md:text-xl font-bold text-ink m-0 mb-4.5">Tóm tắt thanh toán</h2>

              {checkout && (
                <div className="flex flex-col gap-2.5 pb-4 mb-4 border-b border-[#e0e0e0] max-h-48 overflow-y-auto">
                  {lines.map(({ product, quantity }) => (
                    <div className="flex justify-between items-center text-xs" key={product.id}>
                      <span className="text-ink max-w-[220px] truncate">
                        {product.name} <small className="text-muted font-semibold">×{quantity}</small>
                      </span>
                      <strong className="font-specs text-ink">{formatPrice(product.price * quantity)}</strong>
                    </div>
                  ))}
                </div>
              )}

              {/* Promo Code Box */}
              <div className="mb-4.5 pb-4 border-b border-[#e0e0e0]">
                <label htmlFor="promo" className="flex items-center gap-1.5 text-xs font-bold uppercase text-muted mb-2">
                  <Tag size={15} /> Mã giảm giá / Ưu đãi
                </label>
                <div className="flex gap-2">
                  <input
                    id="promo"
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Nhập PCSTORE50K hoặc VIPBUILD"
                    className="flex-1 p-2 px-3 border border-[#e0e0e0] rounded-xl text-xs md:text-sm uppercase outline-none focus:border-[#006ce1]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-3.5 py-2 bg-ink hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer border-none"
                  >
                    Áp dụng
                  </button>
                </div>
                {appliedDiscount && (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 p-2 px-3 rounded-lg text-xs mt-2">
                    <span>
                      Mã <b>{appliedDiscount.code}</b>: Giảm {formatPrice(appliedDiscount.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAppliedDiscount(null)}
                      className="bg-transparent border-none text-emerald-800 text-base font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              <dl className="text-xs md:text-sm space-y-3 mb-5">
                <div className="flex justify-between">
                  <dt className="text-muted">Tạm tính hàng ({lines.length} món)</dt>
                  <dd className="font-semibold text-ink">{formatPrice(subtotal)}</dd>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between text-red-600 font-semibold">
                    <dt>Khuyến mãi voucher</dt>
                    <dd>-{formatPrice(appliedDiscount.amount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted">Phí vận chuyển</dt>
                  <dd className="text-emerald-600 font-bold">Miễn phí</dd>
                </div>
                <div className="flex justify-between pt-3 border-t border-[#e0e0e0] font-specs text-xl font-bold text-ink">
                  <dt>Tổng cộng</dt>
                  <dd>{formatPrice(finalTotal)}</dd>
                </div>
              </dl>

              {checkout ? (
                <button
                  form="checkout-form"
                  type="submit"
                  className="w-full p-3.5 font-nav text-sm md:text-base font-bold bg-[#006ce1] hover:bg-[#0051a8] text-white rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                  disabled={busy}
                >
                  {busy ? "Đang tạo đơn hàng…" : "Xác nhận đặt đơn"}
                </button>
              ) : (
                <Link
                  className="w-full inline-flex items-center justify-center gap-2 p-3.5 font-nav text-sm md:text-base font-bold bg-[#006ce1] hover:bg-[#0051a8] text-white rounded-xl transition-all shadow-md"
                  href="/checkout"
                >
                  Tiến hành đặt hàng <ArrowRight size={16} />
                </Link>
              )}

              <div className="flex items-center gap-2 text-[11px] text-muted mt-4 leading-relaxed">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>Bảo mật thanh toán 100% · Đổi trả linh kiện miễn phí</span>
              </div>

              {checkout && (
                <Link href="/cart" className="block text-center text-xs text-[#006ce1] font-semibold mt-3.5 hover:underline">
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

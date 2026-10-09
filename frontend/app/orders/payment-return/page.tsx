"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, XCircle, ArrowRight, ShoppingBag, ShieldCheck } from "lucide-react";
import { Header, Footer } from "@/components/storefront";
import { formatPrice } from "@/lib/products";

function PaymentReturnContent() {
  const searchParams = useSearchParams();
  const responseCode = searchParams.get("vnp_ResponseCode");
  const txnRef = searchParams.get("vnp_TxnRef") || "";
  const amountStr = searchParams.get("vnp_Amount") || "0";
  const transactionNo = searchParams.get("vnp_TransactionNo") || "";
  const bankCode = searchParams.get("vnp_BankCode") || "";

  const isSuccess = responseCode === "00";
  const amount = Math.round(Number(amountStr) / 100);

  // Extract orderId from referenceCode (PCS_{orderId}_{seq}_{timestamp})
  let orderId = "";
  if (txnRef.startsWith("PCS_")) {
    const parts = txnRef.split("_");
    if (parts.length >= 2) {
      orderId = parts[1];
    }
  }

  return (
    <div className="max-w-[640px] mx-auto p-6 md:p-10 bg-white border border-[#e0e0e0] rounded-2xl shadow-sm text-center">
      {isSuccess ? (
        <>
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center mx-auto mb-5 shadow-sm">
            <CheckCircle2 size={48} />
          </div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-ink mb-2">
            Thanh toán thành công!
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            Giao dịch qua cổng VNPay Sandbox đã hoàn tất. Đơn hàng của bạn đã được xác nhận thanh toán.
          </p>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-left text-xs md:text-sm space-y-3 mb-6">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-muted">Mã tham chiếu:</span>
              <strong className="font-mono text-ink">{txnRef}</strong>
            </div>
            {transactionNo && (
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-muted">Mã giao dịch VNPay:</span>
                <strong className="font-mono text-ink">{transactionNo}</strong>
              </div>
            )}
            {bankCode && (
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-muted">Ngân hàng:</span>
                <strong className="text-ink">{bankCode}</strong>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted">Số tiền thanh toán:</span>
              <strong className="text-base text-red-600 font-specs font-bold">
                {formatPrice(amount)}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 mb-6 text-left">
            <ShieldCheck size={18} className="shrink-0 text-emerald-600" />
            <span>
              Hệ thống đã nhận thanh toán và đang chuẩn bị đóng gói hàng theo thông tin địa chỉ của bạn.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            {orderId && (
              <Link
                href={`/orders/${orderId}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#006ce1] hover:bg-[#005bbd] transition-colors shadow-sm"
              >
                Xem chi tiết đơn hàng #{orderId} <ArrowRight size={16} />
              </Link>
            )}
            <Link
              href="/orders"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Danh sách đơn hàng
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 grid place-items-center mx-auto mb-5 shadow-sm">
            <XCircle size={48} />
          </div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-ink mb-2">
            Thanh toán chưa hoàn tất
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            Giao dịch bị hủy hoặc xảy ra lỗi trong quá trình thanh toán (Mã lỗi: {responseCode || "Không rõ"}).
          </p>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs md:text-sm text-amber-900 mb-6 text-left leading-relaxed">
            <strong>Lưu ý về giữ chỗ linh kiện:</strong> Đơn hàng của bạn vẫn được giữ chỗ trong vòng <strong>15 phút</strong> tính từ lúc đặt hàng. Bạn có thể mở chi tiết đơn hàng để thực hiện thanh toán lại trước khi hết hạn.
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            {orderId ? (
              <Link
                href={`/orders/${orderId}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#006ce1] hover:bg-[#005bbd] transition-colors shadow-sm"
              >
                Thử thanh toán lại đơn #{orderId} <ArrowRight size={16} />
              </Link>
            ) : (
              <Link
                href="/orders"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#006ce1] hover:bg-[#005bbd] transition-colors shadow-sm"
              >
                Đến trang Đơn hàng <ArrowRight size={16} />
              </Link>
            )}
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <ShoppingBag size={16} /> Tiếp tục mua sắm
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function VNPayPaymentReturnPage() {
  return (
    <>
      <Header />
      <main className="container py-12 min-h-[70vh] flex items-center justify-center">
        <Suspense fallback={<div className="text-center text-muted">Đang xử lý kết quả thanh toán...</div>}>
          <PaymentReturnContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

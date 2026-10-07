"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Header, Footer } from "../components/storefront";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error Boundary caught:", error);
  }, [error]);

  return (
    <>
      <Header />
      <main className="container min-h-[70vh] flex items-center justify-center py-12 px-6">
        <section className="max-w-[580px] w-full text-center bg-white border border-[#e0e0e0] rounded-3xl p-9 md:p-12 shadow-sm" role="alert">
          <span className="inline-block text-xs font-extrabold tracking-wider bg-amber-100 text-amber-700 px-3 py-1 rounded-full mb-4">
            SỰ CỐ HỆ THỐNG · LỖI XỬ LÝ
          </span>
          <div className="grid place-items-center mb-5 text-amber-500">
            <AlertTriangle size={64} />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-ink mb-3 font-heading">
            Không thể nạp dữ liệu
          </h1>
          <p className="text-base text-muted leading-relaxed mb-7">
            Đã có sự gián đoạn kết nối tạm thời trong quá trình xử lý yêu cầu phần cứng. Bạn có thể
            thử tải lại trang hoặc quay về trang chủ.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors bg-[#006ce1] hover:bg-[#0051a8] text-white shadow-sm cursor-pointer"
              onClick={() => reset()}
            >
              <RotateCcw size={16} /> Thử tải lại trang
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors border border-[#e0e0e0] hover:border-slate-400 text-ink bg-white"
            >
              <Home size={16} /> Về trang chủ
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

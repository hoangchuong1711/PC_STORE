import Link from "next/link";
import { Header, Footer } from "../components/storefront";
import { Cpu, ArrowLeft, Search, Hammer } from "lucide-react";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="container min-h-[70vh] flex items-center justify-center py-12 px-6">
        <section className="max-w-[580px] w-full text-center bg-white border border-[#e0e0e0] rounded-3xl p-9 md:p-12 shadow-sm" role="alert">
          <span className="inline-block text-xs font-extrabold tracking-wider bg-red-100 text-red-600 px-3 py-1 rounded-full mb-4">
            MÃ LỖI 404 · KHÔNG TÌM THẤY TRANG
          </span>
          <div className="grid place-items-center mb-5 text-slate-500">
            <Cpu size={64} />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-ink mb-3 font-heading">
            Mất tín hiệu phần cứng
          </h1>
          <p className="text-base text-muted leading-relaxed mb-7">
            Trang hoặc linh kiện máy tính bạn đang tìm kiếm không tồn tại, đã ngừng kinh doanh
            hoặc vừa được chuyển sang danh mục mới.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors bg-[#006ce1] hover:bg-[#0051a8] text-white shadow-sm"
            >
              <ArrowLeft size={16} /> Về trang chủ
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors border border-[#e0e0e0] hover:border-slate-400 text-ink bg-white"
            >
              <Search size={16} /> Tìm linh kiện khác
            </Link>
            <Link
              href="/builder"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors border border-[#e0e0e0] hover:border-slate-400 text-ink bg-white"
            >
              <Hammer size={16} /> Tự ráp PC
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

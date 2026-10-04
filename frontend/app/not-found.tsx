import Link from "next/link";
import { Header, Footer } from "../components/storefront";
import { Cpu, ArrowLeft, Search, Hammer } from "lucide-react";
import "../components/account.css";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="container error-page-container">
        <section className="error-card" role="alert">
          <span className="error-code-badge">MÃ LỖI 404 · KHÔNG TÌM THẤY TRANG</span>
          <div style={{ display: "grid", placeItems: "center", marginBottom: 20 }}>
            <Cpu size={64} color="#64748b" />
          </div>
          <h1>Mất tín hiệu phần cứng</h1>
          <p>
            Trang hoặc linh kiện máy tính bạn đang tìm kiếm không tồn tại, đã ngừng kinh doanh
            hoặc vừa được chuyển sang danh mục mới.
          </p>
          <div className="error-actions">
            <Link href="/" className="button button-primary">
              <ArrowLeft size={16} /> Về trang chủ
            </Link>
            <Link href="/products" className="button button-outline">
              <Search size={16} /> Tìm linh kiện khác
            </Link>
            <Link href="/builder" className="button button-outline">
              <Hammer size={16} /> Tự ráp PC
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

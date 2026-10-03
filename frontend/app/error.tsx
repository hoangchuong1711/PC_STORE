"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Header, Footer } from "../components/storefront";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import "../components/account.css";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error("App Error Boundary caught:", error);
  }, [error]);

  return (
    <>
      <Header />
      <main className="container error-page-container">
        <section className="error-card" role="alert">
          <span className="error-code-badge" style={{ background: "#fef3c7", color: "#b45309" }}>
            SỰ CỐ HỆ THỐNG · LỖI XỬ LÝ
          </span>
          <div style={{ display: "grid", placeItems: "center", marginBottom: 20 }}>
            <AlertTriangle size={64} color="#f59e0b" />
          </div>
          <h1>Không thể nạp dữ liệu</h1>
          <p>
            Đã có sự gián đoạn kết nối tạm thời trong quá trình xử lý yêu cầu phần cứng. Bạn có thể
            thử tải lại trang hoặc quay về trang chủ.
          </p>
          <div className="error-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={() => reset()}
            >
              <RotateCcw size={16} /> Thử tải lại trang
            </button>
            <Link href="/" className="button button-outline">
              <Home size={16} /> Về trang chủ
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

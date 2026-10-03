"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Header, Footer } from "./storefront";

type AuthMode = "login" | "register";

export function AuthPage({ mode }: { mode: AuthMode }) {
  const isLogin = mode === "login";
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitted(false);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");

    if (password.length < 6) {
      setError("Mật khẩu cần có ít nhất 6 ký tự.");
      return;
    }

    setSubmitted(true);
  }

  return (
    <>
      <Header />
      <main className="auth-page">
        <div className="auth-layout container">
          <section className="auth-aside">
            <span className="eyebrow">PC Store account</span>
            <h1>
              Góc máy của bạn,
              <em> bắt đầu từ đây.</em>
            </h1>
            <p>
              Lưu cấu hình, theo dõi đơn hàng và nhận hỗ trợ phù hợp với
              những thiết bị bạn đang dùng.
            </p>
            <div className="auth-aside-mark" aria-hidden="true">
              <span>PC</span>
              <strong>∞</strong>
            </div>
          </section>

          <section className="auth-card" aria-labelledby="auth-title">
            <div className="auth-card-heading">
              <span className="eyebrow">{isLogin ? "Chào mừng trở lại" : "Tạo tài khoản"}</span>
              <h2 id="auth-title">{isLogin ? "Đăng nhập" : "Bắt đầu cùng PC Store"}</h2>
              <p>
                {isLogin
                  ? "Đăng nhập để tiếp tục với góc máy của bạn."
                  : "Tạo tài khoản miễn phí để lưu lại hành trình mua sắm."}
              </p>
            </div>

            {submitted && (
              <div className="form-message success" role="status">
                {isLogin
                  ? "Đăng nhập mẫu thành công. API sẽ được kết nối sau."
                  : "Tài khoản mẫu đã được tạo. API sẽ được kết nối sau."}
              </div>
            )}
            {error && <div className="form-message error" role="alert">{error}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              {!isLogin && (
                <label>
                  Họ và tên
                  <input name="name" type="text" placeholder="Nguyễn Văn A" required />
                </label>
              )}
              <label>
                Email
                <input name="email" type="email" placeholder="ban@example.com" required />
              </label>
              <label>
                Mật khẩu
                <span className="password-field">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Tối thiểu 6 ký tự"
                    minLength={6}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? "Ẩn" : "Hiện"}
                  </button>
                </span>
              </label>
              {!isLogin && (
                <label className="check-row">
                  <input name="terms" type="checkbox" required />
                  <span>Tôi đồng ý với điều khoản sử dụng của PC Store.</span>
                </label>
              )}
              {isLogin && <Link className="forgot-link" href="/auth/login">Quên mật khẩu?</Link>}
              <button className="button button-primary auth-submit" type="submit">
                {isLogin ? "Đăng nhập" : "Tạo tài khoản"}
                <span>↗</span>
              </button>
            </form>

            <p className="auth-switch">
              {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
              <Link href={isLogin ? "/auth/register" : "/auth/login"}>
                {isLogin ? "Đăng ký ngay" : "Đăng nhập"}
              </Link>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

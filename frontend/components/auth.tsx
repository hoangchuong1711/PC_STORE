"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Header, Footer } from "./storefront";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import { authDestination, createAuthApi } from "../lib/auth-api";

type AuthMode = "login" | "register";

export function AuthPage({ mode }: { mode: AuthMode }) {
  const isLogin = mode === "login";
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setSubmitted(false);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");

    if (!isLogin && (password.length < 8 || password.length > 128)) {
      setError("Mật khẩu phải dài từ 8 đến 128 ký tự.");
      return;
    }

    setPending(true);
    try {
      const email = String(form.get("email") ?? "").trim();
      if (isLogin) {
        const user = await login(email, password);
        router.replace(authDestination(user));
      } else {
        await createAuthApi().register({ fullName: String(form.get("name") ?? "").trim(), email, password });
        setSubmitted(true);
      }
    } catch (cause) { setError((cause as Error).message); }
    finally { setPending(false); }
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
                  ? "Đăng nhập thành công."
                  : "Đã tạo tài khoản. Hãy đăng nhập để tiếp tục."}
                {!isLogin && <Link href="/auth/login"> Đăng nhập</Link>}
              </div>
            )}
            {error && <div className="form-message error" role="alert">{error}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              {!isLogin && (
                <label>
                  Họ và tên
                  <input name="name" type="text" placeholder="Nguyễn Văn A" maxLength={255} autoComplete="name" required />
                </label>
              )}
              <label>
                Email
                <input name="email" type="email" placeholder="ban@example.com" maxLength={254} autoComplete="email" required />
              </label>
              <label>
                Mật khẩu
                <span className="password-field">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isLogin ? "Mật khẩu" : "Từ 8 đến 128 ký tự"}
                    minLength={isLogin ? 1 : 8}
                    maxLength={128}
                    autoComplete={isLogin ? "current-password" : "new-password"}
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
              <button className="button button-primary auth-submit" type="submit" disabled={pending || submitted}>
                {pending ? "Đang xử lý…" : isLogin ? "Đăng nhập" : "Tạo tài khoản"}
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

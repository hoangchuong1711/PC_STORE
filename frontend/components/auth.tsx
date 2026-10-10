"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Header, Footer } from "./storefront";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import { authDestination, createAuthApi } from "../lib/auth-api";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "./toast";

type AuthMode = "login" | "register";

export function AuthPage({ mode }: { mode: AuthMode }) {
  const isLogin = mode === "login";
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const { login } = useAuth();
  const { toast } = useToast();
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
        await createAuthApi().register({
          fullName: String(form.get("name") ?? "").trim(),
          email,
          password,
        });
        setSubmitted(true);
      }
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Header />
      <main className="bg-[#f8fafc] min-h-[85vh] py-10 md:py-16 flex items-center justify-center">
        <div className="w-full max-w-[440px] mx-auto px-4">
          <section
            className="bg-white border border-[#e2e8f0] rounded-2xl p-7 sm:p-9 shadow-xs"
            aria-labelledby="auth-title"
          >
            {/* Tiêu đề trang */}
            <h1
              id="auth-title"
              className="text-xl sm:text-2xl font-bold text-ink tracking-tight mb-6"
            >
              {isLogin ? "Đăng nhập Tài khoản" : "Đăng ký Tài khoản"}
            </h1>

            {submitted && (
              <div
                className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs"
                role="status"
              >
                Đã tạo tài khoản thành công!{" "}
                <Link href="/auth/login" className="font-semibold underline">
                  Đăng nhập ngay
                </Link>
              </div>
            )}

            {error && (
              <div
                className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs"
                role="alert"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col">
              {/* Họ và tên (chỉ khi Đăng ký) */}
              {!isLogin && (
                <div className="flex flex-col mb-4">
                  <label htmlFor="authName" className="text-xs font-semibold text-slate-800 mb-1">
                    Họ và tên
                  </label>
                  <input
                    id="authName"
                    name="name"
                    type="text"
                    required
                    maxLength={255}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3.5 py-2.5 border border-[#cbd5e1] rounded-lg text-xs outline-none focus:border-[#006ce1] focus:ring-1 focus:ring-[#006ce1] bg-white text-ink transition-colors"
                  />
                  <span className="text-[11px] text-slate-500 mt-1">
                    Vui lòng nhập họ và tên của bạn
                  </span>
                </div>
              )}

              {/* Tài khoản (Email) */}
              <div className="flex flex-col mb-4">
                <label htmlFor="authEmail" className="text-xs font-semibold text-slate-800 mb-1">
                  Tài khoản
                </label>
                <input
                  id="authEmail"
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  className="w-full px-3.5 py-2.5 border border-[#cbd5e1] rounded-lg text-xs outline-none focus:border-[#006ce1] focus:ring-1 focus:ring-[#006ce1] bg-white text-ink transition-colors"
                />
                <span className="text-[11px] text-slate-500 mt-1">
                  Vui lòng nhập email của bạn
                </span>
              </div>

              {/* Mật khẩu */}
              <div className="flex flex-col mb-4">
                <label htmlFor="authPassword" className="text-xs font-semibold text-slate-800 mb-1">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="authPassword"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={isLogin ? 1 : 8}
                    maxLength={128}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    className="w-full px-3.5 py-2.5 pr-10 border border-[#cbd5e1] rounded-lg text-xs outline-none focus:border-[#006ce1] focus:ring-1 focus:ring-[#006ce1] bg-white text-ink transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Nhớ tôi & Quên mật khẩu (chỉ khi Đăng nhập) */}
              {isLogin && (
                <div className="flex items-center justify-between mb-5">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-[#cbd5e1] text-[#006ce1] focus:ring-[#006ce1] cursor-pointer"
                    />
                    <span>Nhớ tôi</span>
                  </label>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      toast("Vui lòng liên hệ quản trị viên để hỗ trợ cấp lại mật khẩu.", "info");
                    }}
                    className="text-xs text-[#006ce1] hover:underline font-medium"
                  >
                    Quên mật khẩu của bạn?
                  </a>
                </div>
              )}

              {/* Điều khoản sử dụng (chỉ khi Đăng ký) */}
              {!isLogin && (
                <div className="mb-5">
                  <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      required
                      className="w-4 h-4 rounded border-[#cbd5e1] text-[#006ce1] focus:ring-[#006ce1] cursor-pointer mt-0.5"
                    />
                    <span>Tôi đồng ý với Điều khoản dịch vụ và Chính sách quyền riêng tư của PC Store.</span>
                  </label>
                </div>
              )}

              {/* Nút Đăng nhập / Đăng ký */}
              <button
                type="submit"
                disabled={pending || submitted}
                className="w-full py-3 px-4 bg-[#006ce1] hover:bg-[#0051a8] text-white font-semibold rounded-lg text-xs md:text-sm transition-colors cursor-pointer shadow-xs text-center disabled:opacity-60 mb-4"
              >
                {pending ? "Đang xử lý…" : isLogin ? "Đăng nhập" : "Đăng ký"}
              </button>

              {/* Chuyển đổi giữa Đăng ký và Đăng nhập */}
              <div className="text-center text-xs text-slate-700">
                {isLogin ? "Bạn chưa có tài khoản PC Store? " : "Bạn đã có tài khoản PC Store? "}
                <Link
                  href={isLogin ? "/auth/register" : "/auth/login"}
                  className="text-[#006ce1] font-semibold hover:underline"
                >
                  {isLogin ? "Đăng ký ngay" : "Đăng nhập ngay"}
                </Link>
              </div>
            </form>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

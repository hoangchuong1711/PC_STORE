"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Ban, Eye, EyeOff } from "lucide-react";

import { useAuth } from "./auth-provider";
import { authApi, authDestination } from "../lib/auth-api";
import { getSafeRedirectPath, withRedirect } from "../lib/auth-navigation";

// CSS dùng chung cho các ô nhập liệu
const inputClass =
  "w-full px-3.5 py-2.5 border border-[#cbd5e1] rounded-lg text-xs outline-none focus:border-[#006ce1] focus:ring-1 focus:ring-[#006ce1] bg-white text-ink transition-colors";

// Component: Ô nhập mật khẩu
function PasswordInput({ isLogin }: { isLogin: boolean }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex flex-col mb-4">
      <label
        htmlFor="authPassword"
        className="text-xs font-semibold text-slate-800 mb-1"
      >
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
          autoComplete={
            isLogin ? "current-password" : "new-password"
          }
          className={`${inputClass} pr-10`}
        />

        <button
          type="button"
          onClick={() => setShowPassword((visible) => !visible)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
          aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {showPassword ? (
            <EyeOff size={16} />
          ) : (
            <Eye size={16} />
          )}
        </button>
      </div>
    </div>
  );
}

// Component: Ô nhập email
function EmailInput() {
  return (
    <div className="flex flex-col mb-4">
      <label
        htmlFor="authEmail"
        className="text-xs font-semibold text-slate-800 mb-1"
      >
        Tài khoản
      </label>

      <input
        id="authEmail"
        name="email"
        type="email"
        required
        maxLength={254}
        autoComplete="email"
        className={inputClass}
      />

      <span className="text-[11px] text-slate-500 mt-1">
        Vui lòng nhập email của bạn
      </span>
    </div>
  );
}

// Component: Hiển thị lỗi
function AuthError({ error }: { error: string }) {
  if (!error) return null;

  const isDisabledAccount = error.toLowerCase().includes("khóa");

  return (
    <div
      className={`mb-5 p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
        isDisabledAccount
          ? "bg-rose-50 border border-rose-300 text-rose-900 shadow-xs"
          : "bg-rose-50 border border-rose-200 text-rose-700"
      }`}
      role="alert"
    >
      {isDisabledAccount ? (
        <Ban
          size={18}
          className="shrink-0 text-rose-600 mt-0.5"
        />
      ) : (
        <AlertCircle
          size={16}
          className="shrink-0 text-rose-500 mt-0.5"
        />
      )}

      <div className="flex-1">
        <div className="font-semibold leading-snug">
          {error}
        </div>

        {isDisabledAccount && (
          <div className="text-[11px] text-rose-700 mt-1 leading-relaxed">
            Tài khoản của bạn đã bị vô hiệu hóa bởi Ban Quản Trị
            hệ thống. Mọi giao dịch và quyền truy cập tạm thời bị
            ngưng. Vui lòng liên hệ hotline hỗ trợ hoặc quản trị
            viên để biết thêm chi tiết.
          </div>
        )}
      </div>
    </div>
  );
}

// Component: Nút gửi biểu mẫu
function SubmitButton({
  pending,
  disabled = false,
  children,
}: {
  pending: boolean;
  disabled?: boolean;
  children: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full py-3 px-4 bg-[#006ce1] hover:bg-[#0051a8] text-white font-semibold rounded-lg text-xs md:text-sm transition-colors cursor-pointer shadow-xs text-center disabled:opacity-60 mb-4"
    >
      {pending ? "Đang xử lý…" : children}
    </button>
  );
}

// Form: Đăng nhập
export function LoginForm({
  redirectPath,
}: {
  redirectPath: string | null;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const { setUser } = useAuth();
  const router = useRouter();

  // Xử lý khi người dùng gửi form đăng nhập
  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) return;

    setError("");

    // Lấy dữ liệu từ các ô nhập liệu
    const form = new FormData(event.currentTarget);

    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setPending(true);

    try {
      // Gọi API đăng nhập và nhận thông tin người dùng
      const user = await authApi.login(email, password);

      // Cập nhật người dùng vào Auth Context
      setUser(user);

      // Chuyển hướng sau khi đăng nhập thành công
      const redirect = new URLSearchParams(
        window.location.search
      ).get("redirect");

      router.replace(
        getSafeRedirectPath(redirect) ?? authDestination(user)
      );
    } catch (cause) {
      // Hiển thị lỗi trả về từ API
      setError((cause as Error).message);
    } finally {
      // Kết thúc trạng thái xử lý
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleLogin} className="flex flex-col">
      <AuthError error={error} />

      <EmailInput />

      <PasswordInput isLogin />

      <div className="flex justify-end mb-5">
        <Link
          href="/auth/forgot-password"
          className="text-xs text-[#006ce1] hover:underline font-medium"
        >
          Quên mật khẩu của bạn?
        </Link>
      </div>

      <SubmitButton pending={pending}>
        Đăng nhập
      </SubmitButton>

      <div className="text-center text-xs text-slate-700">
        Bạn chưa có tài khoản PC Store?{" "}
        <Link
          href={withRedirect("/auth/register", redirectPath)}
          className="text-[#006ce1] font-semibold hover:underline"
        >
          Đăng ký ngay
        </Link>
      </div>
    </form>
  );
}

// Form: Đăng ký

export function RegisterForm({
  redirectPath,
}: {
  redirectPath: string | null;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Xử lý khi người dùng gửi form đăng ký
  async function handleRegistration(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (pending) return;

    setError("");
    setSubmitted(false);

    // Lấy dữ liệu từ các ô nhập liệu
    const form = new FormData(event.currentTarget);

    const password = String(form.get("password") ?? "");

    // Kiểm tra độ dài mật khẩu trước khi gọi API
    if (password.length < 8 || password.length > 128) {
      setError("Mật khẩu phải dài từ 8 đến 128 ký tự.");
      return;
    }

    setPending(true);

    try {
      // Thu thập dữ liệu và gọi API đăng ký
      await authApi.register({
        fullName: String(form.get("name") ?? "").trim(),
        email: String(form.get("email") ?? "").trim(),
        password,
      });

      // Đánh dấu đăng ký thành công
      setSubmitted(true);
    } catch (cause) {
      // Hiển thị lỗi trả về từ API
      setError((cause as Error).message);
    } finally {
      // Kết thúc trạng thái xử lý
      setPending(false);
    }
  }

  return (
    <>
      {/* Thông báo khi đăng ký thành công */}
      {submitted && (
        <div
          className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs"
          role="status"
        >
          Đã tạo tài khoản thành công!{" "}
          <Link
            href={withRedirect("/auth/login", redirectPath)}
            className="font-semibold underline"
          >
            Đăng nhập ngay
          </Link>
        </div>
      )}

      <form
        onSubmit={handleRegistration}
        className="flex flex-col"
      >
        <AuthError error={error} />

        {/* Ô nhập họ và tên */}
        <div className="flex flex-col mb-4">
          <label
            htmlFor="authName"
            className="text-xs font-semibold text-slate-800 mb-1"
          >
            Họ và tên
          </label>

          <input
            id="authName"
            name="name"
            type="text"
            required
            maxLength={255}
            placeholder="Nguyễn Văn A"
            className={inputClass}
          />

          <span className="text-[11px] text-slate-500 mt-1">
            Vui lòng nhập họ và tên của bạn
          </span>
        </div>

        <EmailInput />

        <PasswordInput isLogin={false} />

        {/* Xác nhận điều khoản dịch vụ */}
        <div className="mb-5">
          <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              name="terms"
              type="checkbox"
              required
              className="w-4 h-4 rounded border-[#cbd5e1] text-[#006ce1] focus:ring-[#006ce1] cursor-pointer mt-0.5"
            />

            <span>
              Tôi đồng ý với Điều khoản dịch vụ và Chính sách
              quyền riêng tư của PC Store.
            </span>
          </label>
        </div>

        <SubmitButton pending={pending} disabled={submitted}>
          Đăng ký
        </SubmitButton>

        <div className="text-center text-xs text-slate-700">
          Bạn đã có tài khoản PC Store?{" "}
          <Link
            href={withRedirect("/auth/login", redirectPath)}
            className="text-[#006ce1] font-semibold hover:underline"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </form>
    </>
  );
}
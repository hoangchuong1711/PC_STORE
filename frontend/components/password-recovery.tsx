"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthApiError, createAuthApi } from "../lib/auth-api";

const inputClass = "w-full px-3.5 py-2.5 border border-[#cbd5e1] rounded-lg text-xs outline-none focus:border-[#006ce1] focus:ring-1 focus:ring-[#006ce1] bg-white text-ink transition-colors";
const buttonClass = "w-full py-3 px-4 bg-[#006ce1] hover:bg-[#0051a8] text-white font-semibold rounded-lg text-xs md:text-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";
type Step = "email" | "otp" | "password" | "done";

export function PasswordRecoveryForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function sendCode() {
    const result = await createAuthApi().forgotPassword(email.trim());
    setEmail(email.trim()); setToken(""); setStep("otp"); setCooldown(60); setMessage(result.message);
  }

  function report(cause: unknown) {
    setError(cause instanceof Error ? cause.message : "Không thể xử lý yêu cầu. Vui lòng thử lại.");
    if (cause instanceof AuthApiError && cause.code === "INVALID_RESET_TOKEN") {
      setToken(""); setStep("otp"); setMessage("Hãy yêu cầu mã OTP mới để tiếp tục.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setError(""); setPending(true);
    try {
      if (step === "email") await sendCode();
      else if (step === "otp") {
        const result = await createAuthApi().verifyResetOtp(email, String(form.get("otp") ?? ""));
        setToken(result.resetToken); setStep("password"); setMessage("Mã OTP hợp lệ. Vui lòng đặt mật khẩu mới trong 5 phút.");
      } else if (step === "password") {
        const password = String(form.get("password") ?? "");
        if (password.length < 8 || password.length > 128) throw new Error("Mật khẩu phải dài từ 8 đến 128 ký tự.");
        if (password !== String(form.get("confirmPassword") ?? "")) throw new Error("Mật khẩu xác nhận không khớp.");
        const result = await createAuthApi().resetPassword(email, token, password);
        setToken(""); setStep("done"); setMessage(result.message);
      }
    } catch (cause) { report(cause); }
    finally { setPending(false); }
  }

  async function resend() {
    if (pending || cooldown > 0) return;
    setError(""); setPending(true);
    try { await sendCode(); }
    catch (cause) { report(cause); }
    finally { setPending(false); }
  }

  return (
    <>
      <p className="text-xs text-slate-500 mb-5">
        {step === "email" ? "Nhập email tài khoản để nhận mã đặt lại mật khẩu."
          : step === "otp" ? `Nhập mã gồm 6 chữ số được gửi đến ${email}. Mã có hiệu lực trong 5 phút.`
          : step === "password" ? "Chọn mật khẩu mới cho tài khoản của bạn." : "Bạn có thể đăng nhập lại ngay."}
      </p>
      {message && <div role="status" className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs">{message}</div>}
      {error && <div role="alert" className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{error}</div>}
      {step !== "done" && (
        <form key={step} onSubmit={submit} className="flex flex-col" aria-busy={pending}>
          <fieldset disabled={pending} className="contents">
            {step === "email" && <div className="flex flex-col mb-4">
              <label htmlFor="recoveryEmail" className="text-xs font-semibold text-slate-800 mb-1">Email tài khoản</label>
              <input id="recoveryEmail" name="email" type="email" autoComplete="email" required maxLength={254}
                value={email} onChange={event => setEmail(event.target.value)} className={inputClass} />
            </div>}
            {step === "otp" && <div className="flex flex-col mb-4">
              <label htmlFor="recoveryOtp" className="text-xs font-semibold text-slate-800 mb-1">Mã OTP</label>
              <input id="recoveryOtp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code"
                pattern="[0-9]{6}" minLength={6} maxLength={6} required placeholder="000000" autoFocus
                className={`${inputClass} tracking-[0.4em] text-center`} />
            </div>}
            {step === "password" && <>
              <div className="flex flex-col mb-4">
                <label htmlFor="recoveryPassword" className="text-xs font-semibold text-slate-800 mb-1">Mật khẩu mới</label>
                <div className="relative">
                  <input id="recoveryPassword" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password"
                    required minLength={8} maxLength={128} autoFocus className={`${inputClass} pr-10`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 p-1 cursor-pointer">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 mt-1">Từ 8 đến 128 ký tự</span>
              </div>
              <div className="flex flex-col mb-4">
                <label htmlFor="recoveryConfirm" className="text-xs font-semibold text-slate-800 mb-1">Xác nhận mật khẩu mới</label>
                <input id="recoveryConfirm" name="confirmPassword" type={showPassword ? "text" : "password"}
                  autoComplete="new-password" required minLength={8} maxLength={128} className={inputClass} />
              </div>
            </>}
            <button type="submit" disabled={pending} className={buttonClass}>
              {pending ? "Đang xử lý…" : step === "email" ? "Gửi mã OTP" : step === "otp" ? "Xác nhận OTP" : "Đặt mật khẩu mới"}
            </button>
          </fieldset>
          {step === "otp" && <button type="button" onClick={resend} disabled={pending || cooldown > 0}
            className="mt-4 text-xs text-[#006ce1] hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer">
            {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : "Gửi lại mã OTP"}
          </button>}
          {(step === "otp" || step === "password") && <button type="button" disabled={pending}
            onClick={() => { setToken(""); setStep("email"); setError(""); setMessage(""); }}
            className="mt-3 text-xs text-slate-500 hover:underline cursor-pointer">Nhập lại email</button>}
        </form>
      )}
      <div className="mt-5 text-center text-xs">
        <Link href="/auth/login" className="text-[#006ce1] font-semibold hover:underline">Quay lại đăng nhập</Link>
      </div>
    </>
  );
}

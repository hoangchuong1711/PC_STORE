"use client";

import { useEffect, useState } from "react";
import { Header, Footer } from "./storefront";
import { PasswordRecoveryForm } from "./password-recovery";
import { LoginForm, RegisterForm } from "./auth-forms";
import { getSafeRedirectPath } from "../lib/auth-navigation";

type AuthMode = "login" | "register" | "forgot";

const titles: Record<AuthMode, string> = {
  login: "Đăng nhập Tài khoản",
  register: "Đăng ký Tài khoản",
  forgot: "Quên mật khẩu",
};

export function AuthPage({ mode }: { mode: AuthMode }) {
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  useEffect(() => {
    setRedirectPath(
      getSafeRedirectPath(new URLSearchParams(window.location.search).get("redirect")),
    );
  }, []);

  return (
    <>
      <Header />
      <main className="bg-[#f8fafc] min-h-[85vh] py-10 md:py-16 flex items-center justify-center">
        <div className="w-full max-w-[440px] mx-auto px-4">
          <section
            className="bg-white border border-[#e2e8f0] rounded-2xl p-7 sm:p-9 shadow-xs"
            aria-labelledby="auth-title"
          >
            <h1
              id="auth-title"
              className="text-xl! sm:text-2xl! font-bold text-ink tracking-tight mb-6"
            >
              {titles[mode]}
            </h1>
            {mode === "login" && <LoginForm redirectPath={redirectPath} />}
            {mode === "register" && <RegisterForm redirectPath={redirectPath} />}
            {mode === "forgot" && <PasswordRecoveryForm />}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

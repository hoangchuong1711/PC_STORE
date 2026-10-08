import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "../components/cart-provider";
import { CartDrawer } from "../components/cart-drawer";
import { ToastProvider } from "../components/toast";
import { AuthProvider } from "../components/auth-provider";

export const metadata: Metadata = {
  title: "PC Store · Build your next level",
  description: "Thiết bị và linh kiện cho góc máy của riêng bạn.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider><ToastProvider>
          <CartProvider>
            {children}
            <CartDrawer />
          </CartProvider>
        </ToastProvider></AuthProvider>
      </body>
    </html>
  );
}

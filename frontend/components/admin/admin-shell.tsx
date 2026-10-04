"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Bell,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  MessageCircle,
  Menu,
  Package,
  X,
} from "lucide-react";

const navigation = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/products", label: "Sản phẩm", icon: Package },
  { href: "/admin/orders", label: "Đơn hàng", icon: ClipboardList },
  { href: "/admin/community", label: "Setup Community", icon: MessageCircle },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-app">
      <aside className={`admin-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="admin-brand-row">
          <Link href="/admin" className="admin-brand" onClick={() => setMobileOpen(false)}>
            <span className="admin-brand-mark">P</span>
            <span>
              PC <strong>STORE</strong>
            </span>
          </Link>
          <button
            type="button"
            className="admin-icon-button admin-sidebar-close"
            aria-label="Đóng menu Admin"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="admin-workspace-label">Khu vực vận hành</div>
        <nav className="admin-nav" aria-label="Điều hướng Admin">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/admin"
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-link ${active ? "is-active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-demo-note">
            <span className="admin-status-dot" />
            <div>
              <strong>Chế độ xem mẫu</strong>
              <span>Dữ liệu chưa kết nối API</span>
            </div>
          </div>
          <div className="admin-sidebar-version">PC Store admin · 0.1</div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="admin-sidebar-overlay"
          aria-label="Đóng menu Admin"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="admin-main-wrap">
        <header className="admin-topbar">
          <div className="admin-topbar-leading">
            <button
              type="button"
              className="admin-icon-button admin-menu-toggle"
              aria-label="Mở menu Admin"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div>
              <span className="admin-topbar-kicker">PC Store / Admin</span>
              <strong>Không gian vận hành</strong>
            </div>
          </div>

          <div className="admin-topbar-actions">
            <button type="button" className="admin-icon-button admin-notification-button" aria-label="Thông báo">
              <Bell size={18} />
              <span className="admin-notification-dot" />
            </button>
            <div className="admin-profile-chip">
              <span className="admin-avatar">MA</span>
              <span className="admin-profile-copy">
                <strong>Minh Anh</strong>
                <small>Quản trị viên</small>
              </span>
              <ChevronDown size={15} />
            </div>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}

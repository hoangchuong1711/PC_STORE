"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  CheckCheck,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  Settings,
  ShoppingBag,
  Star,
  Store,
  User,
  Users,
  X,
} from "lucide-react";
import { initialAdminNotifications, type AdminNotification } from "../../lib/admin";

const navigation = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/products", label: "Sản phẩm", icon: Package },
  { href: "/admin/categories", label: "Danh mục & Hãng", icon: FolderTree },
  { href: "/admin/orders", label: "Đơn hàng", icon: ClipboardList },
  { href: "/admin/reviews", label: "Đánh giá", icon: Star },
  { href: "/admin/community", label: "Setup Community", icon: MessageCircle },
  { href: "/admin/users", label: "Khách hàng", icon: Users },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>(initialAdminNotifications);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function markAllNotificationsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }

  function handleLogout() {
    setProfileOpen(false);
    router.push("/auth?mode=login");
  }

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

        <div className="admin-sidebar-secondary-links">
          <Link href="/" target="_blank" className="admin-nav-link admin-nav-external" title="Mở trang bán hàng trong tab mới">
            <Store size={17} />
            <span>Xem Cửa Hàng</span>
            <ExternalLink size={13} className="admin-link-ext-icon" />
          </Link>
        </div>

        <div className="admin-sidebar-bottom">
          <div className="admin-demo-note">
            <span className="admin-status-dot" />
            <div>
              <strong>Chế độ xem mẫu</strong>
              <span>Dữ liệu lưu tạm phiên làm việc</span>
            </div>
          </div>
          <div className="admin-sidebar-version">PC Store admin · 0.2</div>
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
            <Link href="/" target="_blank" className="admin-storefront-button" title="Mở trang chủ bán hàng">
              <ShoppingBag size={15} />
              <span>Cửa hàng</span>
              <ExternalLink size={12} />
            </Link>

            <div className="admin-popover-container" ref={notifRef}>
              <button
                type="button"
                className={`admin-icon-button admin-notification-button ${notificationsOpen ? "is-active" : ""}`}
                aria-label="Xem thông báo"
                onClick={() => setNotificationsOpen((prev) => !prev)}
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="admin-notification-badge">{unreadCount}</span>}
              </button>

              {notificationsOpen && (
                <div className="admin-dropdown admin-notifications-dropdown" role="menu">
                  <div className="admin-dropdown-header">
                    <div>
                      <strong>Thông báo vận hành</strong>
                      <small>{unreadCount} thông báo mới</small>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="admin-text-action"
                        onClick={markAllNotificationsRead}
                      >
                        <CheckCheck size={14} />
                        Đã đọc
                      </button>
                    )}
                  </div>
                  <div className="admin-notifications-list">
                    {notifications.map((notif) => (
                      <Link
                        key={notif.id}
                        href={notif.href}
                        className={`admin-notification-item ${notif.unread ? "is-unread" : ""}`}
                        onClick={() => setNotificationsOpen(false)}
                      >
                        <span className={`admin-notification-icon is-${notif.type}`} />
                        <div className="admin-notification-copy">
                          <strong>{notif.title}</strong>
                          <p>{notif.message}</p>
                          <small>{notif.time}</small>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="admin-popover-container" ref={profileRef}>
              <button
                type="button"
                className="admin-profile-chip-button"
                onClick={() => setProfileOpen((prev) => !prev)}
                aria-expanded={profileOpen}
                aria-haspopup="true"
              >
                <span className="admin-avatar">MA</span>
                <span className="admin-profile-copy">
                  <strong>Minh Anh</strong>
                  <small>Quản trị viên</small>
                </span>
                <ChevronDown size={15} className={profileOpen ? "rotate-180" : ""} />
              </button>

              {profileOpen && (
                <div className="admin-dropdown admin-profile-dropdown" role="menu">
                  <div className="admin-profile-dropdown-user">
                    <span className="admin-avatar is-large">MA</span>
                    <div>
                      <strong>Nguyễn Minh Anh</strong>
                      <small>minhanh@pcstore.vn</small>
                      <span className="admin-role-badge">Quản trị hệ thống</span>
                    </div>
                  </div>
                  <div className="admin-dropdown-divider" />
                  <Link
                    href="/account"
                    className="admin-dropdown-item"
                    onClick={() => setProfileOpen(false)}
                  >
                    <User size={15} />
                    <span>Hồ sơ tài khoản</span>
                  </Link>
                  <Link
                    href="/"
                    className="admin-dropdown-item"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Store size={15} />
                    <span>Xem giao diện khách hàng</span>
                  </Link>
                  <div className="admin-dropdown-divider" />
                  <button
                    type="button"
                    className="admin-dropdown-item is-danger"
                    onClick={handleLogout}
                  >
                    <LogOut size={15} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  RotateCcw,
  ShieldAlert,
  ShoppingBag,
  Star,
  Store,
  User,
  Users,
  X,
} from "lucide-react";
import { initialAdminNotifications, type AdminNotification } from "../../lib/admin";
import { useAuth } from "../auth-provider";
import "./admin.css";

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
  const { user, loading, error, refresh, logout } = useAuth();
  const [logoutError, setLogoutError] = useState("");
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

  async function handleLogout() {
    setProfileOpen(false);
    try { await logout(); router.replace("/auth/login"); }
    catch (cause) { setLogoutError((cause as Error).message); }
  }

  if (loading) {
    return (
      <main className="admin-guard-page">
        <div className="admin-guard-card">
          <div className="admin-guard-brand">
            <span className="admin-guard-brand-mark">P</span>
            <span>
              PC <strong>STORE</strong> ADMIN
            </span>
          </div>
          <div className="admin-guard-spinner" />
          <p role="status" className="admin-guard-text">
            Đang kiểm tra phiên đăng nhập…
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="admin-guard-page">
        <div className="admin-guard-card">
          <div className="admin-guard-brand">
            <span className="admin-guard-brand-mark">P</span>
            <span>
              PC <strong>STORE</strong> ADMIN
            </span>
          </div>
          <div className="admin-guard-icon-wrap admin-guard-icon-warning">
            <AlertTriangle size={32} />
          </div>
          <span className="admin-guard-badge admin-guard-badge-warning">LỖI XÁC THỰC</span>
          <p role="alert" className="admin-guard-error-msg">
            {error}
          </p>
          <div className="admin-guard-actions">
            <button
              type="button"
              onClick={() => void refresh()}
              className="admin-guard-btn admin-guard-btn-primary"
            >
              <RotateCcw size={15} /> Thử lại
            </button>
            <Link href="/" className="admin-guard-btn admin-guard-btn-secondary">
              <Store size={15} /> Về trang chủ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="admin-guard-page">
        <div className="admin-guard-card">
          <div className="admin-guard-brand">
            <span className="admin-guard-brand-mark">P</span>
            <span>
              PC <strong>STORE</strong> ADMIN
            </span>
          </div>
          <div className="admin-guard-icon-wrap admin-guard-icon-info">
            <Lock size={32} />
          </div>
          <span className="admin-guard-badge admin-guard-badge-info">XÁC THỰC BẮT BUỘC · 401</span>
          <h2 className="admin-guard-heading">Yêu cầu quyền quản trị</h2>
          <p className="admin-guard-desc">
            Bạn cần đăng nhập để vào Admin. Khu vực này chỉ dành cho ban quản trị và nhân viên điều hành hệ thống.
          </p>
          <div className="admin-guard-actions">
            <Link href="/auth/login" className="admin-guard-btn admin-guard-btn-primary">
              Đăng nhập
            </Link>
            <Link href="/" className="admin-guard-btn admin-guard-btn-secondary">
              <Store size={15} /> Về cửa hàng
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <main className="admin-guard-page">
        <div className="admin-guard-card">
          <div className="admin-guard-brand">
            <span className="admin-guard-brand-mark">P</span>
            <span>
              PC <strong>STORE</strong> ADMIN
            </span>
          </div>
          <div className="admin-guard-icon-wrap admin-guard-icon-danger">
            <ShieldAlert size={34} />
          </div>
          <span className="admin-guard-badge admin-guard-badge-danger">
            TRUY CẬP BỊ TỪ CHỐI · 403 FORBIDDEN
          </span>
          <h1>Không có quyền truy cập Admin</h1>
          <p className="admin-guard-desc">
            Tài khoản <strong>{user.email}</strong> không có đặc quyền quản trị viên. Trang quản trị chỉ dành cho tài khoản có vai trò ADMIN.
          </p>
          <div className="admin-guard-actions">
            <Link href="/" className="admin-guard-btn admin-guard-btn-primary">
              <Store size={15} /> Về cửa hàng
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="admin-guard-btn admin-guard-btn-secondary"
            >
              <LogOut size={15} /> Đổi tài khoản khác
            </button>
          </div>
        </div>
      </main>
    );
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
              <strong>{pathname === "/admin/categories" ? "Dữ liệu từ máy chủ" : "Chế độ xem mẫu"}</strong>
              <span>{pathname === "/admin/categories" ? "Danh mục/hãng được lưu vào database" : "Dữ liệu lưu tạm phiên làm việc"}</span>
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
                  <strong>{user.fullName}</strong>
                  <small>Quản trị viên</small>
                </span>
                <ChevronDown size={15} className={profileOpen ? "rotate-180" : ""} />
              </button>

              {profileOpen && (
                <div className="admin-dropdown admin-profile-dropdown" role="menu">
                  <div className="admin-profile-dropdown-user">
                    <span className="admin-avatar is-large">MA</span>
                    <div>
                      <strong>{user.fullName}</strong>
                      <small>{user.email}</small>
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

        <main className="admin-content">{logoutError && <p role="alert">{logoutError}</p>}{children}</main>
      </div>
    </div>
  );
}

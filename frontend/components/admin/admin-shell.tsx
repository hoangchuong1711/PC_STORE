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
      <main className="min-h-screen flex items-center justify-center p-4 bg-admin-bg font-sans">
        <div className="w-full max-w-[440px] bg-white border border-admin-line rounded-2xl p-8 sm:p-9 text-center shadow-sm">
          <div className="inline-flex items-center gap-2.5 mb-6 text-[15px] font-bold text-admin-ink tracking-tight">
            <span className="grid w-7 h-7 place-items-center rounded-md bg-[#20252b] text-white text-xs font-extrabold">P</span>
            <span>
              PC <strong>STORE</strong> ADMIN
            </span>
          </div>
          <div className="w-9 h-9 border-[3px] border-admin-line border-t-admin-blue rounded-full animate-spin my-4 mx-auto" />
          <p role="status" className="text-[13px] text-admin-muted m-0">
            Đang kiểm tra phiên đăng nhập…
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-admin-bg font-sans">
        <div className="w-full max-w-[440px] bg-white border border-admin-line rounded-2xl p-8 sm:p-9 text-center shadow-sm">
          <div className="inline-flex items-center gap-2.5 mb-6 text-[15px] font-bold text-admin-ink tracking-tight">
            <span className="grid w-7 h-7 place-items-center rounded-md bg-[#20252b] text-white text-xs font-extrabold">P</span>
            <span>
              PC <strong>STORE</strong> ADMIN
            </span>
          </div>
          <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center mx-auto mb-4 bg-admin-amber-soft text-admin-amber">
            <AlertTriangle size={32} />
          </div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider mb-3 bg-admin-amber-soft text-admin-amber">LỖI XÁC THỰC</span>
          <p role="alert" className="text-[13px] text-admin-red bg-admin-red-soft border border-admin-red/20 rounded-lg p-3 text-left mb-5 leading-snug">
            {error}
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-lg text-[13px] font-semibold bg-[#20252b] hover:bg-[#2c343d] text-white transition-colors cursor-pointer"
            >
              <RotateCcw size={15} /> Thử lại
            </button>
            <Link href="/" className="inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-lg text-[13px] font-semibold bg-admin-bg hover:bg-admin-accent-soft text-admin-ink border border-admin-line transition-colors">
              <Store size={15} /> Về trang chủ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-admin-bg font-sans">
        <div className="w-full max-w-[440px] bg-white border border-admin-line rounded-2xl p-8 sm:p-9 text-center shadow-sm">
          <div className="inline-flex items-center gap-2.5 mb-6 text-[15px] font-bold text-admin-ink tracking-tight">
            <span className="grid w-7 h-7 place-items-center rounded-md bg-[#20252b] text-white text-xs font-extrabold">P</span>
            <span>
              PC <strong>STORE</strong> ADMIN
            </span>
          </div>
          <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center mx-auto mb-4 bg-admin-blue-soft text-admin-blue">
            <Lock size={32} />
          </div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider mb-3 bg-admin-blue-soft text-admin-blue">XÁC THỰC BẮT BUỘC · 401</span>
          <h2 className="text-xl font-bold text-admin-ink tracking-tight mb-2.5">Yêu cầu quyền quản trị</h2>
          <p className="text-[13px] leading-relaxed text-admin-muted mb-6">
            Bạn cần đăng nhập để vào Admin. Khu vực này chỉ dành cho ban quản trị và nhân viên điều hành hệ thống.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link href="/auth/login" className="inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-lg text-[13px] font-semibold bg-[#20252b] hover:bg-[#2c343d] text-white transition-colors">
              Đăng nhập
            </Link>
            <Link href="/" className="inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-lg text-[13px] font-semibold bg-admin-bg hover:bg-admin-accent-soft text-admin-ink border border-admin-line transition-colors">
              <Store size={15} /> Về cửa hàng
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-admin-bg font-sans">
        <div className="w-full max-w-[440px] bg-white border border-admin-line rounded-2xl p-8 sm:p-9 text-center shadow-sm">
          <div className="inline-flex items-center gap-2.5 mb-6 text-[15px] font-bold text-admin-ink tracking-tight">
            <span className="grid w-7 h-7 place-items-center rounded-md bg-[#20252b] text-white text-xs font-extrabold">P</span>
            <span>
              PC <strong>STORE</strong> ADMIN
            </span>
          </div>
          <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center mx-auto mb-4 bg-admin-red-soft text-admin-red">
            <ShieldAlert size={34} />
          </div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider mb-3 bg-admin-red-soft text-admin-red">
            TRUY CẬP BỊ TỪ CHỐI · 403 FORBIDDEN
          </span>
          <h1 className="text-xl font-bold text-admin-ink tracking-tight mb-2.5">Không có quyền truy cập Admin</h1>
          <p className="text-[13px] leading-relaxed text-admin-muted mb-6">
            Tài khoản <strong>{user.email}</strong> không có đặc quyền quản trị viên. Trang quản trị chỉ dành cho tài khoản có vai trò ADMIN.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link href="/" className="inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-lg text-[13px] font-semibold bg-[#20252b] hover:bg-[#2c343d] text-white transition-colors">
              <Store size={15} /> Về cửa hàng
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-lg text-[13px] font-semibold bg-admin-bg hover:bg-admin-accent-soft text-admin-ink border border-admin-line transition-colors cursor-pointer"
            >
              <LogOut size={15} /> Đổi tài khoản khác
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-admin-bg text-admin-ink font-sans text-sm leading-normal">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col bg-[#20252b] text-[#f5f6f8] px-4 py-7 transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between px-2.5 mb-7">
          <Link href="/admin" className="inline-flex items-center gap-2.5 text-[17px] font-extrabold text-white tracking-tight" onClick={() => setMobileOpen(false)}>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e8edf1] text-[#20252b] text-sm font-black">P</span>
            <span>
              PC <strong className="font-semibold text-[#c7d0d9]">STORE</strong>
            </span>
          </Link>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 lg:hidden cursor-pointer"
            aria-label="Đóng menu Admin"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-2.5 mb-3 text-[10px] font-bold tracking-[0.13em] text-[#8f9aa6] uppercase">Khu vực vận hành</div>
        <nav className="flex flex-col gap-1.5" aria-label="Điều hướng Admin">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/admin"
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 min-h-[46px] px-3.5 rounded-lg text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[#343c45] text-white border-l-4 border-slate-200 pl-2.5"
                    : "text-[#aeb7c0] hover:bg-[#2b3239] hover:text-white border-l-4 border-transparent"
                }`}
                aria-current={active ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 border-t border-white/10 pt-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 min-h-[42px] px-3.5 rounded-lg text-sm font-semibold text-[#aeb7c0] hover:bg-[#2b3239] hover:text-white transition-colors"
            title="Mở trang bán hàng trong tab mới"
          >
            <Store size={17} />
            <span className="flex-1">Xem Cửa Hàng</span>
            <ExternalLink size={13} className="text-[#727e8a]" />
          </Link>
        </div>

        <div className="mt-auto px-2">
          <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[#3a444e] bg-[#292f36]">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#80c59c] ring-4 ring-[#80c59c]/20" />
            <div>
              <strong className="block text-xs font-semibold text-[#edf2f6]">
                {pathname === "/admin/categories" ? "Dữ liệu từ máy chủ" : "Chế độ xem mẫu"}
              </strong>
              <span className="mt-0.5 block text-[11px] text-[#98a3ae]">
                {pathname === "/admin/categories" ? "Danh mục/hãng được lưu vào database" : "Dữ liệu lưu tạm phiên làm việc"}
              </span>
            </div>
          </div>
          <div className="mt-3.5 text-center text-[10px] text-[#727e8a]">PC Store admin · 0.2</div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden border-0 cursor-pointer"
          aria-label="Đóng menu Admin"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="min-h-screen lg:ml-[248px]">
        <header className="sticky top-0 z-30 flex min-h-[76px] items-center justify-between border-b border-admin-line bg-white/92 px-6 lg:px-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-lg border border-transparent text-admin-muted hover:border-admin-line hover:bg-admin-bg hover:text-admin-ink lg:hidden cursor-pointer"
              aria-label="Mở menu Admin"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-admin-soft">PC Store / Admin</span>
              <strong className="block text-[13px] font-bold text-admin-ink">Không gian vận hành</strong>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-5">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-admin-line bg-white text-xs font-semibold text-admin-ink hover:bg-admin-bg transition-colors"
              title="Mở trang chủ bán hàng"
            >
              <ShoppingBag size={15} />
              <span>Cửa hàng</span>
              <ExternalLink size={12} className="text-admin-soft" />
            </Link>

            <div className="relative" ref={notifRef}>
              <button
                type="button"
                className={`relative grid h-9 w-9 place-items-center rounded-lg border border-admin-line bg-white text-admin-muted hover:bg-admin-bg hover:text-admin-ink transition-colors cursor-pointer ${
                  notificationsOpen ? "bg-admin-bg text-admin-ink" : ""
                }`}
                aria-label="Xem thông báo"
                onClick={() => setNotificationsOpen((prev) => !prev)}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-admin-red px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-admin-line bg-white p-3 shadow-xl z-50" role="menu">
                  <div className="flex items-center justify-between border-b border-admin-line pb-2.5 mb-2 px-1">
                    <div>
                      <strong className="block text-xs font-bold text-admin-ink">Thông báo vận hành</strong>
                      <small className="text-[11px] text-admin-soft">{unreadCount} thông báo mới</small>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-admin-blue hover:text-admin-accent-dark cursor-pointer"
                        onClick={markAllNotificationsRead}
                      >
                        <CheckCheck size={14} />
                        Đã đọc
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto flex flex-col gap-1.5">
                    {notifications.map((notif) => (
                      <Link
                        key={notif.id}
                        href={notif.href}
                        className={`flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors ${
                          notif.unread ? "bg-admin-bg hover:bg-admin-accent-soft" : "hover:bg-admin-bg"
                        }`}
                        onClick={() => setNotificationsOpen(false)}
                      >
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            notif.type === "stock"
                              ? "bg-admin-red"
                              : notif.type === "community"
                              ? "bg-admin-amber"
                              : "bg-admin-blue"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <strong className="block text-xs font-semibold text-admin-ink">{notif.title}</strong>
                          <p className="text-[11px] text-admin-muted line-clamp-2 mt-0.5">{notif.message}</p>
                          <small className="text-[10px] text-admin-soft mt-1 block">{notif.time}</small>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={profileRef}>
              <button
                type="button"
                className="flex items-center gap-2.5 pl-3 sm:pl-4 border-l border-admin-line cursor-pointer text-left"
                onClick={() => setProfileOpen((prev) => !prev)}
                aria-expanded={profileOpen}
                aria-haspopup="true"
              >
                <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-admin-accent-soft text-admin-accent-dark text-[11px] font-extrabold">MA</span>
                <span className="hidden sm:block min-w-[90px]">
                  <strong className="block text-xs font-bold text-admin-ink">{user.fullName}</strong>
                  <small className="block text-[10px] text-admin-soft">Quản trị viên</small>
                </span>
                <ChevronDown size={15} className={`text-admin-soft transition-transform ${profileOpen ? "rotate-180" : ""}`} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-admin-line bg-white p-2 shadow-xl z-50" role="menu">
                  <div className="flex items-center gap-3 p-2.5">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-admin-accent-soft text-admin-accent-dark text-xs font-extrabold">MA</span>
                    <div className="min-w-0 flex-1">
                      <strong className="block text-xs font-bold text-admin-ink truncate">{user.fullName}</strong>
                      <small className="block text-[10px] text-admin-soft truncate">{user.email}</small>
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-admin-accent-soft text-admin-accent-dark">Quản trị hệ thống</span>
                    </div>
                  </div>
                  <div className="my-1.5 h-px bg-admin-line" />
                  <Link
                    href="/account"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-admin-ink hover:bg-admin-bg transition-colors"
                    onClick={() => setProfileOpen(false)}
                  >
                    <User size={15} className="text-admin-muted" />
                    <span>Hồ sơ tài khoản</span>
                  </Link>
                  <Link
                    href="/"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-admin-ink hover:bg-admin-bg transition-colors"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Store size={15} className="text-admin-muted" />
                    <span>Xem giao diện khách hàng</span>
                  </Link>
                  <div className="my-1.5 h-px bg-admin-line" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-admin-red hover:bg-admin-red-soft transition-colors cursor-pointer text-left"
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

        <main className="w-full max-w-[1440px] mx-auto px-4 py-8 sm:px-8 lg:px-10">
          {logoutError && (
            <p role="alert" className="mb-4 rounded-lg bg-admin-red-soft p-3 text-xs font-semibold text-admin-red">
              {logoutError}
            </p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

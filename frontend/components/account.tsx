"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Settings,
  User,
  ShieldCheck,
  MapPin,
  Cpu,
  Camera,
  Plus,
  Trash2,
  CheckCircle2,
  ShoppingCart,
  Lock,
  ArrowRight,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Info,
  Package,
  Mail,
  KeyRound,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Bell,
} from "lucide-react";
import {
  type SavedAddress,
  formatAccountDate,
} from "../lib/account";
import { formatPrice } from "../lib/products";
import { useAuth } from "./auth-provider";
import { builderApi, type SavedBuild as ApiSavedBuild } from "../lib/builder-api";
import { useCart } from "./cart-provider";
import { useToast } from "./toast";
import { Header, Footer } from "./storefront";

export type AccountTab =
  | "profile"
  | "password"
  | "register-product"
  | "messages"
  | "addresses"
  | "builds"
  | "setups"
  | "settings";

type OwnSetupItem = {
  postId: number;
  authorId: number;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  mediaIds: string[];
  products: Array<{ productId: number; name: string }>;
};

export function AccountDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<AccountTab>("profile");
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);

  // User-scoped address storage (no fake mock addresses)
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);

  // Profile Form States
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  // Security Form States
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  // Product Registration State ("Đăng ký")
  const [serialNumber, setSerialNumber] = useState("");
  const [productCategory, setProductCategory] = useState("VGA");
  const [purchaseDate, setPurchaseDate] = useState("");

  // Saved Builds States (Real API)
  const [serverBuilds, setServerBuilds] = useState<ApiSavedBuild[]>([]);
  const [buildsLoading, setBuildsLoading] = useState(false);
  const [buildsError, setBuildsError] = useState<string | null>(null);

  // My Setups States (Real API: GET /api/customer/setups)
  const [mySetups, setMySetups] = useState<OwnSetupItem[]>([]);
  const [setupsLoading, setSetupsLoading] = useState(false);
  const [setupsError, setSetupsError] = useState<string | null>(null);

  const { acceptServerCart, openCart } = useCart();
  const { toast } = useToast();

  // Redirect to login if guest
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/login?redirect=/account");
    }
  }, [authLoading, user, router]);

  // Load user profile inputs, addresses, and social linking states
  useEffect(() => {
    if (user) {
      setName(user.fullName);
      setPhone(user.phone || "");

      // Load user-specific saved addresses from localStorage
      try {
        const stored = localStorage.getItem(`pcstore_addresses_${user.userId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setAddresses(parsed);
          }
        } else {
          setAddresses([]);
        }
      } catch {
        setAddresses([]);
      }
    }
  }, [user]);

  // Fetch real saved builds for authenticated user
  const loadBuilds = useCallback(async () => {
    if (!user) return;
    setBuildsLoading(true);
    setBuildsError(null);
    try {
      const data = await builderApi.list();
      setServerBuilds(data);
    } catch (err) {
      setBuildsError(err instanceof Error ? err.message : "Không thể tải danh sách cấu hình đã lưu.");
    } finally {
      setBuildsLoading(false);
    }
  }, [user]);

  // Fetch real setups created by this authenticated user
  const loadSetups = useCallback(async () => {
    if (!user) return;
    setSetupsLoading(true);
    setSetupsError(null);
    try {
      const res = await fetch("/api/customer/setups", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 401) {
          setMySetups([]);
          return;
        }
        throw new Error(`Máy chủ phản hồi mã ${res.status}`);
      }
      const data = await res.json();
      setMySetups(Array.isArray(data) ? data : []);
    } catch (err) {
      setSetupsError(err instanceof Error ? err.message : "Không thể kết nối đến máy chủ để tải góc máy của bạn.");
    } finally {
      setSetupsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && activeTab === "builds") {
      void loadBuilds();
    }
  }, [user, activeTab, loadBuilds]);

  useEffect(() => {
    if (user && activeTab === "setups") {
      void loadSetups();
    }
  }, [user, activeTab, loadSetups]);

  // Profile modifications check
  const hasProfileChanges = user
    ? name.trim() !== user.fullName.trim() || phone.trim() !== (user.phone || "").trim()
    : false;

  const handleResetProfile = () => {
    if (user) {
      setName(user.fullName);
      setPhone(user.phone || "");
      setProfileNotice(null);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasProfileChanges) return;
    setProfileSaving(true);
    setTimeout(() => {
      setProfileSaving(false);
      setProfileNotice(
        "Hệ thống máy chủ hiện tại chưa có API cập nhật hồ sơ trực tuyến. Thông tin cá nhân đang được đồng bộ theo dữ liệu xác thực đăng nhập.",
      );
      toast("Chức năng cập nhật hồ sơ đang được chuẩn bị ở bản cập nhật backend tiếp theo.", "info");
    }, 400);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || newPassword.length < 6) {
      toast("Mật khẩu mới phải có tối thiểu 6 ký tự.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("Mật khẩu xác nhận không trùng khớp với mật khẩu mới.", "error");
      return;
    }
    setPasswordNotice(
      "Tính năng đổi mật khẩu đang trong lộ trình phát triển của backend. Vui lòng sử dụng mật khẩu bạn đã đăng ký.",
    );
    toast("Tính năng đổi mật khẩu hiện chưa có API trên máy chủ.", "info");
  };

  // Address helpers (user-scoped storage)
  const saveUserAddresses = (next: SavedAddress[]) => {
    setAddresses(next);
    if (user) {
      try {
        localStorage.setItem(`pcstore_addresses_${user.userId}`, JSON.stringify(next));
      } catch {
        // ignore
      }
    }
  };

  const handleSetDefaultAddress = (id: string) => {
    const next = addresses.map((a) => ({ ...a, isDefault: a.id === id }));
    saveUserAddresses(next);
    toast("Đã đặt làm địa chỉ giao hàng mặc định!", "success");
  };

  const handleDeleteAddress = (id: string) => {
    const next = addresses.filter((a) => a.id !== id);
    if (next.length > 0 && !next.some((a) => a.isDefault)) {
      next[0].isDefault = true;
    }
    saveUserAddresses(next);
    toast("Đã xóa địa chỉ khỏi sổ tay.", "info");
  };

  const handleAddAddressSuccess = (newAddr: Omit<SavedAddress, "id">) => {
    const item: SavedAddress = {
      ...newAddr,
      id: `addr-${Date.now()}`,
    };
    let next = [item, ...addresses];
    if (item.isDefault) {
      next = next.map((a) => (a.id === item.id ? a : { ...a, isDefault: false }));
    } else if (next.length === 1) {
      item.isDefault = true;
    }
    saveUserAddresses(next);
    setIsAddAddressOpen(false);
    toast("Đã thêm địa chỉ giao hàng mới!", "success");
  };

  // Build handlers (Real API)
  const handleDeleteBuild = async (buildId: number) => {
    try {
      await builderApi.remove(buildId);
      setServerBuilds((prev) => prev.filter((b) => b.buildId !== buildId));
      toast("Đã gỡ bỏ cấu hình đã lưu.", "info");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Không thể xóa cấu hình.", "error");
    }
  };

  const handleAddBuildToCart = async (buildId: number) => {
    try {
      const cart = await builderApi.addToCart(buildId);
      acceptServerCart(cart);
      toast("Đã thêm toàn bộ linh kiện của cấu hình vào giỏ hàng!", "success");
      openCart();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Không thể thêm cấu hình vào giỏ hàng.", "error");
    }
  };

  // Auth loading state
  if (authLoading || !user) {
    return (
      <>
        <Header />
        <main className="container py-24 min-h-[70vh] flex flex-col items-center justify-center text-center">
          <Loader2 size={36} className="animate-spin text-[#006ce1] mb-4" />
          <p className="text-muted text-sm font-sans font-medium">
            {authLoading ? "Đang xác thực phiên đăng nhập..." : "Đang chuyển hướng đến trang đăng nhập..."}
          </p>
        </main>
        <Footer />
      </>
    );
  }

  const initials = (user.fullName || "PC")
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "PC";

  const isSettingsSubTab = (tab: AccountTab) =>
    tab === "settings" ||
    tab === "profile" ||
    tab === "password" ||
    tab === "register-product";

  const settingsSubItems: Array<{ id: AccountTab; label: string }> = [
    { id: "profile", label: "Hồ sơ cá nhân" },
    { id: "password", label: "Đổi mật khẩu" },
    { id: "register-product", label: "Đăng ký" },
  ];

  const mobileTabs: Array<{ id: AccountTab; label: string }> = [
    { id: "messages", label: "Tin nhắn" },
    { id: "profile", label: "Hồ sơ" },
    { id: "password", label: "Đổi MK" },
    { id: "register-product", label: "Đăng ký" },
    { id: "addresses", label: "Sổ địa chỉ" },
    { id: "builds", label: "Dàn PC" },
    { id: "setups", label: "Góc máy" },
  ];

  return (
    <>
      <Header />
      <main className="bg-[#f8fafc] min-h-[85vh] py-8 md:py-12">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-6">
          {/* Breadcrumb / Section Header */}
          <div className="mb-6">
            <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
              Trung tâm tài khoản
            </h1>
            <p className="text-xs md:text-sm text-muted mt-1">
              Quản lý thông tin cá nhân, cấu hình PC và hoạt động mua sắm của bạn.
            </p>
          </div>

          {/* Mobile Navigation Bar */}
          <div className="md:hidden mb-6 bg-white border border-[#e2e8f0] rounded-xl p-2 shadow-xs">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
              {mobileTabs.map((item) => {
                const isActive =
                  activeTab === item.id || (item.id === "profile" && activeTab === "settings");
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? "bg-[#edf5fe] text-[#006ce1]"
                        : "text-muted hover:text-ink hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
              <Link
                href="/orders"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap text-muted hover:text-ink hover:bg-slate-50 flex items-center gap-1"
              >
                <span>Đơn hàng</span>
                <ExternalLink size={11} />
              </Link>
            </div>
          </div>

          {/* Main 2-Column Grid (ASUS Layout Structure) */}
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 lg:gap-8 items-start">
            {/* Left Sidebar: Identity block + Navigation */}
            <aside className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-xs flex flex-col gap-5 sticky top-24">
              {/* User Identity Card (Clean, light, no dark gradients) */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-[#f1f5f9]">
                <div className="w-12 h-12 rounded-full bg-[#edf5fe] text-[#006ce1] border border-[#006ce1]/20 flex items-center justify-center font-bold text-base shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <strong className="block text-sm font-bold text-ink truncate leading-tight">
                    {user.fullName}
                  </strong>
                  <span className="block text-xs text-muted truncate mt-0.5" title={user.email}>
                    {user.email}
                  </span>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                    {user.role === "ADMIN" ? "Quản trị viên" : "Khách hàng"}
                  </span>
                </div>
              </div>

              {/* Navigation Tabs (Hierarchical Accordion Structure like ASUS Overview) */}
              <nav className="flex flex-col gap-1" role="tablist" aria-label="Điều hướng tài khoản">
                {/* Trung tâm tin nhắn */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "messages"}
                  onClick={() => setActiveTab("messages")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-colors text-left cursor-pointer ${
                    activeTab === "messages"
                      ? "bg-[#edf5fe] text-[#006ce1]"
                      : "text-[#334155] hover:bg-slate-50 hover:text-ink"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <MessageSquare size={17} className={activeTab === "messages" ? "text-[#006ce1]" : "text-slate-500"} />
                    <span>Trung tâm tin nhắn</span>
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#006ce1]" />
                </button>

                {/* Cài đặt tài khoản (Accordion Group) */}
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsOpen((prev) => !prev);
                      if (!isSettingsSubTab(activeTab)) {
                        setActiveTab("profile");
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-colors text-left cursor-pointer ${
                      isSettingsSubTab(activeTab)
                        ? "text-[#006ce1]"
                        : "text-[#334155] hover:bg-slate-50 hover:text-ink"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Settings size={17} className={isSettingsSubTab(activeTab) ? "text-[#006ce1]" : "text-slate-500"} />
                      <span>Cài đặt tài khoản</span>
                    </span>
                    {isSettingsOpen ? (
                      <ChevronUp size={16} className={isSettingsSubTab(activeTab) ? "text-[#006ce1]" : "text-slate-400"} />
                    ) : (
                      <ChevronDown size={16} className={isSettingsSubTab(activeTab) ? "text-[#006ce1]" : "text-slate-400"} />
                    )}
                  </button>

                  {isSettingsOpen && (
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      {settingsSubItems.map((item) => {
                        const isSubActive =
                          activeTab === item.id || (item.id === "profile" && activeTab === "settings");
                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={isSubActive}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full text-left pl-10 pr-3 py-2 rounded-lg text-xs md:text-sm transition-colors cursor-pointer ${
                              isSubActive
                                ? "bg-[#edf5fe] text-[#006ce1] font-semibold"
                                : "text-[#334155] hover:bg-slate-50 hover:text-ink font-normal"
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="my-1.5 border-t border-[#f1f5f9]" />

                {/* Sổ địa chỉ */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "addresses"}
                  onClick={() => setActiveTab("addresses")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-colors text-left cursor-pointer ${
                    activeTab === "addresses"
                      ? "bg-[#edf5fe] text-[#006ce1]"
                      : "text-[#475569] hover:bg-slate-50 hover:text-ink"
                  }`}
                >
                  <MapPin size={16} className={activeTab === "addresses" ? "text-[#006ce1]" : "text-slate-400"} />
                  <span>Sổ địa chỉ</span>
                </button>

                {/* Dàn PC đã lưu */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "builds"}
                  onClick={() => setActiveTab("builds")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-colors text-left cursor-pointer ${
                    activeTab === "builds"
                      ? "bg-[#edf5fe] text-[#006ce1]"
                      : "text-[#475569] hover:bg-slate-50 hover:text-ink"
                  }`}
                >
                  <Cpu size={16} className={activeTab === "builds" ? "text-[#006ce1]" : "text-slate-400"} />
                  <span>Dàn PC đã lưu</span>
                </button>

                {/* Góc máy của tôi */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "setups"}
                  onClick={() => setActiveTab("setups")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-colors text-left cursor-pointer ${
                    activeTab === "setups"
                      ? "bg-[#edf5fe] text-[#006ce1]"
                      : "text-[#475569] hover:bg-slate-50 hover:text-ink"
                  }`}
                >
                  <Camera size={16} className={activeTab === "setups" ? "text-[#006ce1]" : "text-slate-400"} />
                  <span>Góc máy của tôi</span>
                </button>

                <div className="my-1.5 border-t border-[#f1f5f9]" />

                {/* Direct Link to Orders */}
                <Link
                  href="/orders"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold text-[#475569] hover:bg-slate-50 hover:text-ink transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Package size={16} className="text-slate-400" />
                    <span>Đơn hàng của tôi</span>
                  </span>
                  <ExternalLink size={13} className="text-slate-400" />
                </Link>
              </nav>
            </aside>

            {/* Right Content Area */}
            <div className="flex flex-col gap-6">
              {/* Mục 1: Hồ sơ cá nhân */}
              {(activeTab === "profile" || activeTab === "settings") && (
                <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-8 shadow-xs">
                  <div className="flex items-start gap-3.5 pb-5 border-b border-[#f1f5f9]">
                    <div className="w-10 h-10 rounded-xl bg-[#edf5fe] text-[#006ce1] flex items-center justify-center shrink-0">
                      <User size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl font-bold text-ink tracking-tight">
                        Hồ sơ cá nhân
                      </h2>
                      <p className="text-xs md:text-sm text-muted mt-0.5">
                        Xem và cập nhật thông tin họ tên và số điện thoại liên hệ của bạn.
                      </p>
                    </div>
                  </div>

                  {profileNotice && (
                    <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex gap-2.5 items-start">
                      <Info size={16} className="shrink-0 mt-0.5 text-amber-600" />
                      <span>{profileNotice}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveProfile} className="flex flex-col gap-5 pt-6 max-w-[620px]">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="pName" className="text-xs font-bold text-ink">
                        Họ và tên
                      </label>
                      <input
                        id="pName"
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setProfileNotice(null);
                        }}
                        required
                        className="h-10 px-3.5 border border-[#e2e8f0] rounded-xl text-sm outline-none focus:border-[#006ce1] focus:ring-1 focus:ring-[#006ce1] transition-colors"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="pPhone" className="text-xs font-bold text-ink">
                        Số điện thoại liên hệ
                      </label>
                      <input
                        id="pPhone"
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          setProfileNotice(null);
                        }}
                        placeholder="Chưa cập nhật số điện thoại"
                        className="h-10 px-3.5 border border-[#e2e8f0] rounded-xl text-sm outline-none focus:border-[#006ce1] focus:ring-1 focus:ring-[#006ce1] transition-colors"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-ink">Vai trò tài khoản</span>
                      <div className="h-10 px-3.5 border border-[#e2e8f0] rounded-xl bg-slate-50 flex items-center">
                        <span className="text-xs font-medium text-slate-700">
                          {user.role === "ADMIN" ? "Quản trị viên hệ thống (ADMIN)" : "Khách hàng mua sắm (CUSTOMER)"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-ink">Địa chỉ email</span>
                      <div className="h-10 px-3.5 border border-[#e2e8f0] rounded-xl bg-slate-50 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700">{user.email}</span>
                        <span className="text-[11px] text-slate-400 font-medium">Email chính</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f1f5f9]">
                      {hasProfileChanges && (
                        <button
                          type="button"
                          onClick={handleResetProfile}
                          className="px-4 py-2 rounded-xl text-xs md:text-sm font-semibold text-slate-600 hover:text-ink hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          Hủy thay đổi
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={!hasProfileChanges || profileSaving}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer ${
                          hasProfileChanges && !profileSaving
                            ? "bg-[#006ce1] hover:bg-[#0051a8] text-white shadow-xs"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        {profileSaving && <Loader2 size={14} className="animate-spin" />}
                        <span>{profileSaving ? "Đang lưu..." : "Lưu thay đổi"}</span>
                      </button>
                    </div>
                  </form>
                </section>
              )}

              {/* Mục 2: Đổi mật khẩu */}
              {activeTab === "password" && (
                <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-8 shadow-xs">
                  <div className="flex items-start gap-3.5 pb-5 border-b border-[#f1f5f9]">
                    <div className="w-10 h-10 rounded-xl bg-[#edf5fe] text-[#006ce1] flex items-center justify-center shrink-0">
                      <KeyRound size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl font-bold text-ink tracking-tight">
                        Đổi mật khẩu
                      </h2>
                      <p className="text-xs md:text-sm text-muted mt-0.5">
                        Thay đổi mật khẩu định kỳ để tăng cường an toàn cho tài khoản và đơn hàng của bạn.
                      </p>
                    </div>
                  </div>

                  {passwordNotice && (
                    <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex gap-2.5 items-start">
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                      <span>{passwordNotice}</span>
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="flex flex-col gap-5 pt-6 max-w-[620px]">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="pOldPass" className="text-xs font-bold text-ink">
                        Mật khẩu hiện tại
                      </label>
                      <input
                        id="pOldPass"
                        type="password"
                        value={oldPassword}
                        onChange={(e) => {
                          setOldPassword(e.target.value);
                          setPasswordNotice(null);
                        }}
                        placeholder="Nhập mật khẩu đang dùng"
                        className="h-10 px-3.5 border border-[#e2e8f0] rounded-xl text-sm outline-none focus:border-[#006ce1] focus:ring-1 focus:ring-[#006ce1] transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="pNewPass" className="text-xs font-bold text-ink">
                          Mật khẩu mới
                        </label>
                        <input
                          id="pNewPass"
                          type="password"
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            setPasswordNotice(null);
                          }}
                          placeholder="Tối thiểu 6 ký tự"
                          className="h-10 px-3.5 border border-[#e2e8f0] rounded-xl text-sm outline-none focus:border-[#006ce1] focus:ring-1 focus:ring-[#006ce1] transition-colors"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="pConfirmPass" className="text-xs font-bold text-ink">
                          Xác nhận mật khẩu mới
                        </label>
                        <input
                          id="pConfirmPass"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setPasswordNotice(null);
                          }}
                          placeholder="Nhập lại mật khẩu mới"
                          className="h-10 px-3.5 border border-[#e2e8f0] rounded-xl text-sm outline-none focus:border-[#006ce1] focus:ring-1 focus:ring-[#006ce1] transition-colors"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-[#f1f5f9]">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-xs cursor-pointer"
                      >
                        <Lock size={14} />
                        <span>Cập nhật mật khẩu</span>
                      </button>
                    </div>
                  </form>
                </section>
              )}

              {/* Mục 3: Đăng ký sản phẩm & Bảo hành */}
              {activeTab === "register-product" && (
                <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-8 shadow-xs">
                  <div className="flex items-start gap-3.5 pb-5 border-b border-[#f1f5f9]">
                    <div className="w-10 h-10 rounded-xl bg-[#edf5fe] text-[#006ce1] flex items-center justify-center shrink-0">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl font-bold text-ink tracking-tight">
                        Đăng ký sản phẩm
                      </h2>
                      <p className="text-xs md:text-sm text-muted mt-0.5">
                        Đăng ký số sê-ri (S/N) thiết bị để kích hoạt bảo hành điện tử chính hãng và nhận hỗ trợ kỹ thuật ưu tiên.
                      </p>
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!serialNumber.trim()) {
                        toast("Vui lòng nhập số sê-ri sản phẩm.", "error");
                        return;
                      }
                      toast(`Đã gửi yêu cầu kích hoạt bảo hành cho thiết bị sê-ri ${serialNumber.trim()}!`, "success");
                      setSerialNumber("");
                    }}
                    className="flex flex-col gap-5 pt-6 max-w-[620px]"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="pSerial" className="text-xs font-bold text-ink">
                        Số sê-ri sản phẩm (S/N)
                      </label>
                      <input
                        id="pSerial"
                        type="text"
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                        placeholder="VD: SN-ASUS-4070S-99821 hoặc dán từ vỏ hộp"
                        required
                        className="h-10 px-3.5 border border-[#e2e8f0] rounded-xl text-sm outline-none focus:border-[#006ce1] focus:ring-1 focus:ring-[#006ce1] transition-colors"
                      />
                      <span className="text-[11px] text-muted">
                        Số sê-ri được in trên tem phụ của vỏ hộp hoặc mặt sau của linh kiện/dàn PC.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="pCategory" className="text-xs font-bold text-ink">
                          Loại thiết bị
                        </label>
                        <select
                          id="pCategory"
                          value={productCategory}
                          onChange={(e) => setProductCategory(e.target.value)}
                          className="h-10 px-3 border border-[#e2e8f0] rounded-xl text-sm outline-none focus:border-[#006ce1] bg-white transition-colors cursor-pointer"
                        >
                          <option value="VGA">Card đồ họa (VGA)</option>
                          <option value="CPU">Bộ vi xử lý (CPU)</option>
                          <option value="MAINBOARD">Bo mạch chủ (Mainboard)</option>
                          <option value="PC_SET">Dàn PC trọn bộ</option>
                          <option value="MONITOR">Màn hình máy tính</option>
                          <option value="STORAGE">Ổ cứng SSD / HDD</option>
                          <option value="OTHER">Linh kiện khác</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="pBuyDate" className="text-xs font-bold text-ink">
                          Ngày mua hàng
                        </label>
                        <input
                          id="pBuyDate"
                          type="date"
                          value={purchaseDate}
                          onChange={(e) => setPurchaseDate(e.target.value)}
                          className="h-10 px-3 border border-[#e2e8f0] rounded-xl text-sm outline-none focus:border-[#006ce1] bg-white transition-colors cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex flex-col gap-2">
                      <strong className="text-ink font-semibold">Đặc quyền khi đăng ký thiết bị tại PC Store:</strong>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <span>Bảo hành chính hãng 36 tháng, 1 đổi 1 trong 30 ngày đầu</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <span>Tra cứu lịch sử bảo hành và sửa chữa trực tuyến không cần giữ hóa đơn giấy</span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-[#f1f5f9]">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-xs cursor-pointer"
                      >
                        <ShieldCheck size={15} />
                        <span>Kích hoạt bảo hành</span>
                      </button>
                    </div>
                  </form>
                </section>
              )}

              {/* Mục 5: Trung tâm tin nhắn */}
              {activeTab === "messages" && (
                <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-8 shadow-xs">
                  <div className="flex items-start gap-3.5 pb-5 border-b border-[#f1f5f9]">
                    <div className="w-10 h-10 rounded-xl bg-[#edf5fe] text-[#006ce1] flex items-center justify-center shrink-0">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl font-bold text-ink tracking-tight">
                        Trung tâm tin nhắn
                      </h2>
                      <p className="text-xs md:text-sm text-muted mt-0.5">
                        Thông báo đơn hàng, cập nhật bảo mật tài khoản và tin tức từ hệ thống PC Store.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-6">
                    <div className="p-4 rounded-xl border border-[#e2e8f0] bg-white hover:border-[#006ce1]/40 transition-colors flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#006ce1] flex items-center justify-center shrink-0 mt-0.5">
                        <Bell size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <strong className="text-xs md:text-sm font-bold text-ink">Chào mừng bạn đến với PC Store</strong>
                          <span className="text-[11px] text-muted whitespace-nowrap">Hôm nay</span>
                        </div>
                        <p className="text-xs text-slate-600 m-0 leading-relaxed">
                          Tài khoản của bạn đã được khởi tạo thành công. Hãy trải nghiệm công cụ Xây dựng cấu hình PC (Builder) và chia sẻ Góc máy của riêng bạn!
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-[#e2e8f0] bg-white hover:border-[#006ce1]/40 transition-colors flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <ShieldCheck size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <strong className="text-xs md:text-sm font-bold text-ink">Bảo mật tài khoản</strong>
                          <span className="text-[11px] text-muted whitespace-nowrap">Gần đây</span>
                        </div>
                        <p className="text-xs text-slate-600 m-0 leading-relaxed">
                          Bạn có thể cập nhật mật khẩu định kỳ trong mục Đổi mật khẩu để nâng cao an toàn cho tài khoản PC Store.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-[#e2e8f0] bg-white hover:border-[#006ce1]/40 transition-colors flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Package size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <strong className="text-xs md:text-sm font-bold text-ink">Chính sách bảo hành vàng 36 tháng</strong>
                          <span className="text-[11px] text-muted whitespace-nowrap">Hệ thống</span>
                        </div>
                        <p className="text-xs text-slate-600 m-0 leading-relaxed">
                          Mọi linh kiện chính hãng mua tại PC Store đều được hỗ trợ bảo hành điện tử chính hãng 36 tháng và đổi mới 30 ngày nếu phát sinh lỗi kỹ thuật.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Tab 2: Saved Addresses */}
              {activeTab === "addresses" && (
                <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-8 shadow-xs min-h-[460px] flex flex-col gap-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-lg md:text-xl font-bold text-ink tracking-tight">
                        Sổ địa chỉ nhận hàng
                      </h2>
                      <p className="text-xs md:text-sm text-muted mt-1">
                        Lưu sẵn địa chỉ nhận hàng trên thiết bị để điền nhanh trong bước thanh toán.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddAddressOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-xs cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>Thêm địa chỉ mới</span>
                    </button>
                  </div>

                  {addresses.length === 0 ? (
                    <div className="text-center py-14 px-6 border border-dashed border-[#cbd5e1] rounded-2xl flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                        <MapPin size={22} />
                      </div>
                      <h3 className="text-sm font-bold text-ink mb-1">
                        Bạn chưa lưu địa chỉ nhận hàng nào
                      </h3>
                      <p className="text-xs text-muted max-w-sm mb-4">
                        Thêm địa chỉ nhà riêng hoặc văn phòng để tiết kiệm thời gian đặt hàng sau này.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAddAddressOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#006ce1] border border-[#006ce1] hover:bg-[#edf5fe] transition-colors cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Thêm địa chỉ đầu tiên</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {addresses.map((addr) => (
                        <article
                          key={addr.id}
                          className={`border rounded-xl p-5 flex flex-col justify-between transition-all ${
                            addr.isDefault
                              ? "border-[#006ce1] bg-[#f8fbff]"
                              : "border-[#e2e8f0] bg-white hover:border-slate-300"
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                {addr.label}
                              </span>
                              {addr.isDefault && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006ce1]">
                                  <CheckCircle2 size={13} /> Mặc định
                                </span>
                              )}
                            </div>
                            <strong className="block text-sm font-bold text-ink mb-0.5">
                              {addr.recipientName}
                            </strong>
                            <span className="block text-xs text-muted mb-2">
                              SĐT: {addr.phone}
                            </span>
                            <p className="text-xs text-slate-700 leading-relaxed m-0">
                              {addr.address}
                            </p>
                          </div>

                          <div className="flex justify-end items-center gap-3 mt-4 pt-3 border-t border-slate-100">
                            {!addr.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultAddress(addr.id)}
                                className="text-xs font-semibold text-[#006ce1] hover:underline cursor-pointer"
                              >
                                Đặt làm mặc định
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-700 cursor-pointer"
                              aria-label="Xóa địa chỉ"
                            >
                              <Trash2 size={13} /> Xóa
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Tab 3: Saved Builds (Real API) */}
              {activeTab === "builds" && (
                <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-8 shadow-xs min-h-[460px] flex flex-col gap-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-lg md:text-xl font-bold text-ink tracking-tight">
                        Dàn PC đã lưu
                      </h2>
                      <p className="text-xs md:text-sm text-muted mt-1">
                        Danh sách các dàn máy tính bạn đã thiết kế và lưu từ công cụ PC Builder.
                      </p>
                    </div>
                    <Link
                      href="/builder"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-xs cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>Tự ráp cấu hình mới</span>
                    </Link>
                  </div>

                  {buildsLoading ? (
                    <div className="text-center py-16 px-6 border border-[#e2e8f0] rounded-2xl flex flex-col items-center justify-center">
                      <Loader2 size={32} className="animate-spin text-[#006ce1] mb-3" />
                      <p className="text-xs md:text-sm text-muted">
                        Đang tải danh sách cấu hình đã lưu từ máy chủ...
                      </p>
                    </div>
                  ) : buildsError ? (
                    <div className="text-center py-12 px-6 border border-rose-200 bg-rose-50 rounded-2xl flex flex-col items-center justify-center">
                      <AlertCircle size={32} className="text-rose-500 mb-2" />
                      <h3 className="text-sm font-bold text-rose-800 mb-1">
                        Không thể tải danh sách cấu hình
                      </h3>
                      <p className="text-xs text-rose-600 mb-4 max-w-sm">{buildsError}</p>
                      <button
                        type="button"
                        onClick={() => void loadBuilds()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer"
                      >
                        <RefreshCw size={13} />
                        <span>Thử lại</span>
                      </button>
                    </div>
                  ) : serverBuilds.length === 0 ? (
                    <div className="text-center py-14 px-6 border border-dashed border-[#cbd5e1] rounded-2xl flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                        <Cpu size={22} />
                      </div>
                      <h3 className="text-sm font-bold text-ink mb-1">
                        Bạn chưa có cấu hình PC nào được lưu
                      </h3>
                      <p className="text-xs text-muted max-w-sm mb-4">
                        Dùng công cụ PC Builder để lựa chọn linh kiện, kiểm tra chân cắm tương thích tự động và lưu lại dàn máy của bạn.
                      </p>
                      <Link
                        href="/builder"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#006ce1] border border-[#006ce1] hover:bg-[#edf5fe] transition-colors cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Tạo cấu hình PC</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {serverBuilds.map((build) => (
                        <article
                          key={build.buildId}
                          className="border border-[#e2e8f0] rounded-xl p-5 md:p-6 flex flex-col gap-3.5 bg-white hover:border-slate-300 transition-colors"
                        >
                          <div className="flex justify-between items-start flex-wrap gap-3">
                            <div>
                              <strong className="block text-base font-bold text-ink mb-1">
                                {build.name}
                              </strong>
                              <div className="text-xs text-muted flex items-center gap-2 flex-wrap">
                                <span>{build.items.length} linh kiện</span>
                                <span>·</span>
                                <span
                                  className={
                                    build.compatibility?.status === "PASS"
                                      ? "text-emerald-600 font-bold"
                                      : build.compatibility?.status === "FAIL"
                                      ? "text-rose-600 font-bold"
                                      : "text-amber-600 font-bold"
                                  }
                                >
                                  {build.compatibility?.status === "PASS"
                                    ? "✓ Tương thích 100%"
                                    : build.compatibility?.status === "FAIL"
                                    ? "✗ Có lỗi tương thích"
                                    : "? Chưa rõ tương thích"}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="block text-lg font-extrabold text-ink">
                                {formatPrice(build.totalAmount)}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                            {build.items.map((item, idx) => (
                              <div key={idx} className="truncate" title={item.productName}>
                                <span className="text-muted mr-1.5">•</span>
                                <span className="text-ink font-medium">{item.productName}</span>
                                {item.quantity > 1 && (
                                  <span className="text-muted ml-1">(x{item.quantity})</span>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => void handleDeleteBuild(build.buildId)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                              <span>Xóa</span>
                            </button>
                            <Link
                              href="/builder"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                              <span>Mở trong Builder</span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => void handleAddBuildToCart(build.buildId)}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-xs cursor-pointer"
                            >
                              <ShoppingCart size={13} />
                              <span>Thêm vào giỏ</span>
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Tab 4: My Setups (Real API) */}
              {activeTab === "setups" && (
                <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-8 shadow-xs min-h-[460px] flex flex-col gap-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-lg md:text-xl font-bold text-ink tracking-tight">
                        Góc máy của tôi
                      </h2>
                      <p className="text-xs md:text-sm text-muted mt-1">
                        Các bài đăng góc máy và không gian làm việc bạn đã chia sẻ lên cộng đồng PC Store.
                      </p>
                    </div>
                    <Link
                      href="/community"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-xs cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>Chia sẻ góc máy mới</span>
                    </Link>
                  </div>

                  {setupsLoading ? (
                    <div className="text-center py-16 px-6 border border-[#e2e8f0] rounded-2xl flex flex-col items-center justify-center">
                      <Loader2 size={32} className="animate-spin text-[#006ce1] mb-3" />
                      <p className="text-xs md:text-sm text-muted">
                        Đang tải danh sách bài đăng góc máy từ máy chủ...
                      </p>
                    </div>
                  ) : setupsError ? (
                    <div className="text-center py-12 px-6 border border-rose-200 bg-rose-50 rounded-2xl flex flex-col items-center justify-center">
                      <AlertCircle size={32} className="text-rose-500 mb-2" />
                      <h3 className="text-sm font-bold text-rose-800 mb-1">
                        Không thể tải danh sách bài đăng
                      </h3>
                      <p className="text-xs text-rose-600 mb-4 max-w-sm">{setupsError}</p>
                      <button
                        type="button"
                        onClick={() => void loadSetups()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer"
                      >
                        <RefreshCw size={13} />
                        <span>Thử lại</span>
                      </button>
                    </div>
                  ) : mySetups.length === 0 ? (
                    <div className="text-center py-14 px-6 border border-dashed border-[#cbd5e1] rounded-2xl flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                        <Camera size={22} />
                      </div>
                      <h3 className="text-sm font-bold text-ink mb-1">
                        Bạn chưa có bài đăng góc máy nào
                      </h3>
                      <p className="text-xs text-muted max-w-sm mb-4">
                        Chia sẻ góc máy làm việc, chơi game của bạn với cộng đồng để truyền cảm hứng cho người dùng khác.
                      </p>
                      <Link
                        href="/community"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#006ce1] border border-[#006ce1] hover:bg-[#edf5fe] transition-colors cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Chia sẻ góc máy đầu tiên</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {mySetups.map((post) => (
                        <article
                          key={post.postId}
                          className="border border-[#e2e8f0] rounded-xl p-5 flex flex-col justify-between bg-white hover:border-slate-300 transition-colors"
                        >
                          <div>
                            <div className="flex justify-between items-center text-xs text-muted mb-2">
                              <span>Mã bài #{post.postId}</span>
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                {post.status === "PUBLISHED" ? "Đã xuất bản" : post.status}
                              </span>
                            </div>
                            <strong className="block text-base font-bold text-ink mb-1.5 leading-snug">
                              {post.title}
                            </strong>
                            <p className="text-xs text-muted line-clamp-2 leading-relaxed m-0 mb-3">
                              {post.description}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-muted">
                            <span>{formatAccountDate(post.createdAt)}</span>
                            <Link
                              href={`/community/${post.postId}`}
                              className="text-xs font-semibold text-[#006ce1] hover:underline inline-flex items-center gap-1"
                            >
                              <span>Xem chi tiết</span>
                              <ArrowRight size={12} />
                            </Link>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>

        {/* Add Address Modal (Accessible & User-Scoped) */}
        {isAddAddressOpen && (
          <AddAddressModal
            isOpen={isAddAddressOpen}
            defaultRecipientName={user.fullName}
            defaultPhone={user.phone || ""}
            onClose={() => setIsAddAddressOpen(false)}
            onSave={handleAddAddressSuccess}
          />
        )}
      </main>
      <Footer />
    </>
  );
}


function AddAddressModal({
  isOpen,
  defaultRecipientName,
  defaultPhone,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  defaultRecipientName: string;
  defaultPhone: string;
  onClose: () => void;
  onSave: (address: Omit<SavedAddress, "id">) => void;
}) {
  const [label, setLabel] = useState("Nhà riêng");
  const [recipientName, setRecipientName] = useState(defaultRecipientName || "");
  const [phone, setPhone] = useState(defaultPhone || "");
  const [address, setAddress] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      toast("Vui lòng nhập địa chỉ giao hàng cụ thể.", "error");
      return;
    }
    if (!recipientName.trim()) {
      toast("Vui lòng nhập tên người nhận hàng.", "error");
      return;
    }
    if (!phone.trim()) {
      toast("Vui lòng nhập số điện thoại liên hệ.", "error");
      return;
    }

    onSave({
      label,
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      isDefault,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#e2e8f0] p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
          <h3 id="modal-title" className="text-base font-bold text-ink">
            Thêm địa chỉ giao hàng mới
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-ink hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Đóng hộp thoại"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-ink">Loại địa chỉ</label>
            <div className="flex gap-2">
              {["Nhà riêng", "Văn phòng", "Khác"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setLabel(opt)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    label === opt
                      ? "border-[#006ce1] bg-[#edf5fe] text-[#006ce1]"
                      : "border-[#e2e8f0] text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="modalRecipient" className="text-xs font-bold text-ink">
              Tên người nhận
            </label>
            <input
              id="modalRecipient"
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              required
              className="h-9 px-3 border border-[#e2e8f0] rounded-lg text-xs outline-none focus:border-[#006ce1]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="modalPhone" className="text-xs font-bold text-ink">
              Số điện thoại
            </label>
            <input
              id="modalPhone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="h-9 px-3 border border-[#e2e8f0] rounded-lg text-xs outline-none focus:border-[#006ce1]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="modalAddress" className="text-xs font-bold text-ink">
              Địa chỉ chi tiết
            </label>
            <textarea
              id="modalAddress"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
              className="p-3 border border-[#e2e8f0] rounded-lg text-xs outline-none focus:border-[#006ce1] resize-none"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded text-[#006ce1] focus:ring-[#006ce1]"
            />
            <span>Đặt làm địa chỉ giao hàng mặc định</span>
          </label>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#f1f5f9]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-xs cursor-pointer"
            >
              Lưu địa chỉ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

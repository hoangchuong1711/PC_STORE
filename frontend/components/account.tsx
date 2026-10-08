"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  MapPin,
  Cpu,
  Camera,
  Plus,
  Trash2,
  CheckCircle2,
  ShoppingCart,
  Crown,
  Lock,
  ArrowRight,
  X,
} from "lucide-react";
import {
  getUserProfile,
  updateUserProfile,
  getUserAddresses,
  addSavedAddress,
  deleteSavedAddress,
  setDefaultAddress,
  getSavedBuilds,
  deleteSavedBuild,
  formatAccountDate,
} from "../lib/account";
import { getCommunityPosts } from "../lib/community";
import { formatPrice } from "../lib/products";
import { useCart } from "./cart-provider";
import { useToast } from "./toast";
import { Header, Footer } from "./storefront";

type AccountTab = "profile" | "addresses" | "builds" | "setups";

export function AccountDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AccountTab>("profile");
  const [profile, setProfile] = useState(() => getUserProfile());
  const [addresses, setAddresses] = useState(() => getUserAddresses());
  const [builds, setBuilds] = useState(() => getSavedBuilds());
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);

  // Profile Form States
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [role, setRole] = useState(profile.role);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const { add } = useCart();
  const { toast } = useToast();

  const userSetups = getCommunityPosts("all").slice(0, 2);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = updateUserProfile({ name, phone, role });
    setProfile(updated);
    toast("Đã lưu thông tin tài khoản thành công!", "success");
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || newPassword.length < 6) {
      toast("Mật khẩu mới phải có ít nhất 6 ký tự.", "error");
      return;
    }
    setOldPassword("");
    setNewPassword("");
    toast("Đã đổi mật khẩu thành công!", "success");
  };

  const handleSetDefaultAddress = (id: string) => {
    setDefaultAddress(id);
    setAddresses(getUserAddresses());
    toast("Đã đặt làm địa chỉ giao hàng mặc định!", "success");
  };

  const handleDeleteAddress = (id: string) => {
    deleteSavedAddress(id);
    setAddresses(getUserAddresses());
    toast("Đã xóa địa chỉ khỏi sổ tay.", "info");
  };

  const handleDeleteBuild = (id: string) => {
    deleteSavedBuild(id);
    setBuilds(getSavedBuilds());
    toast("Đã gỡ bỏ cấu hình đã lưu.", "info");
  };

  const handleAddBuildToCart = (components: Array<{ productId: string; name: string }>) => {
    components.forEach((c) => {
      add(c.productId, 1);
    });
    toast(`Đã thêm ${components.length} linh kiện của cấu hình vào giỏ hàng!`, "success");
    router.push("/cart");
  };

  return (
    <>
      <Header />
      <main className="container py-10 pb-24 min-h-[75vh]">
        {/* User Card Header */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[20px] p-7 md:p-9 text-white flex justify-between items-center gap-6 mb-8 border border-white/10 shadow-xl flex-wrap">
          <div className="flex items-center gap-5">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.avatar}
                alt={profile.name}
                className="w-[72px] h-[72px] rounded-full object-cover border-[3px] border-sky-400"
              />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-extrabold text-slate-50 mb-1 tracking-tight">
                {profile.name}
              </h1>
              <p className="font-sans text-xs md:text-sm text-slate-400 mb-2">{profile.email}</p>
              <div className="inline-flex items-center gap-1.5 bg-[#edf5fe] border border-[#006ce1]/30 text-[#006ce1] font-specs text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md">
                <Crown size={13} /> {profile.tier} (Giảm {profile.tierDiscount}% mọi đơn hàng)
              </div>
            </div>
          </div>

          <div className="flex gap-6 pl-6 border-l border-white/10 max-md:border-l-0 max-md:border-t max-md:pt-4 max-md:w-full max-md:justify-between max-md:pl-0">
            <div className="text-right max-md:text-left">
              <strong className="block font-specs text-2xl font-bold text-slate-100">{addresses.length}</strong>
              <span className="text-xs text-slate-400">Địa chỉ</span>
            </div>
            <div className="text-right max-md:text-left">
              <strong className="block font-specs text-2xl font-bold text-slate-100">{builds.length}</strong>
              <span className="text-xs text-slate-400">Dàn PC đã lưu</span>
            </div>
            <div className="text-right max-md:text-left">
              <strong className="block font-specs text-2xl font-bold text-slate-100">{userSetups.length}</strong>
              <span className="text-xs text-slate-400">Góc máy đã đăng</span>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-[#e0e0e0] mb-8 overflow-x-auto" role="tablist" aria-label="Các mục tài khoản">
          <button
            type="button"
            className={`inline-flex items-center gap-2 px-5 py-3 font-nav text-sm font-semibold transition-all whitespace-nowrap border-b-2 cursor-pointer ${
              activeTab === "profile"
                ? "text-[#006ce1] border-[#006ce1]"
                : "text-muted border-transparent hover:text-ink"
            }`}
            onClick={() => setActiveTab("profile")}
            role="tab"
            aria-selected={activeTab === "profile"}
          >
            <User size={16} /> Thông tin cá nhân
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-2 px-5 py-3 font-nav text-sm font-semibold transition-all whitespace-nowrap border-b-2 cursor-pointer ${
              activeTab === "addresses"
                ? "text-[#006ce1] border-[#006ce1]"
                : "text-muted border-transparent hover:text-ink"
            }`}
            onClick={() => setActiveTab("addresses")}
            role="tab"
            aria-selected={activeTab === "addresses"}
          >
            <MapPin size={16} /> Sổ địa chỉ ({addresses.length})
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-2 px-5 py-3 font-nav text-sm font-semibold transition-all whitespace-nowrap border-b-2 cursor-pointer ${
              activeTab === "builds"
                ? "text-[#006ce1] border-[#006ce1]"
                : "text-muted border-transparent hover:text-ink"
            }`}
            onClick={() => setActiveTab("builds")}
            role="tab"
            aria-selected={activeTab === "builds"}
          >
            <Cpu size={16} /> Dàn PC đã lưu ({builds.length})
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-2 px-5 py-3 font-nav text-sm font-semibold transition-all whitespace-nowrap border-b-2 cursor-pointer ${
              activeTab === "setups"
                ? "text-[#006ce1] border-[#006ce1]"
                : "text-muted border-transparent hover:text-ink"
            }`}
            onClick={() => setActiveTab("setups")}
            role="tab"
            aria-selected={activeTab === "setups"}
          >
            <Camera size={16} /> Góc máy của tôi ({userSetups.length})
          </button>
        </div>

        {/* Tab 1: Profile */}
        {activeTab === "profile" && (
          <div className="flex flex-col gap-7">
            <div className="bg-white border border-[#e0e0e0] rounded-[18px] p-7 md:p-8 max-w-[680px]">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="font-heading text-xl font-bold text-ink m-0 tracking-tight">Hồ sơ cá nhân</h2>
                  <p className="text-xs text-muted mt-1 mb-0">Cập nhật thông tin liên hệ và nghề nghiệp hiển thị trong cộng đồng</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="pName" className="text-xs font-bold text-ink">Họ và tên</label>
                    <input
                      id="pName"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#006ce1]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="pEmail" className="text-xs font-bold text-ink">Email đăng nhập</label>
                    <input
                      id="pEmail"
                      type="email"
                      value={profile.email}
                      disabled
                      title="Email tài khoản không thể chỉnh sửa"
                      className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none bg-slate-50 text-muted"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="pPhone" className="text-xs font-bold text-ink">Số điện thoại liên hệ</label>
                    <input
                      id="pPhone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#006ce1]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="pRole" className="text-xs font-bold text-ink">Sở thích / Nghề nghiệp</label>
                    <input
                      id="pRole"
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#006ce1]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm cursor-pointer"
                  >
                    Lưu thông tin cá nhân
                  </button>
                </div>
              </form>
            </div>

            {/* Password Change Form */}
            <div className="bg-white border border-[#e0e0e0] rounded-[18px] p-7 md:p-8 max-w-[680px]">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="font-heading text-xl font-bold text-ink m-0 tracking-tight">Bảo mật tài khoản</h2>
                  <p className="text-xs text-muted mt-1 mb-0">Đổi mật khẩu định kỳ để bảo vệ giỏ hàng và dữ liệu đơn hàng</p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="pOldPass" className="text-xs font-bold text-ink">Mật khẩu hiện tại</label>
                    <input
                      id="pOldPass"
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#006ce1]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="pNewPass" className="text-xs font-bold text-ink">Mật khẩu mới (tối thiểu 6 ký tự)</label>
                    <input
                      id="pNewPass"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#006ce1]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-ink border border-[#e0e0e0] hover:border-slate-400 bg-white transition-colors cursor-pointer"
                  >
                    <Lock size={15} /> Đổi mật khẩu
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab 2: Addresses */}
        {activeTab === "addresses" && (
          <div className="flex flex-col gap-7">
            <div className="flex justify-between items-center mb-1">
              <div>
                <h2 className="font-heading text-xl font-bold text-ink m-0 tracking-tight">Sổ địa chỉ giao hàng</h2>
                <p className="text-xs text-muted mt-1 mb-0">Quản lý các địa chỉ nhận hàng để thanh toán nhanh hơn</p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm cursor-pointer"
                onClick={() => setIsAddAddressOpen(true)}
              >
                <Plus size={16} /> Thêm địa chỉ mới
              </button>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5">
              {addresses.map((addr) => (
                <article
                  key={addr.id}
                  className={`bg-white border rounded-2xl p-6 flex flex-col relative transition-all ${
                    addr.isDefault ? "border-[#006ce1] ring-1 ring-[#006ce1]" : "border-[#e0e0e0]"
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                      {addr.label}
                    </span>
                    {addr.isDefault && (
                      <span className="text-[11px] font-bold bg-blue-50 text-[#006ce1] px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                        <CheckCircle2 size={13} /> Mặc định
                      </span>
                    )}
                  </div>
                  <h3 className="m-0 mb-1 text-base font-bold text-ink">{addr.recipientName}</h3>
                  <span className="text-xs text-muted mb-2">{addr.phone}</span>
                  <p className="text-xs md:text-sm leading-relaxed text-slate-700 mb-4 flex-1">{addr.address}</p>

                  <div className="flex items-center justify-between gap-2 pt-3.5 border-t border-slate-100">
                    {!addr.isDefault ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-muted hover:text-[#006ce1] bg-transparent border-none cursor-pointer"
                        onClick={() => handleSetDefaultAddress(addr.id)}
                      >
                        Đặt làm mặc định
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-700 font-semibold">
                        Địa chỉ ưu tiên
                      </span>
                    )}
                    <button
                      type="button"
                      className="text-xs font-semibold text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer flex items-center gap-1"
                      onClick={() => handleDeleteAddress(addr.id)}
                      aria-label="Xóa địa chỉ"
                    >
                      <Trash2 size={14} /> Xóa
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Saved PC Builds */}
        {activeTab === "builds" && (
          <div className="flex flex-col gap-7">
            <div className="flex justify-between items-center mb-1">
              <div>
                <h2 className="font-heading text-xl font-bold text-ink m-0 tracking-tight">Cấu hình PC đã lưu</h2>
                <p className="text-xs text-muted mt-1 mb-0">Các dàn máy bạn đã thiết kế trên công cụ Tự ráp PC (Builder)</p>
              </div>
              <Link
                href="/builder"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm cursor-pointer"
              >
                <Plus size={16} /> Tự ráp cấu hình mới
              </Link>
            </div>

            {builds.length > 0 ? (
              <div className="flex flex-col gap-5">
                {builds.map((build) => (
                  <article key={build.id} className="bg-white border border-[#e0e0e0] rounded-[18px] p-6 md:p-7 flex flex-col gap-4">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-ink m-0 mb-1">{build.name}</h3>
                        <div className="text-xs text-muted flex gap-3 items-center">
                          <span>Lưu ngày: {formatAccountDate(build.createdAt)}</span>
                          <span>·</span>
                          <span>{build.components.length} linh kiện</span>
                          <span>·</span>
                          <span className="text-emerald-700 font-bold">
                            ✓ Tương thích 100%
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-extrabold text-ink">
                          {formatPrice(build.totalPrice)}
                        </div>
                        <span className="text-xs text-emerald-700 font-semibold">
                          Ước lượng: {build.estimatedWattage}W
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2.5 bg-slate-50 rounded-xl p-3.5 md:p-4 border border-slate-100">
                      {build.components.map((c, idx) => (
                        <div key={idx} className="text-xs flex flex-col">
                          <span className="text-[10px] font-bold uppercase text-muted">{c.slotLabel}</span>
                          <strong className="text-ink truncate" title={c.name}>{c.name}</strong>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-ink border border-[#e0e0e0] hover:border-slate-400 bg-white transition-colors cursor-pointer"
                        onClick={() => handleDeleteBuild(build.id)}
                      >
                        <Trash2 size={14} /> Xóa
                      </button>
                      <Link
                        href="/builder"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-ink border border-[#e0e0e0] hover:border-slate-400 bg-white transition-colors cursor-pointer"
                      >
                        Nạp vào Builder
                      </Link>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm cursor-pointer"
                        onClick={() => handleAddBuildToCart(build.components)}
                      >
                        <ShoppingCart size={15} /> Thêm cả dàn vào giỏ
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-6 bg-white border border-[#e0e0e0] rounded-2xl">
                <h3 className="text-lg font-bold text-ink mb-2">Bạn chưa lưu cấu hình PC nào</h3>
                <p className="text-sm text-muted mb-4">Hãy trải nghiệm công cụ Tự ráp PC để thiết kế cấu hình tối ưu.</p>
                <Link
                  href="/builder"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm cursor-pointer"
                >
                  Khám phá PC Builder ngay
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Setups */}
        {activeTab === "setups" && (
          <div className="flex flex-col gap-7">
            <div className="flex justify-between items-center mb-1">
              <div>
                <h2 className="font-heading text-xl font-bold text-ink m-0 tracking-tight">Góc máy của tôi</h2>
                <p className="text-xs text-muted mt-1 mb-0">Các không gian làm việc bạn đã chia sẻ lên cộng đồng</p>
              </div>
              <Link
                href="/community"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm cursor-pointer"
              >
                <Camera size={16} /> Chia sẻ góc máy mới
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {userSetups.map((post) => (
                <article key={post.id} className="bg-white border border-[#e0e0e0] rounded-2xl overflow-hidden flex flex-col">
                  <Link href={`/community/${post.id}`} className="relative block aspect-video overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                    <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-md">
                      {post.style}
                    </span>
                  </Link>

                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-heading text-base font-bold text-ink mb-2">
                      <Link href={`/community/${post.id}`} className="hover:text-[#006ce1] transition-colors">
                        {post.title}
                      </Link>
                    </h3>
                    <p className="text-xs text-muted leading-relaxed mb-4 flex-1">
                      {post.description.slice(0, 100)}...
                    </p>
                    <div className="flex justify-between items-center text-xs text-muted pt-3 border-t border-slate-100">
                      <span>Đã đăng: {formatAccountDate(post.createdAt)}</span>
                      <Link href={`/community/${post.id}`} className="font-semibold text-[#006ce1] flex items-center gap-1 hover:underline">
                        Xem bài viết <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* Add Address Modal */}
        {isAddAddressOpen && (
          <AddAddressModal
            isOpen={isAddAddressOpen}
            onClose={() => setIsAddAddressOpen(false)}
            onSuccess={() => setAddresses(getUserAddresses())}
          />
        )}
      </main>
      <Footer />
    </>
  );
}

function AddAddressModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [label, setLabel] = useState("Nhà riêng");
  const [recipientName, setRecipientName] = useState("Nguyễn Minh Anh");
  const [phone, setPhone] = useState("0901234567");
  const [address, setAddress] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      toast("Vui lòng nhập địa chỉ chi tiết.", "error");
      return;
    }

    addSavedAddress({
      label,
      recipientName,
      phone,
      address,
      isDefault,
    });

    toast("Đã thêm địa chỉ mới vào sổ tay!", "success");
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 grid place-items-center p-5" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-7 md:p-8 max-w-[480px] w-full shadow-2xl"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-5">
          <h2 className="text-xl font-bold text-ink m-0">Thêm địa chỉ giao hàng</h2>
          <button
            type="button"
            className="text-muted hover:text-ink p-1 rounded-lg bg-transparent border-none cursor-pointer"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="addrLabel" className="text-xs font-bold text-ink">Tên gợi nhớ (Nhãn)</label>
            <input
              id="addrLabel"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="VD: Nhà riêng, Công ty, Kho..."
              required
              className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#006ce1]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="addrRecipient" className="text-xs font-bold text-ink">Người nhận</label>
              <input
                id="addrRecipient"
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
                className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#006ce1]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="addrPhone" className="text-xs font-bold text-ink">Số điện thoại</label>
              <input
                id="addrPhone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#006ce1]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="addrText" className="text-xs font-bold text-ink">Địa chỉ chi tiết</label>
            <input
              id="addrText"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành..."
              required
              className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#006ce1]"
            />
          </div>

          <label className="flex items-center gap-2 text-xs md:text-sm cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-[#e0e0e0] text-[#006ce1] focus:ring-[#006ce1]"
            />
            <span>Đặt làm địa chỉ nhận hàng mặc định</span>
          </label>

          <div className="flex justify-end gap-2.5 mt-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-ink border border-[#e0e0e0] hover:border-slate-400 bg-white transition-colors cursor-pointer"
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm cursor-pointer"
            >
              Lưu địa chỉ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

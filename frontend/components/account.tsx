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
import "./account.css";

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
      <main className="container account-page">
        {/* User Card Header */}
        <section className="account-header-card">
          <div className="account-user-meta">
            <div className="account-avatar-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.avatar}
                alt={profile.name}
                className="account-avatar-img"
              />
            </div>
            <div className="account-names">
              <h1>{profile.name}</h1>
              <p>{profile.email}</p>
              <div className="account-tier-badge">
                <Crown size={13} /> {profile.tier} (Giảm {profile.tierDiscount}% mọi đơn hàng)
              </div>
            </div>
          </div>

          <div className="account-quick-stats">
            <div className="quick-stat-box">
              <strong>{addresses.length}</strong>
              <span>Địa chỉ</span>
            </div>
            <div className="quick-stat-box">
              <strong>{builds.length}</strong>
              <span>Dàn PC đã lưu</span>
            </div>
            <div className="quick-stat-box">
              <strong>{userSetups.length}</strong>
              <span>Góc máy đã đăng</span>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="account-tabs-bar" role="tablist" aria-label="Các mục tài khoản">
          <button
            type="button"
            className={`account-tab-btn ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
            role="tab"
            aria-selected={activeTab === "profile"}
          >
            <User size={16} /> Thông tin cá nhân
          </button>
          <button
            type="button"
            className={`account-tab-btn ${activeTab === "addresses" ? "active" : ""}`}
            onClick={() => setActiveTab("addresses")}
            role="tab"
            aria-selected={activeTab === "addresses"}
          >
            <MapPin size={16} /> Sổ địa chỉ ({addresses.length})
          </button>
          <button
            type="button"
            className={`account-tab-btn ${activeTab === "builds" ? "active" : ""}`}
            onClick={() => setActiveTab("builds")}
            role="tab"
            aria-selected={activeTab === "builds"}
          >
            <Cpu size={16} /> Dàn PC đã lưu ({builds.length})
          </button>
          <button
            type="button"
            className={`account-tab-btn ${activeTab === "setups" ? "active" : ""}`}
            onClick={() => setActiveTab("setups")}
            role="tab"
            aria-selected={activeTab === "setups"}
          >
            <Camera size={16} /> Góc máy của tôi ({userSetups.length})
          </button>
        </div>

        {/* Tab 1: Profile */}
        {activeTab === "profile" && (
          <div className="account-panel">
            <div className="profile-card">
              <div className="panel-section-title">
                <div>
                  <h2>Hồ sơ cá nhân</h2>
                  <p>Cập nhật thông tin liên hệ và nghề nghiệp hiển thị trong cộng đồng</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="profile-form">
                <div className="profile-form-row">
                  <div className="profile-field">
                    <label htmlFor="pName">Họ và tên</label>
                    <input
                      id="pName"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="profile-field">
                    <label htmlFor="pEmail">Email đăng nhập</label>
                    <input
                      id="pEmail"
                      type="email"
                      value={profile.email}
                      disabled
                      title="Email tài khoản không thể chỉnh sửa"
                    />
                  </div>
                </div>

                <div className="profile-form-row">
                  <div className="profile-field">
                    <label htmlFor="pPhone">Số điện thoại liên hệ</label>
                    <input
                      id="pPhone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="profile-field">
                    <label htmlFor="pRole">Sở thích / Nghề nghiệp</label>
                    <input
                      id="pRole"
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" className="button button-primary">
                    Lưu thông tin cá nhân
                  </button>
                </div>
              </form>
            </div>

            {/* Password Change Form */}
            <div className="profile-card">
              <div className="panel-section-title">
                <div>
                  <h2>Bảo mật tài khoản</h2>
                  <p>Đổi mật khẩu định kỳ để bảo vệ giỏ hàng và dữ liệu đơn hàng</p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="profile-form">
                <div className="profile-form-row">
                  <div className="profile-field">
                    <label htmlFor="pOldPass">Mật khẩu hiện tại</label>
                    <input
                      id="pOldPass"
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div className="profile-field">
                    <label htmlFor="pNewPass">Mật khẩu mới (tối thiểu 6 ký tự)</label>
                    <input
                      id="pNewPass"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" className="button button-outline">
                    <Lock size={15} /> Đổi mật khẩu
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab 2: Addresses */}
        {activeTab === "addresses" && (
          <div className="account-panel">
            <div className="panel-section-title">
              <div>
                <h2>Sổ địa chỉ giao hàng</h2>
                <p>Quản lý các địa chỉ nhận hàng để thanh toán nhanh hơn</p>
              </div>
              <button
                type="button"
                className="button button-primary"
                onClick={() => setIsAddAddressOpen(true)}
              >
                <Plus size={16} /> Thêm địa chỉ mới
              </button>
            </div>

            <div className="addresses-grid">
              {addresses.map((addr) => (
                <article
                  key={addr.id}
                  className={`address-card ${addr.isDefault ? "is-default" : ""}`}
                >
                  <div className="address-card-header">
                    <span className="address-label-badge">{addr.label}</span>
                    {addr.isDefault && (
                      <span className="address-default-badge">
                        <CheckCircle2 size={13} /> Mặc định
                      </span>
                    )}
                  </div>
                  <h3 className="address-recipient">{addr.recipientName}</h3>
                  <span className="address-phone">{addr.phone}</span>
                  <p className="address-text">{addr.address}</p>

                  <div className="address-card-actions">
                    {!addr.isDefault ? (
                      <button
                        type="button"
                        className="set-default-btn"
                        onClick={() => handleSetDefaultAddress(addr.id)}
                      >
                        Đặt làm mặc định
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: "#15803d", fontWeight: 600 }}>
                        Địa chỉ ưu tiên
                      </span>
                    )}
                    <button
                      type="button"
                      className="delete-address-btn"
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
          <div className="account-panel">
            <div className="panel-section-title">
              <div>
                <h2>Cấu hình PC đã lưu</h2>
                <p>Các dàn máy bạn đã thiết kế trên công cụ Tự ráp PC (Builder)</p>
              </div>
              <Link href="/builder" className="button button-primary">
                <Plus size={16} /> Tự ráp cấu hình mới
              </Link>
            </div>

            {builds.length > 0 ? (
              <div className="saved-builds-list">
                {builds.map((build) => (
                  <article key={build.id} className="saved-build-card">
                    <div className="saved-build-header">
                      <div className="saved-build-title">
                        <h3>{build.name}</h3>
                        <div className="saved-build-meta">
                          <span>Lưu ngày: {formatAccountDate(build.createdAt)}</span>
                          <span>·</span>
                          <span>{build.components.length} linh kiện</span>
                          <span>·</span>
                          <span style={{ color: "#15803d", fontWeight: 700 }}>
                            ✓ Tương thích 100%
                          </span>
                        </div>
                      </div>

                      <div className="saved-build-price-box">
                        <div className="saved-build-price">
                          {formatPrice(build.totalPrice)}
                        </div>
                        <span className="saved-build-watt">
                          Ước lượng: {build.estimatedWattage}W
                        </span>
                      </div>
                    </div>

                    <div className="saved-build-items-preview">
                      {build.components.map((c, idx) => (
                        <div key={idx} className="saved-build-item">
                          <span>{c.slotLabel}</span>
                          <strong title={c.name}>{c.name}</strong>
                        </div>
                      ))}
                    </div>

                    <div className="saved-build-actions">
                      <button
                        type="button"
                        className="button button-outline"
                        onClick={() => handleDeleteBuild(build.id)}
                      >
                        <Trash2 size={14} /> Xóa
                      </button>
                      <Link
                        href="/builder"
                        className="button button-outline"
                      >
                        Nạp vào Builder
                      </Link>
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() => handleAddBuildToCart(build.components)}
                      >
                        <ShoppingCart size={15} /> Thêm cả dàn vào giỏ
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="community-empty">
                <h3>Bạn chưa lưu cấu hình PC nào</h3>
                <p>Hãy trải nghiệm công cụ Tự ráp PC để thiết kế cấu hình tối ưu.</p>
                <Link href="/builder" className="button button-primary">
                  Khám phá PC Builder ngay
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Setups */}
        {activeTab === "setups" && (
          <div className="account-panel">
            <div className="panel-section-title">
              <div>
                <h2>Góc máy của tôi</h2>
                <p>Các không gian làm việc bạn đã chia sẻ lên cộng đồng</p>
              </div>
              <Link href="/community" className="button button-primary">
                <Camera size={16} /> Chia sẻ góc máy mới
              </Link>
            </div>

            <div className="setups-grid">
              {userSetups.map((post) => (
                <article key={post.id} className="setup-card">
                  <Link href={`/community/${post.id}`} className="setup-card-cover-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="setup-card-cover"
                    />
                    <span className="setup-card-tag">{post.style}</span>
                  </Link>

                  <div className="setup-card-body">
                    <h3 className="setup-card-title">
                      <Link href={`/community/${post.id}`}>{post.title}</Link>
                    </h3>
                    <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 14px" }}>
                      {post.description.slice(0, 100)}...
                    </p>
                    <div className="setup-card-footer">
                      <span>Đã đăng: {formatAccountDate(post.createdAt)}</span>
                      <Link href={`/community/${post.id}`} style={{ fontWeight: 600, color: "var(--blue)" }}>
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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content address-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="address-modal-header">
          <h2>Thêm địa chỉ giao hàng</h2>
          <button
            type="button"
            className="picker-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="address-form">
          <div className="profile-field">
            <label htmlFor="addrLabel">Tên gợi nhớ (Nhãn)</label>
            <input
              id="addrLabel"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="VD: Nhà riêng, Công ty, Kho..."
              required
            />
          </div>

          <div className="profile-form-row">
            <div className="profile-field">
              <label htmlFor="addrRecipient">Người nhận</label>
              <input
                id="addrRecipient"
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
              />
            </div>
            <div className="profile-field">
              <label htmlFor="addrPhone">Số điện thoại</label>
              <input
                id="addrPhone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="profile-field">
            <label htmlFor="addrText">Địa chỉ chi tiết</label>
            <input
              id="addrText"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành..."
              required
            />
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            <span>Đặt làm địa chỉ nhận hàng mặc định</span>
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
            <button
              type="button"
              className="button button-outline"
              onClick={onClose}
            >
              Hủy
            </button>
            <button type="submit" className="button button-primary">
              Lưu địa chỉ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

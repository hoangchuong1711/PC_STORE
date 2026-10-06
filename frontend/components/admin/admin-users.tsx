"use client";

import { useId, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Eye,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import {
  type AdminUser,
  type AdminUserFilters,
  initialAdminUsers,
  filterAdminUsers,
} from "@/lib/admin-users";
import "./admin.css";

const initialFilters: AdminUserFilters = {
  query: "",
  role: "ALL",
  status: "ALL",
};

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>(initialAdminUsers);
  const [filters, setFilters] = useState<AdminUserFilters>(initialFilters);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banError, setBanError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredUsers = filterAdminUsers(users, filters);

  const stats = {
    total: users.length,
    customers: users.filter((u) => u.role === "CUSTOMER").length,
    staffAndAdmins: users.filter((u) => u.role === "ADMIN" || u.role === "STAFF").length,
    banned: users.filter((u) => u.status === "BANNED").length,
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenBanModal = (user: AdminUser) => {
    setSelectedUser(user);
    setBanReason("");
    setBanError("");
    setIsBanModalOpen(true);
  };

  const handleConfirmBan = () => {
    if (!banReason.trim()) {
      setBanError("Vui lòng nhập lý do khóa tài khoản.");
      return;
    }
    if (!selectedUser) return;

    const now = new Date().toISOString();
    const updated = users.map((u) =>
      u.id === selectedUser.id
        ? {
            ...u,
            status: "BANNED" as const,
            banReason: banReason.trim(),
            bannedAt: now,
            bannedBy: "Quản trị viên",
          }
        : u,
    );

    setUsers(updated);
    setSelectedUser(updated.find((u) => u.id === selectedUser.id) || null);
    setIsBanModalOpen(false);
    showToast(`Đã khóa tài khoản "${selectedUser.name}".`);
  };

  const handleUnbanUser = (user: AdminUser) => {
    const updated = users.map((u) =>
      u.id === user.id
        ? {
            ...u,
            status: "ACTIVE" as const,
            banReason: undefined,
            bannedAt: undefined,
            bannedBy: undefined,
          }
        : u,
    );

    setUsers(updated);
    setSelectedUser(updated.find((u) => u.id === user.id) || null);
    showToast(`Đã mở khóa tài khoản cho "${user.name}".`);
  };

  const handleChangeRole = (userId: string, newRole: AdminUser["role"]) => {
    const updated = users.map((u) => (u.id === userId ? { ...u, role: newRole } : u));
    setUsers(updated);
    if (selectedUser?.id === userId) {
      setSelectedUser({ ...selectedUser, role: newRole });
    }
    showToast(`Đã đổi vai trò người dùng sang ${newRole}.`);
  };

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat("vi-VN").format(val) + " đ";
  };

  return (
    <div className="admin-page">
      {/* Toast Alert */}
      {toastMessage && (
        <aside aria-label="Thông báo thao tác" aria-live="polite" className="admin-toast">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </aside>
      )}

      {/* Header */}
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">TÀI KHOẢN & PHÂN QUYỀN</span>
          <h1>Quản lý Người dùng & Khách hàng</h1>
          <p>Hồ sơ người dùng, tổng tích lũy đơn hàng, phân quyền nhân sự và kiểm soát an ninh.</p>
        </div>
      </div>

      {/* Metric Cards */}
      <section className="admin-stat-grid" aria-label="Chỉ số người dùng">
        <article className="admin-stat-card">
          <div className="admin-stat-icon is-blue">
            <Users size={18} />
          </div>
          <div className="admin-stat-copy">
            <span>Tổng người dùng</span>
            <strong>{stats.total}</strong>
            <small>Tài khoản hệ thống</small>
          </div>
        </article>

        <article className="admin-stat-card">
          <div className="admin-stat-icon is-green">
            <UserCheck size={18} />
          </div>
          <div className="admin-stat-copy">
            <span>Khách mua lẻ</span>
            <strong>{stats.customers}</strong>
            <small>Đã từng mua sắm</small>
          </div>
        </article>

        <article className="admin-stat-card">
          <div className="admin-stat-icon is-amber">
            <Shield size={18} />
          </div>
          <div className="admin-stat-copy">
            <span>Nhân sự & Admin</span>
            <strong>{stats.staffAndAdmins}</strong>
            <small>Phân quyền vận hành</small>
          </div>
        </article>

        <article className="admin-stat-card">
          <div className="admin-stat-icon is-red">
            <Ban size={18} />
          </div>
          <div className="admin-stat-copy">
            <span>Tài khoản bị khóa</span>
            <strong style={{ color: stats.banned > 0 ? "var(--admin-red)" : "inherit" }}>
              {stats.banned}
            </strong>
            <small>Vi phạm chính sách</small>
          </div>
        </article>
      </section>

      {/* Main Panel */}
      <section className="admin-panel admin-list-panel">
        {/* Toolbar */}
        <div className="admin-list-toolbar admin-toolbar-wrap">
          <label className="admin-search-field">
            <Search size={16} />
            <span className="sr-only">Tìm người dùng</span>
            <input
              type="search"
              placeholder="Tìm theo họ tên, email hoặc số điện thoại..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            />
          </label>

          <select
            aria-label="Lọc theo vai trò"
            value={filters.role}
            onChange={(e) =>
              setFilters({
                ...filters,
                role: e.target.value as AdminUserFilters["role"],
              })
            }
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="CUSTOMER">Khách hàng</option>
            <option value="STAFF">Nhân viên kỹ thuật</option>
            <option value="ADMIN">Quản trị viên</option>
          </select>

          <select
            aria-label="Lọc theo trạng thái"
            value={filters.status}
            onChange={(e) =>
              setFilters({
                ...filters,
                status: e.target.value as AdminUserFilters["status"],
              })
            }
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="BANNED">Đã bị khóa</option>
          </select>

          {(filters.query || filters.role !== "ALL" || filters.status !== "ALL") && (
            <button
              type="button"
              className="admin-filter-reset"
              onClick={() => setFilters(initialFilters)}
            >
              <RotateCcw size={15} />
              Đặt lại
            </button>
          )}
        </div>

        {/* Users Table */}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 220 }}>Họ và tên</th>
                <th style={{ width: 210 }}>Thông tin liên hệ</th>
                <th style={{ width: 130 }}>Vai trò</th>
                <th style={{ width: 130 }}>Trạng thái</th>
                <th style={{ width: 160 }}>Đơn hàng / Chi tiêu</th>
                <th style={{ width: 120 }}>Ngày tạo</th>
                <th style={{ width: 130 }} className="align-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px 16px", color: "var(--admin-soft)" }}>
                    Không tìm thấy người dùng phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-user-avatar">
                          {user.avatarUrl ? (
                            <Image
                              src={user.avatarUrl}
                              alt={user.name}
                              fill
                              unoptimized
                              sizes="34px"
                              style={{ objectFit: "cover" }}
                            />
                          ) : (
                            user.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <strong className="admin-table-primary">{user.name}</strong>
                          <small className="admin-table-secondary">ID: {user.id}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12, color: "var(--admin-ink)", fontWeight: 550 }}>{user.email}</div>
                      <small className="admin-table-secondary">{user.phone}</small>
                    </td>
                    <td>
                      {user.role === "ADMIN" && (
                        <span className="admin-status-pill is-info" style={{ display: "inline-flex", gap: 4 }}>
                          <Shield size={11} /> Admin
                        </span>
                      )}
                      {user.role === "STAFF" && (
                        <span className="admin-status-pill is-warning">
                          Nhân viên
                        </span>
                      )}
                      {user.role === "CUSTOMER" && (
                        <span className="admin-status-pill is-muted">Khách hàng</span>
                      )}
                    </td>
                    <td>
                      {user.status === "ACTIVE" ? (
                        <span className="admin-status-pill is-success">Hoạt động</span>
                      ) : (
                        <span className="admin-status-pill is-danger">Bị khóa</span>
                      )}
                    </td>
                    <td>
                      <strong style={{ color: "var(--admin-ink)", fontVariantNumeric: "tabular-nums" }}>
                        {formatVnd(user.totalSpent)}
                      </strong>
                      <small className="admin-table-secondary">{user.orderCount} đơn hàng</small>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--admin-muted)" }}>
                        {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    </td>
                    <td className="align-right">
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          className="admin-table-action"
                          onClick={() => setSelectedUser(user)}
                          title="Xem hồ sơ"
                        >
                          <Eye size={13} /> Xem
                        </button>
                        {user.status === "ACTIVE" ? (
                          <button
                            type="button"
                            className="admin-table-action"
                            style={{ color: "var(--admin-red)" }}
                            onClick={() => handleOpenBanModal(user)}
                            disabled={user.role === "ADMIN"}
                            title={user.role === "ADMIN" ? "Không thể khóa tài khoản Admin" : "Khóa tài khoản"}
                          >
                            <Ban size={13} /> Khóa
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-table-action"
                            style={{ color: "var(--admin-green)" }}
                            onClick={() => handleUnbanUser(user)}
                            title="Mở khóa tài khoản"
                          >
                            <RotateCcw size={13} /> Mở
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detail Drawer */}
      {selectedUser && (
        <div className="admin-drawer-layer">
          <button
            type="button"
            className="admin-drawer-overlay"
            aria-label="Đóng hồ sơ"
            onClick={() => setSelectedUser(null)}
          />
          <aside
            aria-label="Hồ sơ tài khoản"
            className="admin-drawer"
            style={{ maxWidth: 520 }}
          >
            <div className="admin-drawer-heading">
              <div>
                <span className="admin-panel-kicker">Mã #{selectedUser.id}</span>
                <h2>Hồ sơ người dùng</h2>
              </div>
              <button
                type="button"
                className="admin-icon-button"
                aria-label="Đóng"
                onClick={() => setSelectedUser(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
              {/* Profile Card */}
              <div
                style={{
                  padding: 16,
                  backgroundColor: "var(--admin-bg)",
                  borderRadius: 8,
                  marginBottom: 16,
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    backgroundColor: "#cbd5e1",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--admin-ink)",
                    position: "relative",
                  }}
                >
                  {selectedUser.avatarUrl ? (
                    <Image
                      src={selectedUser.avatarUrl}
                      alt={selectedUser.name}
                      fill
                      unoptimized
                      sizes="48px"
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    selectedUser.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--admin-ink)" }}>{selectedUser.name}</div>
                  <div style={{ fontSize: 12, color: "var(--admin-muted)" }}>{selectedUser.email}</div>
                  <div style={{ fontSize: 12, color: "var(--admin-soft)" }}>{selectedUser.phone}</div>
                </div>
              </div>

              {/* Statistics */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div style={{ padding: 12, border: "1px solid var(--admin-line)", borderRadius: 8, background: "#fff" }}>
                  <div style={{ fontSize: 10, color: "var(--admin-soft)", textTransform: "uppercase", fontWeight: 700 }}>Tổng đơn hàng</div>
                  <div style={{ fontSize: 18, fontWeight: 780, marginTop: 4, color: "var(--admin-ink)" }}>{selectedUser.orderCount} đơn</div>
                </div>
                <div style={{ padding: 12, border: "1px solid var(--admin-line)", borderRadius: 8, background: "#fff" }}>
                  <div style={{ fontSize: 10, color: "var(--admin-soft)", textTransform: "uppercase", fontWeight: 700 }}>Tổng chi tiêu</div>
                  <div style={{ fontSize: 18, fontWeight: 780, marginTop: 4, color: "var(--admin-green)", fontVariantNumeric: "tabular-nums" }}>
                    {formatVnd(selectedUser.totalSpent)}
                  </div>
                </div>
              </div>

              {/* Account Role Setting */}
              <div style={{ marginBottom: 16, padding: 14, border: "1px solid var(--admin-line)", borderRadius: 8, background: "#fff" }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, color: "var(--admin-ink)" }}>
                  <ShieldCheck size={16} /> Phân quyền & Vai trò
                </div>
                <select
                  style={{ width: "100%", height: 38, border: "1px solid var(--admin-line)", borderRadius: 7, padding: "0 10px", fontSize: 13 }}
                  value={selectedUser.role}
                  onChange={(e) => handleChangeRole(selectedUser.id, e.target.value as AdminUser["role"])}
                >
                  <option value="CUSTOMER">Khách hàng tiêu chuẩn</option>
                  <option value="STAFF">Nhân viên kỹ thuật (Quản lý đơn/sản phẩm)</option>
                  <option value="ADMIN">Quản trị viên cấp cao (Toàn quyền)</option>
                </select>
                <div style={{ fontSize: 11, color: "var(--admin-soft)", marginTop: 6 }}>
                  Thay đổi vai trò sẽ có hiệu lực ngay lập tức trong phiên làm việc của người dùng.
                </div>
              </div>

              {/* Timestamps */}
              <div style={{ fontSize: 12, color: "var(--admin-muted)", marginBottom: 16, lineHeight: 1.6 }}>
                <div>Ngày đăng ký: {new Date(selectedUser.createdAt).toLocaleString("vi-VN")}</div>
                {selectedUser.lastLoginAt && (
                  <div>Đăng nhập gần nhất: {new Date(selectedUser.lastLoginAt).toLocaleString("vi-VN")}</div>
                )}
              </div>

              {/* Ban Banner if banned */}
              {selectedUser.status === "BANNED" && (
                <div
                  style={{
                    padding: 12,
                    backgroundColor: "var(--admin-red-soft)",
                    border: "1px solid #fecaca",
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", gap: 6, alignItems: "center", color: "var(--admin-red)", fontWeight: 700, fontSize: 12 }}>
                    <AlertTriangle size={14} /> Tài khoản đang bị khóa
                  </div>
                  <div style={{ fontSize: 12, color: "#7f1d1d", marginTop: 4 }}>
                    <strong>Lý do:</strong> {selectedUser.banReason || "Chưa có lý do ghi nhận"}
                  </div>
                  {selectedUser.bannedAt && (
                    <div style={{ fontSize: 10, color: "var(--admin-red)", marginTop: 4 }}>
                      Khóa bởi: {selectedUser.bannedBy || "Quản trị viên"} • {new Date(selectedUser.bannedAt).toLocaleString("vi-VN")}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="admin-drawer-actions">
              <button
                type="button"
                className="admin-button admin-button-secondary"
                onClick={() => setSelectedUser(null)}
              >
                Đóng
              </button>
              {selectedUser.status === "ACTIVE" ? (
                <button
                  type="button"
                  className="admin-button admin-button-danger"
                  onClick={() => handleOpenBanModal(selectedUser)}
                  disabled={selectedUser.role === "ADMIN"}
                >
                  <Ban size={15} /> Khóa tài khoản
                </button>
              ) : (
                <button
                  type="button"
                  className="admin-button admin-button-primary"
                  onClick={() => handleUnbanUser(selectedUser)}
                >
                  <RotateCcw size={15} /> Mở khóa tài khoản
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Ban Reason Dialog */}
      {isBanModalOpen && selectedUser && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ban-modal-title">
          <div className="admin-modal-card" style={{ maxWidth: 460 }}>
            <div className="admin-modal-header">
              <div className="admin-modal-icon is-danger">
                <Ban size={18} />
              </div>
              <div>
                <h3 id="ban-modal-title">Khóa tài khoản người dùng</h3>
                <p>Khách hàng: <strong>{selectedUser.name}</strong> ({selectedUser.email})</p>
              </div>
            </div>

            <div className="admin-modal-body">
              <p className="admin-modal-warning-text">
                Tài khoản này sẽ bị thu hồi quyền truy cập và không thể đặt đơn hàng mới. Vui lòng ghi rõ nguyên nhân khóa:
              </p>

              <label className="admin-modal-field">
                <span>Lý do khóa tài khoản <span style={{ color: "var(--admin-red)" }}>*</span></span>
                <textarea
                  className="admin-form-textarea"
                  rows={3}
                  placeholder="Ví dụ: Boom hàng liên tục, spam bình luận, tài khoản nghi vấn gian lận..."
                  value={banReason}
                  onChange={(e) => {
                    setBanReason(e.target.value);
                    if (banError) setBanError("");
                  }}
                  autoFocus
                />
                {banError && (
                  <small style={{ color: "var(--admin-red)", fontSize: 11, marginTop: 4 }}>{banError}</small>
                )}
              </label>
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-button admin-button-secondary"
                onClick={() => setIsBanModalOpen(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="admin-button admin-button-danger"
                onClick={handleConfirmBan}
              >
                Xác nhận khóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

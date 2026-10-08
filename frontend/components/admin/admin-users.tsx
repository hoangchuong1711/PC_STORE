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
    <div className="max-w-[1250px] mx-auto font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <aside aria-label="Thông báo thao tác" aria-live="polite" className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </aside>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-7">
        <div>
          <span className="block text-[10px] font-bold text-admin-soft tracking-wider uppercase">TÀI KHOẢN & PHÂN QUYỀN</span>
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-admin-ink tracking-tight mt-1 mb-1.5 leading-tight">Quản lý Người dùng & Khách hàng</h1>
          <p className="text-sm text-admin-muted max-w-[570px] m-0">Hồ sơ người dùng, tổng tích lũy đơn hàng, phân quyền nhân sự và kiểm soát an ninh.</p>
        </div>
      </div>

      {/* Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5" aria-label="Chỉ số người dùng">
        <article className="flex items-center gap-3.5 min-h-[86px] p-4 rounded-xl border border-admin-line bg-admin-surface shadow-xs">
          <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-lg bg-admin-blue-soft text-admin-blue">
            <Users size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-admin-muted">Tổng người dùng</span>
            <strong className="block text-xl sm:text-2xl font-extrabold text-admin-ink tracking-tight my-0.5 font-mono">{stats.total}</strong>
            <small className="block text-[10px] text-admin-soft">Tài khoản hệ thống</small>
          </div>
        </article>

        <article className="flex items-center gap-3.5 min-h-[86px] p-4 rounded-xl border border-admin-line bg-admin-surface shadow-xs">
          <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-lg bg-admin-green-soft text-admin-green">
            <UserCheck size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-admin-muted">Khách mua lẻ</span>
            <strong className="block text-xl sm:text-2xl font-extrabold text-admin-ink tracking-tight my-0.5 font-mono">{stats.customers}</strong>
            <small className="block text-[10px] text-admin-soft">Đã từng mua sắm</small>
          </div>
        </article>

        <article className="flex items-center gap-3.5 min-h-[86px] p-4 rounded-xl border border-admin-line bg-admin-surface shadow-xs">
          <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-lg bg-admin-amber-soft text-admin-amber">
            <Shield size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-admin-muted">Nhân sự & Admin</span>
            <strong className="block text-xl sm:text-2xl font-extrabold text-admin-ink tracking-tight my-0.5 font-mono">{stats.staffAndAdmins}</strong>
            <small className="block text-[10px] text-admin-soft">Phân quyền vận hành</small>
          </div>
        </article>

        <article className="flex items-center gap-3.5 min-h-[86px] p-4 rounded-xl border border-admin-line bg-admin-surface shadow-xs">
          <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-lg bg-admin-red-soft text-admin-red">
            <Ban size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-admin-muted">Tài khoản bị khóa</span>
            <strong className={`block text-xl sm:text-2xl font-extrabold tracking-tight my-0.5 font-mono ${stats.banned > 0 ? "text-admin-red" : "text-admin-ink"}`}>
              {stats.banned}
            </strong>
            <small className="block text-[10px] text-admin-soft">Vi phạm chính sách</small>
          </div>
        </article>
      </section>

      {/* Main Panel */}
      <section className="rounded-xl border border-admin-line bg-admin-surface overflow-hidden">
        {/* Toolbar */}
        <div className="p-3.5 border-b border-admin-line bg-white flex flex-wrap items-center gap-3">
          <label className="relative flex items-center flex-1 min-w-[220px] max-w-sm">
            <Search size={16} className="absolute left-3 text-admin-soft pointer-events-none" />
            <span className="sr-only">Tìm người dùng</span>
            <input
              type="search"
              placeholder="Tìm theo họ tên, email hoặc số điện thoại..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink placeholder:text-admin-soft focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue transition-colors"
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
            className="h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue cursor-pointer"
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
            className="h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="BANNED">Đã bị khóa</option>
          </select>

          {(filters.query || filters.role !== "ALL" || filters.status !== "ALL") && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-admin-line bg-white text-xs font-semibold text-admin-muted hover:bg-admin-bg hover:text-admin-ink transition-colors cursor-pointer"
              onClick={() => setFilters(initialFilters)}
            >
              <RotateCcw size={15} />
              Đặt lại
            </button>
          )}
        </div>

        {/* Users Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30 w-56">Họ và tên</th>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30 w-52">Thông tin liên hệ</th>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30 w-32">Vai trò</th>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30 w-32">Trạng thái</th>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30 w-40">Đơn hàng / Chi tiêu</th>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30 w-32">Ngày tạo</th>
                <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30 w-32 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-admin-soft">
                    Không tìm thấy người dùng phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-admin-bg/40 transition-colors">
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                      <div className="flex items-center gap-3">
                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-200 grid place-items-center text-xs font-bold text-admin-ink border border-admin-line">
                          {user.avatarUrl ? (
                            <Image
                              src={user.avatarUrl}
                              alt={user.name}
                              fill
                              unoptimized
                              sizes="34px"
                              className="object-cover"
                            />
                          ) : (
                            user.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <strong className="block text-xs font-bold text-admin-ink">{user.name}</strong>
                          <small className="block text-[10px] text-admin-soft">ID: {user.id}</small>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                      <div className="text-xs text-admin-ink font-medium">{user.email}</div>
                      <small className="block text-[10px] text-admin-soft">{user.phone}</small>
                    </td>
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                      {user.role === "ADMIN" && (
                        <span className="inline-flex items-center gap-1 min-h-[22px] px-2 rounded text-[10px] font-bold bg-admin-blue-soft text-admin-blue whitespace-nowrap">
                          <Shield size={11} /> Admin
                        </span>
                      )}
                      {user.role === "STAFF" && (
                        <span className="inline-flex items-center min-h-[22px] px-2 rounded text-[10px] font-bold bg-admin-amber-soft text-admin-amber whitespace-nowrap">
                          Nhân viên
                        </span>
                      )}
                      {user.role === "CUSTOMER" && (
                        <span className="inline-flex items-center min-h-[22px] px-2 rounded text-[10px] font-bold bg-slate-100 text-slate-500 whitespace-nowrap">
                          Khách hàng
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                      {user.status === "ACTIVE" ? (
                        <span className="inline-flex items-center min-h-[22px] px-2 rounded text-[10px] font-bold bg-admin-green-soft text-admin-green whitespace-nowrap">
                          Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center min-h-[22px] px-2 rounded text-[10px] font-bold bg-admin-red-soft text-admin-red whitespace-nowrap">
                          Bị khóa
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                      <strong className="block text-xs font-bold text-admin-ink font-mono">
                        {formatVnd(user.totalSpent)}
                      </strong>
                      <small className="block text-[10px] text-admin-soft">{user.orderCount} đơn hàng</small>
                    </td>
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle text-xs text-admin-muted whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-admin-blue hover:bg-admin-blue-soft transition-colors cursor-pointer"
                          onClick={() => setSelectedUser(user)}
                          title="Xem hồ sơ"
                        >
                          <Eye size={13} /> Xem
                        </button>
                        {user.status === "ACTIVE" ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-admin-red hover:bg-admin-red-soft transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            onClick={() => handleOpenBanModal(user)}
                            disabled={user.role === "ADMIN"}
                            title={user.role === "ADMIN" ? "Không thể khóa tài khoản Admin" : "Khóa tài khoản"}
                          >
                            <Ban size={13} /> Khóa
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-admin-green hover:bg-admin-green-soft transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="fixed inset-0 bg-black/40 backdrop-blur-xs border-0 cursor-pointer"
            aria-label="Đóng hồ sơ"
            onClick={() => setSelectedUser(null)}
          />
          <aside
            aria-label="Hồ sơ tài khoản"
            className="relative z-10 w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-admin-line">
              <div>
                <span className="block text-[10px] font-bold text-admin-soft tracking-wider uppercase">Mã #{selectedUser.id}</span>
                <h2 className="text-base font-bold text-admin-ink mt-0.5">Hồ sơ người dùng</h2>
              </div>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg border border-transparent text-admin-muted hover:border-admin-line hover:bg-admin-bg hover:text-admin-ink cursor-pointer"
                aria-label="Đóng"
                onClick={() => setSelectedUser(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
              {/* Profile Card */}
              <div className="flex items-center gap-3.5 p-4 bg-admin-bg rounded-xl border border-admin-line">
                <div className="relative h-12 w-12 shrink-0 rounded-full bg-slate-300 overflow-hidden grid place-items-center text-base font-bold text-admin-ink border border-admin-line">
                  {selectedUser.avatarUrl ? (
                    <Image
                      src={selectedUser.avatarUrl}
                      alt={selectedUser.name}
                      fill
                      unoptimized
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    selectedUser.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="text-base font-bold text-admin-ink">{selectedUser.name}</div>
                  <div className="text-xs text-admin-muted">{selectedUser.email}</div>
                  <div className="text-xs text-admin-soft">{selectedUser.phone}</div>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border border-admin-line rounded-lg bg-white">
                  <div className="text-[10px] text-admin-soft uppercase font-bold">Tổng đơn hàng</div>
                  <div className="text-lg font-extrabold mt-1 text-admin-ink">{selectedUser.orderCount} đơn</div>
                </div>
                <div className="p-3 border border-admin-line rounded-lg bg-white">
                  <div className="text-[10px] text-admin-soft uppercase font-bold">Tổng chi tiêu</div>
                  <div className="text-lg font-extrabold mt-1 text-admin-green font-mono">
                    {formatVnd(selectedUser.totalSpent)}
                  </div>
                </div>
              </div>

              {/* Account Role Setting */}
              <div className="p-3.5 border border-admin-line rounded-lg bg-white flex flex-col gap-2">
                <div className="text-xs font-bold flex items-center gap-1.5 text-admin-ink">
                  <ShieldCheck size={16} /> Phân quyền & Vai trò
                </div>
                <select
                  className="w-full h-9 rounded-lg border border-admin-line px-2.5 text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue bg-white cursor-pointer"
                  value={selectedUser.role}
                  onChange={(e) => handleChangeRole(selectedUser.id, e.target.value as AdminUser["role"])}
                >
                  <option value="CUSTOMER">Khách hàng tiêu chuẩn</option>
                  <option value="STAFF">Nhân viên kỹ thuật (Quản lý đơn/sản phẩm)</option>
                  <option value="ADMIN">Quản trị viên cấp cao (Toàn quyền)</option>
                </select>
                <div className="text-[11px] text-admin-soft">
                  Thay đổi vai trò sẽ có hiệu lực ngay lập tức trong phiên làm việc của người dùng.
                </div>
              </div>

              {/* Timestamps */}
              <div className="text-xs text-admin-muted leading-relaxed">
                <div>Ngày đăng ký: {new Date(selectedUser.createdAt).toLocaleString("vi-VN")}</div>
                {selectedUser.lastLoginAt && (
                  <div>Đăng nhập gần nhất: {new Date(selectedUser.lastLoginAt).toLocaleString("vi-VN")}</div>
                )}
              </div>

              {/* Ban Banner if banned */}
              {selectedUser.status === "BANNED" && (
                <div className="p-3 bg-admin-red-soft border border-rose-200 rounded-lg">
                  <div className="flex gap-1.5 items-center text-admin-red font-bold text-xs">
                    <AlertTriangle size={14} /> Tài khoản đang bị khóa
                  </div>
                  <div className="text-xs text-rose-950 mt-1">
                    <strong>Lý do:</strong> {selectedUser.banReason || "Chưa có lý do ghi nhận"}
                  </div>
                  {selectedUser.bannedAt && (
                    <div className="text-[10px] text-admin-red mt-1">
                      Khóa bởi: {selectedUser.bannedBy || "Quản trị viên"} • {new Date(selectedUser.bannedAt).toLocaleString("vi-VN")}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 p-4 border-t border-admin-line mt-auto bg-admin-bg/20">
              <button
                type="button"
                className="inline-flex items-center justify-center min-h-[38px] px-4 rounded-lg text-xs font-bold border border-admin-line bg-white hover:border-[#bbc3cc] hover:bg-admin-bg text-admin-ink transition-colors cursor-pointer"
                onClick={() => setSelectedUser(null)}
              >
                Đóng
              </button>
              {selectedUser.status === "ACTIVE" ? (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-4 rounded-lg text-xs font-bold border border-rose-200 bg-admin-red-soft hover:bg-rose-100 text-admin-red transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => handleOpenBanModal(selectedUser)}
                  disabled={selectedUser.role === "ADMIN"}
                >
                  <Ban size={15} /> Khóa tài khoản
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-4 rounded-lg text-xs font-bold bg-admin-accent-dark hover:bg-[#1e252c] text-white transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="ban-modal-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-admin-line flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-admin-red-soft text-admin-red">
                <Ban size={18} />
              </div>
              <div>
                <h3 id="ban-modal-title" className="text-base font-bold text-admin-ink">Khóa tài khoản người dùng</h3>
                <p className="text-xs text-admin-muted mt-0.5">Khách hàng: <strong className="text-admin-ink">{selectedUser.name}</strong> ({selectedUser.email})</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs text-admin-muted leading-relaxed m-0">
                Tài khoản này sẽ bị thu hồi quyền truy cập và không thể đặt đơn hàng mới. Vui lòng ghi rõ nguyên nhân khóa:
              </p>

              <label className="flex flex-col gap-1.5 text-xs font-semibold text-admin-ink">
                <span>Lý do khóa tài khoản <span className="text-admin-red">*</span></span>
                <textarea
                  rows={3}
                  placeholder="Ví dụ: Boom hàng liên tục, spam bình luận, tài khoản nghi vấn gian lận..."
                  value={banReason}
                  onChange={(e) => {
                    setBanReason(e.target.value);
                    if (banError) setBanError("");
                  }}
                  autoFocus
                  className="w-full rounded-lg border border-admin-line p-2.5 text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue resize-none"
                />
                {banError && (
                  <small className="text-admin-red text-[11px] mt-0.5">{banError}</small>
                )}
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-admin-line">
              <button
                type="button"
                className="inline-flex items-center justify-center min-h-[38px] px-3.5 rounded-lg text-xs font-bold border border-admin-line bg-white hover:bg-admin-bg text-admin-ink transition-colors cursor-pointer"
                onClick={() => setIsBanModalOpen(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center min-h-[38px] px-3.5 rounded-lg text-xs font-bold border border-rose-200 bg-admin-red-soft hover:bg-rose-100 text-admin-red transition-colors cursor-pointer"
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

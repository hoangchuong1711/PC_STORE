"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Edit2, Eye, EyeOff, FolderTree, Plus, RotateCcw, Search, Tag, X } from "lucide-react";
import { componentTypes, createAdminTaxonomyApi, type ComponentType, type TaxonomyEntry, type TaxonomyInput, type TaxonomyKind, type TaxonomyStatus } from "../../lib/admin-taxonomy-api";

const api = createAdminTaxonomyApi();
const emptyForm: TaxonomyInput = { name: "", description: "", status: "ACTIVE", componentType: null, logoUrl: null };
const TAXONOMY_DRAFT_KEY = "pcstore_admin_taxonomy_draft";
const messageOf = (cause: unknown) => cause instanceof Error ? cause.message : "Không thể xử lý yêu cầu. Vui lòng thử lại.";

export function AdminCategories() {
  const [activeTab, setActiveTab] = useState<TaxonomyKind>("categories");
  const [data, setData] = useState<Record<TaxonomyKind, TaxonomyEntry[]>>({ categories: [], brands: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [editor, setEditor] = useState<{ kind: TaxonomyKind; entry: TaxonomyEntry | null } | null>(null);
  const [form, setForm] = useState<TaxonomyInput>(emptyForm);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(TAXONOMY_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.editor && parsed?.form) {
          setEditor(parsed.editor);
          setForm(parsed.form);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (editor) {
        sessionStorage.setItem(TAXONOMY_DRAFT_KEY, JSON.stringify({ editor, form }));
      } else {
        sessionStorage.removeItem(TAXONOMY_DRAFT_KEY);
      }
    } catch {}
  }, [editor, form]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.list("categories"), api.list("brands")]).then(([categories, brands]) => {
      if (!cancelled) { setData({ categories, brands }); setLoadError(""); }
    }).catch(cause => { if (!cancelled) setLoadError(messageOf(cause)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);

  function refresh() { setLoading(true); setReload(value => value + 1); }
  function open(kind: TaxonomyKind, entry: TaxonomyEntry | null) {
    setError(""); setNotice(""); setEditor({ kind, entry });
    setForm(entry ? { ...entry } : { ...emptyForm });
  }
  function close() {
    if (!saving.current) {
      try { sessionStorage.removeItem(TAXONOMY_DRAFT_KEY); } catch {}
      setEditor(null);
      setError("");
    }
  }
  function accept(kind: TaxonomyKind, entry: TaxonomyEntry) {
    setData(previous => ({ ...previous, [kind]: previous[kind].some(item => item.id === entry.id)
      ? previous[kind].map(item => item.id === entry.id ? entry : item) : [...previous[kind], entry] }));
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editor || saving.current) return;
    saving.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const entry = await api.save(editor.kind, editor.entry?.id ?? null, form);
      accept(editor.kind, entry);
      try { sessionStorage.removeItem(TAXONOMY_DRAFT_KEY); } catch {}
      setEditor(null); setNotice('Đã lưu "' + entry.name + '" vào hệ thống.');
    } catch (cause) { setError(messageOf(cause)); }
    finally { saving.current = false; setBusy(false); }
  }
  async function toggle(entry: TaxonomyEntry) {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError(""); setNotice("");
    const kind = activeTab;
    try {
      const changed = await api.setStatus(kind, entry.id, entry.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
      accept(kind, changed); setNotice('Đã cập nhật trạng thái "' + changed.name + '".');
    } catch (cause) { setError(messageOf(cause)); }
    finally { saving.current = false; setBusy(false); }
  }

  const filtered = data[activeTab].filter(entry => (entry.name + " " + (entry.description ?? "")).toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi")));
  const isCategory = activeTab === "categories";

  return (
    <div className="max-w-[1250px] mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-7">
        <div>
          <span className="block text-[10px] font-bold text-admin-soft tracking-wider uppercase">PHÂN LOẠI & ĐỐI TÁC</span>
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-admin-ink tracking-tight mt-1 mb-1.5 leading-tight">Quản lý Danh mục & Thương hiệu</h1>
          <p className="text-sm text-admin-muted max-w-[570px] m-0">Dữ liệu được lưu tại máy chủ. Ẩn danh mục/hãng sẽ ẩn các sản phẩm liên quan khỏi catalog công khai.</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 min-h-[38px] px-3.5 rounded-lg text-xs font-bold border border-admin-line bg-white hover:border-[#bbc3cc] hover:bg-admin-bg text-admin-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            disabled={loading || busy || !!editor}
            onClick={refresh}
          >
            <RotateCcw size={16} /> Tải lại
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 min-h-[38px] px-3.5 rounded-lg text-xs font-bold bg-admin-accent-dark hover:bg-[#1e252c] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            disabled={loading || busy || !!loadError}
            onClick={() => open(activeTab, null)}
          >
            <Plus size={16} />{isCategory ? "Thêm danh mục" : "Thêm thương hiệu"}
          </button>
        </div>
      </div>

      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-admin-green-soft border border-admin-green/20 p-3 text-xs font-semibold text-admin-green">
          {notice}
        </p>
      )}
      {error && !editor && (
        <p role="alert" className="mb-4 rounded-lg bg-admin-red-soft border border-admin-red/20 p-3 text-xs font-semibold text-admin-red">
          {error}
        </p>
      )}
      {loadError && (
        <p role="alert" className="mb-4 rounded-lg bg-admin-red-soft border border-admin-red/20 p-3 text-xs font-semibold text-admin-red flex items-center justify-between">
          <span>{loadError}</span>
          <button type="button" onClick={refresh} disabled={loading} className="underline font-bold cursor-pointer">
            Thử lại
          </button>
        </p>
      )}

      <section className="rounded-xl border border-admin-line bg-admin-surface overflow-hidden" aria-busy={loading}>
        <div className="flex items-center border-b border-admin-line bg-admin-bg/50 px-3 pt-2 gap-1" role="tablist" aria-label="Loại dữ liệu">
          <button
            type="button"
            role="tab"
            aria-label="Danh mục"
            aria-selected={isCategory}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold transition-colors cursor-pointer ${
              isCategory
                ? "bg-white text-admin-ink font-bold border-t-2 border-admin-blue -mb-px shadow-xs"
                : "text-admin-muted hover:text-admin-ink"
            }`}
            onClick={() => { setActiveTab("categories"); setQuery(""); }}
          >
            <FolderTree size={16} />
            Danh mục
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-admin-line text-admin-ink ml-1">
              {data.categories.length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-label="Thương hiệu"
            aria-selected={!isCategory}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold transition-colors cursor-pointer ${
              !isCategory
                ? "bg-white text-admin-ink font-bold border-t-2 border-admin-blue -mb-px shadow-xs"
                : "text-admin-muted hover:text-admin-ink"
            }`}
            onClick={() => { setActiveTab("brands"); setQuery(""); }}
          >
            <Tag size={16} />
            Thương hiệu
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-admin-line text-admin-ink ml-1">
              {data.brands.length}
            </span>
          </button>
        </div>

        <div className="p-3.5 border-b border-admin-line bg-white">
          <label className="relative flex items-center w-full max-w-sm">
            <Search size={16} className="absolute left-3 text-admin-soft pointer-events-none" />
            <span className="sr-only">Tìm kiếm</span>
            <input
              type="search"
              placeholder="Tìm theo tên, mô tả..."
              value={query}
              onChange={event => setQuery(event.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink placeholder:text-admin-soft focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue transition-colors"
            />
          </label>
        </div>

        {loading ? (
          <p role="status" className="p-8 text-center text-xs text-admin-muted">
            Đang tải dữ liệu…
          </p>
        ) : !loadError && (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr>
                  <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">Tên</th>
                  <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">Mô tả</th>
                  <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">{isCategory ? "Loại linh kiện" : "URL logo"}</th>
                  <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">Số sản phẩm</th>
                  <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">Trạng thái</th>
                  <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-admin-muted">
                      Chưa có dữ liệu phù hợp.
                    </td>
                  </tr>
                ) : (
                  filtered.map(entry => (
                    <tr key={entry.id} className="hover:bg-admin-bg/40 transition-colors">
                      <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                        <strong className="block text-xs font-bold text-admin-ink">{entry.name}</strong>
                      </td>
                      <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle text-admin-muted max-w-xs truncate">
                        {entry.description || "—"}
                      </td>
                      <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                        {isCategory ? (
                          entry.componentType ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-admin-blue-soft text-admin-blue">{entry.componentType}</span>
                          ) : "Không áp dụng"
                        ) : (
                          entry.logoUrl || "—"
                        )}
                      </td>
                      <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle font-mono">
                        {entry.productCount}
                      </td>
                      <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                        <span className={`inline-flex items-center min-h-[22px] px-2 rounded text-[10px] font-bold whitespace-nowrap ${
                          entry.status === "ACTIVE" ? "bg-admin-green-soft text-admin-green" : "bg-slate-100 text-slate-500"
                        }`}>
                          {entry.status === "ACTIVE" ? "Hoạt động" : "Đã ẩn"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={busy}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-admin-blue hover:bg-admin-blue-soft transition-colors cursor-pointer disabled:opacity-50"
                          onClick={() => open(activeTab, entry)}
                        >
                          <Edit2 size={13} /> Sửa
                        </button>{" "}
                        <button
                          type="button"
                          disabled={busy}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-admin-muted hover:bg-admin-bg hover:text-admin-ink transition-colors cursor-pointer disabled:opacity-50"
                          onClick={() => void toggle(entry)}
                        >
                          {entry.status === "ACTIVE" ? (
                            <><EyeOff size={13} /> Ẩn</>
                          ) : (
                            <><Eye size={13} /> Hiện</>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editor && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="fixed inset-0 bg-black/40 backdrop-blur-xs border-0 cursor-pointer"
            disabled={busy}
            aria-label="Đóng form"
            onClick={close}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={editor.kind === "categories" ? "Thông tin danh mục" : "Thông tin thương hiệu"}
            className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-admin-line">
              <h2 className="text-base font-bold text-admin-ink">
                {editor.entry ? "Cập nhật" : "Thêm"} {editor.kind === "categories" ? "danh mục" : "thương hiệu"}
              </h2>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg border border-transparent text-admin-muted hover:border-admin-line hover:bg-admin-bg hover:text-admin-ink cursor-pointer"
                aria-label="Đóng"
                disabled={busy}
                onClick={close}
              >
                <X size={18} />
              </button>
            </div>
            <form className="flex flex-col gap-4 text-xs font-semibold text-admin-ink flex-1" onSubmit={save}>
              {error && (
                <p role="alert" className="rounded-lg bg-admin-red-soft p-3 text-xs text-admin-red">
                  {error}
                </p>
              )}
              <label className="flex flex-col gap-1.5">
                <span>Tên</span>
                <input
                  autoFocus
                  required
                  maxLength={255}
                  disabled={busy}
                  value={form.name}
                  onChange={event => setForm({ ...form, name: event.target.value })}
                  className="w-full rounded-lg border border-admin-line p-2.5 text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span>Mô tả</span>
                <textarea
                  rows={3}
                  disabled={busy}
                  value={form.description ?? ""}
                  onChange={event => setForm({ ...form, description: event.target.value })}
                  className="w-full rounded-lg border border-admin-line p-2.5 text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue resize-none"
                />
              </label>
              {editor.kind === "categories" ? (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span>Loại linh kiện</span>
                    <select
                      disabled={busy || (editor.entry?.productCount ?? 0) > 0}
                      value={form.componentType ?? ""}
                      onChange={event => setForm({ ...form, componentType: event.target.value ? event.target.value as ComponentType : null })}
                      className="w-full rounded-lg border border-admin-line p-2.5 text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue bg-white"
                    >
                      <option value="">Không áp dụng</option>
                      {componentTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  {(editor.entry?.productCount ?? 0) > 0 && (
                    <p className="text-[11px] text-admin-soft font-normal">Không đổi loại linh kiện khi danh mục đã có sản phẩm.</p>
                  )}
                </>
              ) : (
                <label className="flex flex-col gap-1.5">
                  <span>URL logo</span>
                  <input
                    type="url"
                    maxLength={2048}
                    placeholder="https://example.com/logo.png"
                    disabled={busy}
                    value={form.logoUrl ?? ""}
                    onChange={event => setForm({ ...form, logoUrl: event.target.value || null })}
                    className="w-full rounded-lg border border-admin-line p-2.5 text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue"
                  />
                </label>
              )}
              <label className="flex flex-col gap-1.5">
                <span>Trạng thái</span>
                <select
                  disabled={busy}
                  value={form.status}
                  onChange={event => setForm({ ...form, status: event.target.value as TaxonomyStatus })}
                  className="w-full rounded-lg border border-admin-line p-2.5 text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue bg-white"
                >
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="INACTIVE">Ẩn</option>
                </select>
              </label>
              <div className="flex items-center justify-end gap-2.5 pt-4 mt-auto border-t border-admin-line">
                <button
                  type="button"
                  className="inline-flex items-center justify-center min-h-[38px] px-3.5 rounded-lg text-xs font-bold border border-admin-line bg-white hover:border-[#bbc3cc] hover:bg-admin-bg text-admin-ink transition-colors cursor-pointer"
                  disabled={busy}
                  onClick={close}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center min-h-[38px] px-3.5 rounded-lg text-xs font-bold bg-admin-accent-dark hover:bg-[#1e252c] text-white transition-colors cursor-pointer disabled:opacity-50"
                  disabled={busy}
                >
                  {busy ? "Đang lưu…" : "Lưu"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}

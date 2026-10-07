"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Edit2, Eye, EyeOff, FolderTree, Plus, RotateCcw, Search, Tag, X } from "lucide-react";
import { componentTypes, createAdminTaxonomyApi, type ComponentType, type TaxonomyEntry, type TaxonomyInput, type TaxonomyKind, type TaxonomyStatus } from "../../lib/admin-taxonomy-api";
import "./admin.css";

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

  return <div className="admin-page">
    <div className="admin-page-heading">
      <div><span className="admin-eyebrow">PHÂN LOẠI & ĐỐI TÁC</span><h1>Quản lý Danh mục & Thương hiệu</h1>
        <p>Dữ liệu được lưu tại máy chủ. Ẩn danh mục/hãng sẽ ẩn các sản phẩm liên quan khỏi catalog công khai.</p></div>
      <div className="admin-heading-actions">
        <button type="button" className="admin-button admin-button-secondary" disabled={loading || busy || !!editor} onClick={refresh}><RotateCcw size={16} /> Tải lại</button>
        <button type="button" className="admin-button admin-button-primary" disabled={loading || busy || !!loadError} onClick={() => open(activeTab, null)}>
          <Plus size={16} />{isCategory ? "Thêm danh mục" : "Thêm thương hiệu"}</button>
      </div>
    </div>
    {notice && <p role="status">{notice}</p>}
    {error && !editor && <p role="alert">{error}</p>}
    {loadError && <p role="alert">{loadError} <button type="button" onClick={refresh} disabled={loading}>Thử lại</button></p>}
    <section className="admin-panel admin-list-panel" aria-busy={loading}>
      <div className="admin-tabs-bar" role="tablist" aria-label="Loại dữ liệu">
        <button type="button" role="tab" aria-label="Danh mục" aria-selected={isCategory} className={"admin-tab-item " + (isCategory ? "is-active" : "")} onClick={() => { setActiveTab("categories"); setQuery(""); }}><FolderTree size={16} />Danh mục <span className="admin-tab-count">{data.categories.length}</span></button>
        <button type="button" role="tab" aria-label="Thương hiệu" aria-selected={!isCategory} className={"admin-tab-item " + (!isCategory ? "is-active" : "")} onClick={() => { setActiveTab("brands"); setQuery(""); }}><Tag size={16} />Thương hiệu <span className="admin-tab-count">{data.brands.length}</span></button>
      </div>
      <div className="admin-list-toolbar"><label className="admin-search-field"><Search size={16} /><span className="sr-only">Tìm kiếm</span><input type="search" placeholder="Tìm theo tên, mô tả..." value={query} onChange={event => setQuery(event.target.value)} /></label></div>
      {loading ? <p role="status">Đang tải dữ liệu…</p> : !loadError && <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>Tên</th><th>Mô tả</th><th>{isCategory ? "Loại linh kiện" : "URL logo"}</th><th>Số sản phẩm</th><th>Trạng thái</th><th className="align-right">Thao tác</th></tr></thead>
        <tbody>{filtered.length === 0 ? <tr><td colSpan={6}>Chưa có dữ liệu phù hợp.</td></tr> : filtered.map(entry => <tr key={entry.id}>
          <td><strong className="admin-table-primary">{entry.name}</strong></td><td>{entry.description || "—"}</td>
          <td>{isCategory ? entry.componentType || "Không áp dụng" : entry.logoUrl || "—"}</td><td>{entry.productCount}</td>
          <td><span className={"admin-status-pill " + (entry.status === "ACTIVE" ? "is-success" : "is-muted")}>{entry.status === "ACTIVE" ? "Hoạt động" : "Đã ẩn"}</span></td>
          <td className="align-right"><button type="button" disabled={busy} className="admin-table-action" onClick={() => open(activeTab, entry)}><Edit2 size={13} /> Sửa</button>{" "}
            <button type="button" disabled={busy} className="admin-table-action" onClick={() => void toggle(entry)}>{entry.status === "ACTIVE" ? <><EyeOff size={13} /> Ẩn</> : <><Eye size={13} /> Hiện</>}</button></td>
        </tr>)}</tbody>
      </table></div>}
    </section>
    {editor && <div className="admin-drawer-layer">
      <button type="button" className="admin-drawer-overlay" disabled={busy} aria-label="Đóng form" onClick={close} />
      <aside role="dialog" aria-modal="true" aria-label={editor.kind === "categories" ? "Thông tin danh mục" : "Thông tin thương hiệu"} className="admin-drawer">
        <div className="admin-drawer-heading"><h2>{editor.entry ? "Cập nhật" : "Thêm"} {editor.kind === "categories" ? "danh mục" : "thương hiệu"}</h2><button type="button" className="admin-icon-button" aria-label="Đóng" disabled={busy} onClick={close}><X size={18} /></button></div>
        <form className="admin-form" onSubmit={save}>
          {error && <p role="alert">{error}</p>}
          <label>Tên<input autoFocus required maxLength={255} disabled={busy} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
          <label>Mô tả<textarea className="admin-form-textarea" rows={3} disabled={busy} value={form.description ?? ""} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
          {editor.kind === "categories" ? <>
            <label>Loại linh kiện<select disabled={busy || (editor.entry?.productCount ?? 0) > 0} value={form.componentType ?? ""} onChange={event => setForm({ ...form, componentType: event.target.value ? event.target.value as ComponentType : null })}>
              <option value="">Không áp dụng</option>{componentTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select></label>
            {(editor.entry?.productCount ?? 0) > 0 && <p>Không đổi loại linh kiện khi danh mục đã có sản phẩm.</p>}
          </> : <label>URL logo<input type="url" maxLength={2048} placeholder="https://example.com/logo.png" disabled={busy} value={form.logoUrl ?? ""} onChange={event => setForm({ ...form, logoUrl: event.target.value || null })} /></label>}
          <label>Trạng thái<select disabled={busy} value={form.status} onChange={event => setForm({ ...form, status: event.target.value as TaxonomyStatus })}><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Ẩn</option></select></label>
          <div className="admin-drawer-actions"><button type="button" className="admin-button admin-button-secondary" disabled={busy} onClick={close}>Hủy bỏ</button><button type="submit" className="admin-button admin-button-primary" disabled={busy}>{busy ? "Đang lưu…" : "Lưu"}</button></div>
        </form>
      </aside>
    </div>}
  </div>;
}

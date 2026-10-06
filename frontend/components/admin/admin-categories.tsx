"use client";

import { useId, useState } from "react";
import {
  CheckCircle2,
  Cpu,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  FolderTree,
  Globe,
  Headphones,
  Laptop,
  Monitor,
  Plus,
  RotateCcw,
  Search,
  Tag,
  X,
} from "lucide-react";
import {
  type AdminCategory,
  type AdminBrand,
  initialAdminCategories,
  initialAdminBrands,
  filterAdminCategories,
  filterAdminBrands,
  toSlug,
} from "@/lib/admin-categories";
import "./admin.css";

export function AdminCategories() {
  const [activeTab, setActiveTab] = useState<"CATEGORIES" | "BRANDS">("CATEGORIES");
  const [categories, setCategories] = useState<AdminCategory[]>(initialAdminCategories);
  const [brands, setBrands] = useState<AdminBrand[]>(initialAdminBrands);
  const [query, setQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const categoryNameInputId = useId();
  const categorySlugInputId = useId();
  const categoryDescInputId = useId();
  const categoryIconSelectId = useId();
  const categoryStatusSelectId = useId();
  const brandNameInputId = useId();
  const brandOriginInputId = useId();
  const brandWebsiteInputId = useId();
  const brandStatusSelectId = useId();

  // Drawers
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
    iconName: "Cpu",
    status: "ACTIVE" as "ACTIVE" | "HIDDEN",
  });

  const [editingBrand, setEditingBrand] = useState<AdminBrand | null>(null);
  const [isNewBrandOpen, setIsNewBrandOpen] = useState(false);
  const [brandForm, setBrandForm] = useState({
    name: "",
    origin: "",
    website: "",
    status: "ACTIVE" as "ACTIVE" | "HIDDEN",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredCategories = filterAdminCategories(categories, query);
  const filteredBrands = filterAdminBrands(brands, query);

  // Category handlers
  const handleOpenNewCategory = () => {
    setCategoryForm({
      name: "",
      slug: "",
      description: "",
      iconName: "Cpu",
      status: "ACTIVE",
    });
    setIsNewCategoryOpen(true);
  };

  const handleOpenEditCategory = (cat: AdminCategory) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      iconName: cat.iconName || "Cpu",
      status: cat.status,
    });
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    const slug = categoryForm.slug.trim() || toSlug(categoryForm.name);

    if (editingCategory) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editingCategory.id
            ? {
                ...c,
                name: categoryForm.name.trim(),
                slug,
                description: categoryForm.description.trim(),
                iconName: categoryForm.iconName,
                status: categoryForm.status,
              }
            : c,
        ),
      );
      showToast(`Đã cập nhật danh mục "${categoryForm.name.trim()}".`);
      setEditingCategory(null);
    } else {
      const newCat: AdminCategory = {
        id: `cat-${Date.now()}`,
        name: categoryForm.name.trim(),
        slug,
        description: categoryForm.description.trim(),
        productCount: 0,
        status: categoryForm.status,
        iconName: categoryForm.iconName,
      };
      setCategories((prev) => [...prev, newCat]);
      showToast(`Đã thêm danh mục "${newCat.name}".`);
      setIsNewCategoryOpen(false);
    }
  };

  const handleToggleCategoryStatus = (cat: AdminCategory) => {
    const nextStatus = cat.status === "ACTIVE" ? "HIDDEN" : "ACTIVE";
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, status: nextStatus } : c)),
    );
    showToast(
      `Đã chuyển danh mục "${cat.name}" sang ${nextStatus === "ACTIVE" ? "Hoạt động" : "Ẩn"}.`,
    );
  };

  // Brand handlers
  const handleOpenNewBrand = () => {
    setBrandForm({
      name: "",
      origin: "",
      website: "",
      status: "ACTIVE",
    });
    setIsNewBrandOpen(true);
  };

  const handleOpenEditBrand = (brand: AdminBrand) => {
    setEditingBrand(brand);
    setBrandForm({
      name: brand.name,
      origin: brand.origin,
      website: brand.website || "",
      status: brand.status,
    });
  };

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandForm.name.trim()) return;

    if (editingBrand) {
      setBrands((prev) =>
        prev.map((b) =>
          b.id === editingBrand.id
            ? {
                ...b,
                name: brandForm.name.trim(),
                origin: brandForm.origin.trim() || "Chưa rõ",
                website: brandForm.website.trim() || undefined,
                status: brandForm.status,
              }
            : b,
        ),
      );
      showToast(`Đã cập nhật thương hiệu "${brandForm.name.trim()}".`);
      setEditingBrand(null);
    } else {
      const newB: AdminBrand = {
        id: `b-${Date.now()}`,
        name: brandForm.name.trim(),
        origin: brandForm.origin.trim() || "Chưa rõ",
        website: brandForm.website.trim() || undefined,
        productCount: 0,
        status: brandForm.status,
      };
      setBrands((prev) => [...prev, newB]);
      showToast(`Đã thêm thương hiệu "${newB.name}".`);
      setIsNewBrandOpen(false);
    }
  };

  const handleToggleBrandStatus = (brand: AdminBrand) => {
    const nextStatus = brand.status === "ACTIVE" ? "HIDDEN" : "ACTIVE";
    setBrands((prev) =>
      prev.map((b) => (b.id === brand.id ? { ...b, status: nextStatus } : b)),
    );
    showToast(
      `Đã chuyển thương hiệu "${brand.name}" sang ${nextStatus === "ACTIVE" ? "Hoạt động" : "Ẩn"}.`,
    );
  };

  const renderIcon = (iconName?: string) => {
    switch (iconName) {
      case "Laptop":
        return <Laptop size={16} />;
      case "Monitor":
        return <Monitor size={16} />;
      case "Headphones":
        return <Headphones size={16} />;
      case "Cpu":
      default:
        return <Cpu size={16} />;
    }
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
          <span className="admin-eyebrow">PHÂN LOẠI & ĐỐI TÁC</span>
          <h1>Quản lý Danh mục & Thương hiệu</h1>
          <p>Cấu hình nhóm sản phẩm và các nhãn hàng linh kiện phân phối trong kho.</p>
        </div>
        <div className="admin-heading-actions">
          <button
            type="button"
            className="admin-button admin-button-primary"
            onClick={activeTab === "CATEGORIES" ? handleOpenNewCategory : handleOpenNewBrand}
          >
            <Plus size={16} />
            {activeTab === "CATEGORIES" ? "Thêm danh mục" : "Thêm thương hiệu"}
          </button>
        </div>
      </div>

      {/* Main Panel with Tabs */}
      <section className="admin-panel admin-list-panel">
        {/* Tab switch header */}
        <div className="admin-tabs-bar">
          <button
            type="button"
            className={`admin-tab-item ${activeTab === "CATEGORIES" ? "is-active" : ""}`}
            onClick={() => setActiveTab("CATEGORIES")}
          >
            <FolderTree size={16} />
            <span>Danh mục</span>
            <span className="admin-tab-count">{categories.length}</span>
          </button>
          <button
            type="button"
            className={`admin-tab-item ${activeTab === "BRANDS" ? "is-active" : ""}`}
            onClick={() => setActiveTab("BRANDS")}
          >
            <Tag size={16} />
            <span>Thương hiệu</span>
            <span className="admin-tab-count">{brands.length}</span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="admin-list-toolbar admin-toolbar-wrap">
          <label className="admin-search-field">
            <Search size={16} />
            <span className="sr-only">Tìm kiếm</span>
            <input
              type="search"
              placeholder={
                activeTab === "CATEGORIES"
                  ? "Tìm danh mục theo tên, slug, mô tả..."
                  : "Tìm thương hiệu theo tên hãng, xuất xứ..."
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {query && (
            <button
              type="button"
              className="admin-filter-reset"
              onClick={() => setQuery("")}
            >
              <RotateCcw size={15} />
              Xóa tìm kiếm
            </button>
          )}
        </div>

        {/* Tab 1: Categories Table */}
        {activeTab === "CATEGORIES" && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 60, textAlign: "center" }}>Biểu tượng</th>
                  <th style={{ width: 180 }}>Tên danh mục</th>
                  <th style={{ width: 160 }}>Đường dẫn (Slug)</th>
                  <th>Mô tả</th>
                  <th style={{ width: 130 }}>Số sản phẩm</th>
                  <th style={{ width: 130 }}>Trạng thái</th>
                  <th style={{ width: 140 }} className="align-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px 16px", color: "var(--admin-soft)" }}>
                      Không tìm thấy danh mục phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat) => (
                    <tr key={cat.id}>
                      <td style={{ textAlign: "center" }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            backgroundColor: "var(--admin-bg)",
                            display: "inline-grid",
                            placeItems: "center",
                            color: "var(--admin-ink)",
                          }}
                        >
                          {renderIcon(cat.iconName)}
                        </div>
                      </td>
                      <td>
                        <strong className="admin-table-primary">{cat.name}</strong>
                      </td>
                      <td>
                        <span className="admin-code-slug">{cat.slug}</span>
                      </td>
                      <td>
                        <span style={{ color: "var(--admin-muted)", fontSize: 12 }}>
                          {cat.description || "—"}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: "var(--admin-ink)", fontVariantNumeric: "tabular-nums" }}>
                          {cat.productCount}
                        </strong>{" "}
                        <small style={{ color: "var(--admin-soft)" }}>sản phẩm</small>
                      </td>
                      <td>
                        {cat.status === "ACTIVE" ? (
                          <span className="admin-status-pill is-success">Hoạt động</span>
                        ) : (
                          <span className="admin-status-pill is-muted">Đã ẩn</span>
                        )}
                      </td>
                      <td className="align-right">
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button
                            type="button"
                            className="admin-table-action"
                            onClick={() => handleOpenEditCategory(cat)}
                            title="Sửa thông tin"
                          >
                            <Edit2 size={13} /> Sửa
                          </button>
                          <button
                            type="button"
                            className="admin-table-action"
                            onClick={() => handleToggleCategoryStatus(cat)}
                            title={cat.status === "ACTIVE" ? "Ẩn danh mục" : "Hiện danh mục"}
                          >
                            {cat.status === "ACTIVE" ? <><EyeOff size={13} /> Ẩn</> : <><Eye size={13} /> Hiện</>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Brands Table */}
        {activeTab === "BRANDS" && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 180 }}>Tên thương hiệu</th>
                  <th style={{ width: 150 }}>Xuất xứ</th>
                  <th>Website chính thức</th>
                  <th style={{ width: 130 }}>Số sản phẩm</th>
                  <th style={{ width: 130 }}>Trạng thái</th>
                  <th style={{ width: 140 }} className="align-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredBrands.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "40px 16px", color: "var(--admin-soft)" }}>
                      Không tìm thấy thương hiệu phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredBrands.map((brand) => (
                    <tr key={brand.id}>
                      <td>
                        <strong className="admin-table-primary">{brand.name}</strong>
                      </td>
                      <td>
                        <span style={{ color: "var(--admin-muted)", fontSize: 12 }}>{brand.origin}</span>
                      </td>
                      <td>
                        {brand.website ? (
                          <a
                            href={brand.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 12,
                              color: "var(--admin-blue)",
                              textDecoration: "none",
                              fontWeight: 600,
                            }}
                          >
                            <Globe size={13} /> {brand.website.replace(/^https?:\/\//, "")}{" "}
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--admin-soft)" }}>—</span>
                        )}
                      </td>
                      <td>
                        <strong style={{ color: "var(--admin-ink)", fontVariantNumeric: "tabular-nums" }}>
                          {brand.productCount}
                        </strong>{" "}
                        <small style={{ color: "var(--admin-soft)" }}>sản phẩm</small>
                      </td>
                      <td>
                        {brand.status === "ACTIVE" ? (
                          <span className="admin-status-pill is-success">Hoạt động</span>
                        ) : (
                          <span className="admin-status-pill is-muted">Đã ẩn</span>
                        )}
                      </td>
                      <td className="align-right">
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button
                            type="button"
                            className="admin-table-action"
                            onClick={() => handleOpenEditBrand(brand)}
                            title="Sửa thông tin"
                          >
                            <Edit2 size={13} /> Sửa
                          </button>
                          <button
                            type="button"
                            className="admin-table-action"
                            onClick={() => handleToggleBrandStatus(brand)}
                            title={brand.status === "ACTIVE" ? "Ẩn thương hiệu" : "Hiện thương hiệu"}
                          >
                            {brand.status === "ACTIVE" ? <><EyeOff size={13} /> Ẩn</> : <><Eye size={13} /> Hiện</>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Category Drawer */}
      {(isNewCategoryOpen || editingCategory) && (
        <div className="admin-drawer-layer">
          <button
            type="button"
            className="admin-drawer-overlay"
            aria-label="Đóng form danh mục"
            onClick={() => {
              setIsNewCategoryOpen(false);
              setEditingCategory(null);
            }}
          />
          <aside className="admin-drawer" aria-label="Thông tin danh mục">
            <div className="admin-drawer-heading">
              <div>
                <span className="admin-panel-kicker">Cấu hình phân loại</span>
                <h2>{editingCategory ? "Cập nhật danh mục" : "Thêm danh mục mới"}</h2>
              </div>
              <button
                type="button"
                className="admin-icon-button"
                aria-label="Đóng"
                onClick={() => {
                  setIsNewCategoryOpen(false);
                  setEditingCategory(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form className="admin-form" onSubmit={handleSaveCategory}>
              <label>
                Tên danh mục
                <input
                  id={categoryNameInputId}
                  type="text"
                  required
                  placeholder="Ví dụ: Màn hình, Laptop Gaming..."
                  value={categoryForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setCategoryForm({
                      ...categoryForm,
                      name,
                      slug: editingCategory ? categoryForm.slug : toSlug(name),
                    });
                  }}
                />
              </label>

              <label>
                Mã đường dẫn (Slug)
                <input
                  id={categorySlugInputId}
                  type="text"
                  placeholder="man-hinh"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                />
              </label>

              <label>
                Mô tả danh mục
                <textarea
                  id={categoryDescInputId}
                  className="admin-form-textarea"
                  rows={3}
                  placeholder="Mô tả nhóm sản phẩm và mục đích sử dụng..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                />
              </label>

              <div className="admin-form-grid">
                <label>
                  Biểu tượng đại diện
                  <select
                    id={categoryIconSelectId}
                    value={categoryForm.iconName}
                    onChange={(e) => setCategoryForm({ ...categoryForm, iconName: e.target.value })}
                  >
                    <option value="Cpu">CPU / Linh kiện</option>
                    <option value="Laptop">Laptop</option>
                    <option value="Monitor">Màn hình / PC</option>
                    <option value="Headphones">Phụ kiện âm thanh</option>
                  </select>
                </label>

                <label>
                  Trạng thái hiển thị
                  <select
                    id={categoryStatusSelectId}
                    value={categoryForm.status}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        status: e.target.value as "ACTIVE" | "HIDDEN",
                      })
                    }
                  >
                    <option value="ACTIVE">Hoạt động (Hiển thị)</option>
                    <option value="HIDDEN">Ẩn tạm thời</option>
                  </select>
                </label>
              </div>

              <div className="admin-drawer-actions">
                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  onClick={() => {
                    setIsNewCategoryOpen(false);
                    setEditingCategory(null);
                  }}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="admin-button admin-button-primary">
                  {editingCategory ? "Lưu thay đổi" : "Tạo danh mục"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {/* Brand Drawer */}
      {(isNewBrandOpen || editingBrand) && (
        <div className="admin-drawer-layer">
          <button
            type="button"
            className="admin-drawer-overlay"
            aria-label="Đóng form thương hiệu"
            onClick={() => {
              setIsNewBrandOpen(false);
              setEditingBrand(null);
            }}
          />
          <aside className="admin-drawer" aria-label="Thông tin thương hiệu">
            <div className="admin-drawer-heading">
              <div>
                <span className="admin-panel-kicker">Đối tác sản xuất</span>
                <h2>{editingBrand ? "Cập nhật thương hiệu" : "Thêm thương hiệu mới"}</h2>
              </div>
              <button
                type="button"
                className="admin-icon-button"
                aria-label="Đóng"
                onClick={() => {
                  setIsNewBrandOpen(false);
                  setEditingBrand(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form className="admin-form" onSubmit={handleSaveBrand}>
              <label>
                Tên hãng / Thương hiệu
                <input
                  id={brandNameInputId}
                  type="text"
                  required
                  placeholder="Ví dụ: ASUS, GIGABYTE, MSI..."
                  value={brandForm.name}
                  onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                />
              </label>

              <label>
                Quốc gia / Xuất xứ
                <input
                  id={brandOriginInputId}
                  type="text"
                  placeholder="Ví dụ: Đài Loan, Mỹ, Hàn Quốc, Việt Nam..."
                  value={brandForm.origin}
                  onChange={(e) => setBrandForm({ ...brandForm, origin: e.target.value })}
                />
              </label>

              <label>
                Website chính thức
                <input
                  id={brandWebsiteInputId}
                  type="url"
                  placeholder="https://rog.asus.com"
                  value={brandForm.website}
                  onChange={(e) => setBrandForm({ ...brandForm, website: e.target.value })}
                />
              </label>

              <label>
                Trạng thái hoạt động
                <select
                  id={brandStatusSelectId}
                  value={brandForm.status}
                  onChange={(e) =>
                    setBrandForm({
                      ...brandForm,
                      status: e.target.value as "ACTIVE" | "HIDDEN",
                    })
                  }
                >
                  <option value="ACTIVE">Hoạt động (Hiển thị trong lọc)</option>
                  <option value="HIDDEN">Tạm ẩn</option>
                </select>
              </label>

              <div className="admin-drawer-actions">
                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  onClick={() => {
                    setIsNewBrandOpen(false);
                    setEditingBrand(null);
                  }}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="admin-button admin-button-primary">
                  {editingBrand ? "Lưu thay đổi" : "Thêm thương hiệu"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}

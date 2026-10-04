"use client";

import { FormEvent, useMemo, useState, type ChangeEvent } from "react";
import Image from "next/image";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Package,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import {
  adminProductStatuses,
  filterAdminProducts,
  formatAdminPrice,
  initialAdminProducts,
  productStatusLabels,
  type AdminProduct,
  type AdminProductFilters,
  type AdminProductStatus,
} from "../../lib/admin";

const categories = ["Laptop", "PC Gaming", "Linh kiện", "Phụ kiện"];
const brands = ["ASUS", "PC Store", "GIGABYTE", "Kingston", "Samsung", "Keychron", "LG", "Corsair"];
const itemsPerPage = 6;

const emptyProduct = (): AdminProduct => ({
  id: "new-product",
  sku: "PCS-NEW-001",
  name: "",
  brand: "ASUS",
  category: "Laptop",
  price: 0,
  stock: 0,
  status: "DRAFT",
  imageUrl: "/admin/products/laptop.svg",
  imageColor: "#e6e9ef",
  updatedAt: new Date().toISOString(),
});

const statusTone: Record<AdminProductStatus, string> = {
  ACTIVE: "is-success",
  DRAFT: "is-warning",
  HIDDEN: "is-muted",
  OUT_OF_STOCK: "is-danger",
  DISCONTINUED: "is-muted",
};

export function AdminProducts() {
  const [items, setItems] = useState(initialAdminProducts);
  const [filters, setFilters] = useState<AdminProductFilters>({ query: "", status: "ALL", stock: "ALL" });
  const [currentPage, setCurrentPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [feedback, setFeedback] = useState("");

  const filteredProducts = useMemo(() => filterAdminProducts(items, filters), [items, filters]);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const visibleProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  function updateFilter<K extends keyof AdminProductFilters>(key: K, value: AdminProductFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setCurrentPage(1);
  }

  function resetFilters() {
    setFilters({ query: "", status: "ALL", stock: "ALL" });
    setCurrentPage(1);
  }

  function openCreate() {
    setFeedback("");
    setEditingProduct(emptyProduct());
  }

  function openEdit(product: AdminProduct) {
    setFeedback("");
    setEditingProduct({ ...product });
  }

  function updateProductStatus(productId: string, status: AdminProductStatus) {
    setItems((current) => current.map((product) => product.id === productId ? { ...product, status } : product));
    setFeedback("Đã cập nhật trạng thái sản phẩm.");
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !editingProduct) return;
    setEditingProduct({ ...editingProduct, imageUrl: URL.createObjectURL(file) });
  }

  function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProduct?.name.trim() || editingProduct.price < 0 || editingProduct.stock < 0) return;
    const product = { ...editingProduct, name: editingProduct.name.trim(), updatedAt: new Date().toISOString() };
    setItems((current) => {
      const exists = current.some((item) => item.id === product.id);
      return exists ? current.map((item) => item.id === product.id ? product : item) : [product, ...current];
    });
    setEditingProduct(null);
    setFeedback(existsInItems(items, product.id) ? "Đã lưu thay đổi sản phẩm." : "Đã thêm sản phẩm mới.");
  }

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Danh mục và tồn kho</span>
          <h1>Sản phẩm</h1>
          <p>Quản lý danh mục hàng hóa, giá bán và số lượng đang sẵn sàng.</p>
        </div>
        <button type="button" className="admin-button admin-button-primary" onClick={openCreate}>
          <Plus size={16} />
          Thêm sản phẩm
        </button>
      </div>

      {feedback && (
        <div className="admin-feedback" role="status">
          <Check size={16} />
          <span>{feedback}</span>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setFeedback("")}><X size={15} /></button>
        </div>
      )}

      <section className="admin-panel admin-list-panel">
        <div className="admin-list-toolbar">
          <label className="admin-search-field">
            <Search size={16} />
            <span className="sr-only">Tìm sản phẩm</span>
            <input
              type="search"
              value={filters.query}
              placeholder="Tìm theo tên, thương hiệu..."
              onChange={(event) => updateFilter("query", event.target.value)}
            />
          </label>
          <select aria-label="Lọc trạng thái" value={filters.status} onChange={(event) => updateFilter("status", event.target.value as AdminProductFilters["status"])}>
            <option value="ALL">Tất cả trạng thái</option>
            {adminProductStatuses.map((status) => <option key={status} value={status}>{productStatusLabels[status]}</option>)}
          </select>
          <select aria-label="Lọc tồn kho" value={filters.stock} onChange={(event) => updateFilter("stock", event.target.value as AdminProductFilters["stock"])}>
            <option value="ALL">Tất cả tồn kho</option>
            <option value="LOW">Sắp hết hàng</option>
            <option value="OUT">Hết hàng</option>
          </select>
          <button type="button" className="admin-filter-reset" onClick={resetFilters}>
            <RotateCcw size={15} />
            Đặt lại
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table admin-products-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Danh mục</th>
                <th>Giá bán</th>
                <th>Tồn kho</th>
                <th>Trạng thái</th>
                <th className="align-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="admin-product-table-cell">
                      <span className="admin-product-avatar" style={{ backgroundColor: product.imageColor }}><Image src={product.imageUrl} alt="" width={34} height={34} unoptimized /></span>
                      <span>
                        <strong className="admin-table-primary">{product.name}</strong>
                        <small className="admin-table-secondary">{product.sku} · {product.brand}</small>
                      </span>
                    </div>
                  </td>
                  <td><span className="admin-category-label">{product.category}</span></td>
                  <td className="admin-price-cell">{formatAdminPrice(product.price)}</td>
                  <td>
                    <span className={`admin-stock-value ${product.stock === 0 ? "is-empty" : product.stock <= 5 ? "is-low" : ""}`}>
                      {product.stock === 0 ? "Hết hàng" : `${product.stock} sản phẩm`}
                    </span>
                  </td>
                  <td>
                    <select
                      className={`admin-inline-status ${statusTone[product.status]}`}
                      aria-label={`Trạng thái ${product.name}`}
                      value={product.status}
                      onChange={(event) => updateProductStatus(product.id, event.target.value as AdminProductStatus)}
                    >
                      {adminProductStatuses.map((status) => <option key={status} value={status}>{productStatusLabels[status]}</option>)}
                    </select>
                  </td>
                  <td className="align-right">
                    <button type="button" className="admin-table-action" onClick={() => openEdit(product)}>
                      <Edit3 size={15} />
                      Sửa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleProducts.length === 0 && (
            <div className="admin-empty-state">
              <Package size={22} />
              <strong>Không tìm thấy sản phẩm</strong>
              <span>Thử thay đổi từ khóa hoặc điều kiện lọc.</span>
            </div>
          )}
        </div>

        <div className="admin-table-footer">
          <span>Hiển thị <strong>{visibleProducts.length}</strong> trên <strong>{filteredProducts.length}</strong> sản phẩm</span>
          <div className="admin-pagination">
            <button type="button" className="admin-pagination-button" aria-label="Trang trước" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}><ChevronLeft size={16} /></button>
            <span>Trang <strong>{currentPage}</strong> / {totalPages}</span>
            <button type="button" className="admin-pagination-button" aria-label="Trang sau" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}><ChevronRight size={16} /></button>
          </div>
        </div>
      </section>

      {editingProduct && (
        <div className="admin-drawer-layer">
          <button type="button" className="admin-drawer-overlay" aria-label="Đóng form sản phẩm" onClick={() => setEditingProduct(null)} />
          <aside className="admin-drawer" aria-label="Form sản phẩm">
            <div className="admin-drawer-heading">
              <div>
                <span className="admin-panel-kicker">Thông tin catalog</span>
                <h2>{items.some((item) => item.id === editingProduct.id) ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}</h2>
              </div>
              <button type="button" className="admin-icon-button" aria-label="Đóng form" onClick={() => setEditingProduct(null)}><X size={18} /></button>
            </div>
            <form className="admin-form" onSubmit={saveProduct}>
              <label>Tên sản phẩm<input required value={editingProduct.name} onChange={(event) => setEditingProduct({ ...editingProduct, name: event.target.value })} placeholder="Ví dụ: ROG Strix G16 2025" /></label>
              <div className="admin-form-grid">
                <label>Mã SKU<input required value={editingProduct.sku} onChange={(event) => setEditingProduct({ ...editingProduct, sku: event.target.value })} /></label>
                <label>Thương hiệu<select value={editingProduct.brand} onChange={(event) => setEditingProduct({ ...editingProduct, brand: event.target.value })}>{brands.map((brand) => <option key={brand}>{brand}</option>)}</select></label>
              </div>
              <div className="admin-form-grid">
                <label>Danh mục<select value={editingProduct.category} onChange={(event) => setEditingProduct({ ...editingProduct, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label>Trạng thái<select value={editingProduct.status} onChange={(event) => setEditingProduct({ ...editingProduct, status: event.target.value as AdminProductStatus })}>{adminProductStatuses.map((status) => <option key={status} value={status}>{productStatusLabels[status]}</option>)}</select></label>
              </div>
              <div className="admin-form-grid">
                <label>Giá bán (VNĐ)<input required type="number" min="0" step="1000" value={editingProduct.price} onChange={(event) => setEditingProduct({ ...editingProduct, price: Number(event.target.value) })} /></label>
                <label>Tồn kho<input required type="number" min="0" step="1" value={editingProduct.stock} onChange={(event) => setEditingProduct({ ...editingProduct, stock: Number(event.target.value) })} /></label>
              </div>
              <div className="admin-image-editor">
                <div className="admin-image-preview"><Image src={editingProduct.imageUrl} alt={`Xem trước ${editingProduct.name || "sản phẩm"}`} fill unoptimized sizes="116px" /></div>
                <div className="admin-image-fields">
                  <label>Ảnh sản phẩm (URL)<input type="url" value={editingProduct.imageUrl} onChange={(event) => setEditingProduct({ ...editingProduct, imageUrl: event.target.value })} placeholder="/admin/products/laptop.svg" /></label>
                  <label className="admin-file-label">Chọn ảnh từ máy<input type="file" accept="image/*" onChange={handleImageUpload} /></label>
                  <small>Ảnh chọn từ máy chỉ xem được trong phiên mẫu này.</small>
                </div>
              </div>
              <div className="admin-form-note"><Package size={16} /><span>Dữ liệu đang ở chế độ mẫu. Thay đổi chỉ tồn tại trong phiên xem này.</span></div>
              <div className="admin-drawer-actions"><button type="button" className="admin-button admin-button-secondary" onClick={() => setEditingProduct(null)}>Hủy</button><button type="submit" className="admin-button admin-button-primary"><Check size={16} />Lưu sản phẩm</button></div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}

function existsInItems(items: AdminProduct[], id: string) {
  return items.some((item) => item.id === id);
}

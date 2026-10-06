"use client";

import { FormEvent, useMemo, useState, type ChangeEvent } from "react";
import Image from "next/image";
import {
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Edit3,
  Layers,
  Package,
  Plus,
  RotateCcw,
  Search,
  Square,
  Trash2,
  X,
} from "lucide-react";
import type { ComponentSlot } from "../../lib/builder";
import {
  adminBrands,
  adminCategories,
  adminProductStatuses,
  filterAdminProducts,
  formatAdminPrice,
  initialAdminProducts,
  productStatusLabels,
  type AdminProduct,
  type AdminProductFilters,
  type AdminProductStatus,
} from "../../lib/admin";

const itemsPerPage = 6;

const emptyProduct = (): AdminProduct => ({
  id: `p-${Date.now()}`,
  sku: `PCS-${Date.now().toString().slice(-4)}`,
  name: "",
  brand: "ASUS",
  category: "Laptop",
  price: 0,
  stock: 0,
  status: "DRAFT",
  imageUrl: "/admin/products/laptop.svg",
  imageColor: "#e6e9ef",
  description: "",
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
  const [items, setItems] = useState<AdminProduct[]>(initialAdminProducts);
  const [filters, setFilters] = useState<AdminProductFilters>({
    query: "",
    category: "ALL",
    brand: "ALL",
    status: "ALL",
    stock: "ALL",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<AdminProductStatus>("ACTIVE");
  const [feedback, setFeedback] = useState("");

  const filteredProducts = useMemo(() => filterAdminProducts(items, filters), [items, filters]);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const visibleProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const allVisibleSelected =
    visibleProducts.length > 0 && visibleProducts.every((p) => selectedIds.has(p.id));

  function updateFilter<K extends keyof AdminProductFilters>(key: K, value: AdminProductFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setCurrentPage(1);
  }

  function resetFilters() {
    setFilters({ query: "", category: "ALL", brand: "ALL", status: "ALL", stock: "ALL" });
    setCurrentPage(1);
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleProducts.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleProducts.forEach((p) => next.add(p.id));
        return next;
      });
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyBulkStatus() {
    if (selectedIds.size === 0) return;
    setItems((current) =>
      current.map((item) => (selectedIds.has(item.id) ? { ...item, status: bulkStatus } : item)),
    );
    setFeedback(`Đã cập nhật trạng thái ${selectedIds.size} sản phẩm sang "${productStatusLabels[bulkStatus]}".`);
    setSelectedIds(new Set());
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
    setItems((current) => current.map((product) => (product.id === productId ? { ...product, status } : product)));
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
    const isEdit = items.some((item) => item.id === product.id);

    setItems((current) => (isEdit ? current.map((item) => (item.id === product.id ? product : item)) : [product, ...current]));
    setEditingProduct(null);
    setFeedback(isEdit ? "Đã lưu thay đổi sản phẩm." : "Đã thêm sản phẩm mới vào danh mục.");
  }

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Danh mục và tồn kho</span>
          <h1>Sản phẩm</h1>
          <p>Quản lý danh mục hàng hóa, phân loại linh kiện và số lượng tồn sẵn sàng bán.</p>
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
          <button type="button" aria-label="Đóng thông báo" onClick={() => setFeedback("")}>
            <X size={15} />
          </button>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="admin-bulk-toolbar" role="region" aria-label="Thao tác hàng loạt">
          <div className="admin-bulk-info">
            <Layers size={16} />
            <span>
              Đã chọn <strong>{selectedIds.size}</strong> sản phẩm
            </span>
          </div>
          <div className="admin-bulk-actions">
            <label className="admin-bulk-select-label">
              <span>Đổi trạng thái:</span>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as AdminProductStatus)}
                aria-label="Chọn trạng thái hàng loạt"
              >
                {adminProductStatuses.map((st) => (
                  <option key={st} value={st}>
                    {productStatusLabels[st]}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="admin-button admin-button-secondary admin-btn-sm" onClick={applyBulkStatus}>
              Áp dụng
            </button>
            <button type="button" className="admin-text-action" onClick={() => setSelectedIds(new Set())}>
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      <section className="admin-panel admin-list-panel">
        <div className="admin-list-toolbar admin-toolbar-wrap">
          <label className="admin-search-field">
            <Search size={16} />
            <span className="sr-only">Tìm sản phẩm</span>
            <input
              type="search"
              value={filters.query}
              placeholder="Tìm theo tên, SKU, thương hiệu..."
              onChange={(event) => updateFilter("query", event.target.value)}
            />
          </label>
          <select
            aria-label="Lọc danh mục"
            value={filters.category ?? "ALL"}
            onChange={(event) => updateFilter("category", event.target.value)}
          >
            <option value="ALL">Tất cả danh mục</option>
            {adminCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc thương hiệu"
            value={filters.brand ?? "ALL"}
            onChange={(event) => updateFilter("brand", event.target.value)}
          >
            <option value="ALL">Tất cả thương hiệu</option>
            {adminBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc trạng thái"
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value as AdminProductFilters["status"])}
          >
            <option value="ALL">Tất cả trạng thái</option>
            {adminProductStatuses.map((status) => (
              <option key={status} value={status}>
                {productStatusLabels[status]}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc tồn kho"
            value={filters.stock}
            onChange={(event) => updateFilter("stock", event.target.value as AdminProductFilters["stock"])}
          >
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
                <th style={{ width: 40 }} className="align-center">
                  <button
                    type="button"
                    className="admin-checkbox-btn"
                    onClick={toggleSelectAll}
                    aria-label={allVisibleSelected ? "Bỏ chọn tất cả trang này" : "Chọn tất cả trang này"}
                  >
                    {allVisibleSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th>Sản phẩm</th>
                <th>Danh mục</th>
                <th>Giá bán</th>
                <th>Tồn kho</th>
                <th>Trạng thái</th>
                <th className="align-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product) => {
                const isSelected = selectedIds.has(product.id);
                return (
                  <tr key={product.id} className={isSelected ? "is-selected-row" : ""}>
                    <td className="align-center">
                      <button
                        type="button"
                        className="admin-checkbox-btn"
                        onClick={() => toggleSelectOne(product.id)}
                        aria-label={`Chọn ${product.name}`}
                      >
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>
                    <td>
                      <div className="admin-product-table-cell">
                        <span className="admin-product-avatar" style={{ backgroundColor: product.imageColor }}>
                          <Image src={product.imageUrl} alt="" width={34} height={34} unoptimized />
                        </span>
                        <span>
                          <strong className="admin-table-primary">{product.name}</strong>
                          <small className="admin-table-secondary">
                            {product.sku} · {product.brand}
                            {product.builderSpecs?.slot && (
                              <span className="admin-builder-spec-pill">
                                {product.builderSpecs.slot.toUpperCase()}
                                {product.builderSpecs.socket ? ` · ${product.builderSpecs.socket}` : ""}
                                {product.builderSpecs.vramGb ? ` · ${product.builderSpecs.vramGb}GB` : ""}
                                {product.builderSpecs.wattage ? ` · ${product.builderSpecs.wattage}W` : ""}
                                {product.builderSpecs.capacityGb ? ` · ${product.builderSpecs.capacityGb >= 1000 ? `${product.builderSpecs.capacityGb / 1000}TB` : `${product.builderSpecs.capacityGb}GB`}` : ""}
                              </span>
                            )}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="admin-category-label">{product.category}</span>
                    </td>
                    <td className="admin-price-cell">{formatAdminPrice(product.price)}</td>
                    <td>
                      <span
                        className={`admin-stock-value ${
                          product.stock === 0 ? "is-empty" : product.stock <= 5 ? "is-low" : ""
                        }`}
                      >
                        {product.stock === 0 ? "Hết hàng" : `${product.stock} sản phẩm`}
                      </span>
                    </td>
                    <td>
                      <select
                        className={`admin-inline-status ${statusTone[product.status]}`}
                        aria-label={`Trạng thái ${product.name}`}
                        value={product.status}
                        onChange={(event) =>
                          updateProductStatus(product.id, event.target.value as AdminProductStatus)
                        }
                      >
                        {adminProductStatuses.map((status) => (
                          <option key={status} value={status}>
                            {productStatusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="align-right">
                      <button type="button" className="admin-table-action" onClick={() => openEdit(product)}>
                        <Edit3 size={15} />
                        Sửa
                      </button>
                    </td>
                  </tr>
                );
              })}
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
          <span>
            Hiển thị <strong>{visibleProducts.length}</strong> trên <strong>{filteredProducts.length}</strong> sản phẩm
          </span>
          <div className="admin-pagination">
            <button
              type="button"
              className="admin-pagination-button"
              aria-label="Trang trước"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Trang <strong>{currentPage}</strong> / {totalPages}
            </span>
            <button
              type="button"
              className="admin-pagination-button"
              aria-label="Trang sau"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {editingProduct && (
        <div className="admin-drawer-layer">
          <button
            type="button"
            className="admin-drawer-overlay"
            aria-label="Đóng form sản phẩm"
            onClick={() => setEditingProduct(null)}
          />
          <aside className="admin-drawer" aria-label="Form sản phẩm">
            <div className="admin-drawer-heading">
              <div>
                <span className="admin-panel-kicker">Thông tin catalog</span>
                <h2>{items.some((item) => item.id === editingProduct.id) ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}</h2>
              </div>
              <button type="button" className="admin-icon-button" aria-label="Đóng form" onClick={() => setEditingProduct(null)}>
                <X size={18} />
              </button>
            </div>
            <form className="admin-form" onSubmit={saveProduct}>
              <label>
                Tên sản phẩm
                <input
                  required
                  value={editingProduct.name}
                  onChange={(event) => setEditingProduct({ ...editingProduct, name: event.target.value })}
                  placeholder="Ví dụ: ROG Strix G16 2025"
                />
              </label>

              <div className="admin-form-grid">
                <label>
                  Mã SKU
                  <input
                    required
                    value={editingProduct.sku}
                    onChange={(event) => setEditingProduct({ ...editingProduct, sku: event.target.value })}
                  />
                </label>
                <label>
                  Thương hiệu
                  <select
                    value={editingProduct.brand}
                    onChange={(event) => setEditingProduct({ ...editingProduct, brand: event.target.value })}
                  >
                    {adminBrands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="admin-form-grid">
                <label>
                  Danh mục
                  <select
                    value={editingProduct.category}
                    onChange={(event) => setEditingProduct({ ...editingProduct, category: event.target.value })}
                  >
                    {adminCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Trạng thái
                  <select
                    value={editingProduct.status}
                    onChange={(event) =>
                      setEditingProduct({ ...editingProduct, status: event.target.value as AdminProductStatus })
                    }
                  >
                    {adminProductStatuses.map((status) => (
                      <option key={status} value={status}>
                        {productStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="admin-form-grid">
                <label>
                  Giá bán (VNĐ)
                  <input
                    required
                    type="number"
                    min="0"
                    step="1000"
                    value={editingProduct.price}
                    onChange={(event) => setEditingProduct({ ...editingProduct, price: Number(event.target.value) })}
                  />
                </label>
                <label>
                  Tồn kho sẵn sàng
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={editingProduct.stock}
                    onChange={(event) => setEditingProduct({ ...editingProduct, stock: Number(event.target.value) })}
                  />
                </label>
              </div>

              <label>
                Mô tả tóm tắt
                <textarea
                  className="admin-form-textarea"
                  rows={2}
                  value={editingProduct.description ?? ""}
                  placeholder="Thông số chính, chế độ bảo hành..."
                  onChange={(event) => setEditingProduct({ ...editingProduct, description: event.target.value })}
                />
              </label>

              {(editingProduct.category === "Linh kiện" || editingProduct.builderSpecs?.slot) && (
                <div className="admin-builder-specs-box">
                  <div className="admin-builder-specs-header">
                    <Cpu size={15} />
                    <strong>Thông số kỹ thuật PC Builder</strong>
                    <small>(Phục vụ kiểm tra tương thích tự động)</small>
                  </div>

                  <div className="admin-form-grid" style={{ marginBottom: "10px" }}>
                    <label>
                      Loại linh kiện PC
                      <select
                        value={editingProduct.builderSpecs?.slot || ""}
                        onChange={(e) => {
                          const slot = (e.target.value as ComponentSlot) || undefined;
                          setEditingProduct({
                            ...editingProduct,
                            builderSpecs: { ...editingProduct.builderSpecs, slot },
                          });
                        }}
                      >
                        <option value="">-- Chọn linh kiện ráp PC --</option>
                        <option value="cpu">Bộ vi xử lý (CPU)</option>
                        <option value="motherboard">Bo mạch chủ (Mainboard)</option>
                        <option value="ram">Bộ nhớ RAM</option>
                        <option value="gpu">Card đồ họa (VGA)</option>
                        <option value="storage">Ổ cứng SSD / HDD</option>
                        <option value="psu">Nguồn máy tính (PSU)</option>
                        <option value="case">Vỏ case</option>
                        <option value="cooler">Tản nhiệt CPU</option>
                      </select>
                    </label>

                    {(editingProduct.builderSpecs?.slot === "cpu" || editingProduct.builderSpecs?.slot === "motherboard") && (
                      <label>
                        Chuẩn Socket
                        <input
                          placeholder="LGA1700, AM5, AM4..."
                          value={editingProduct.builderSpecs?.socket || ""}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              builderSpecs: { ...editingProduct.builderSpecs, socket: e.target.value },
                            })
                          }
                        />
                      </label>
                    )}

                    {(editingProduct.builderSpecs?.slot === "motherboard" || editingProduct.builderSpecs?.slot === "case") && (
                      <label>
                        Kích thước Form Factor
                        <input
                          placeholder="ATX, Micro-ATX, Mini-ITX..."
                          value={editingProduct.builderSpecs?.formFactor || ""}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              builderSpecs: { ...editingProduct.builderSpecs, formFactor: e.target.value },
                            })
                          }
                        />
                      </label>
                    )}

                    {(editingProduct.builderSpecs?.slot === "ram" || editingProduct.builderSpecs?.slot === "motherboard") && (
                      <label>
                        Chuẩn RAM hỗ trợ
                        <input
                          placeholder="DDR5, DDR4..."
                          value={editingProduct.builderSpecs?.ramType || ""}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              builderSpecs: { ...editingProduct.builderSpecs, ramType: e.target.value },
                            })
                          }
                        />
                      </label>
                    )}

                    {editingProduct.builderSpecs?.slot === "cpu" && (
                      <label>
                        Công suất tỏa nhiệt TDP (W)
                        <input
                          type="number"
                          placeholder="125"
                          value={editingProduct.builderSpecs?.tdpWatts || ""}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              builderSpecs: { ...editingProduct.builderSpecs, tdpWatts: Number(e.target.value) },
                            })
                          }
                        />
                      </label>
                    )}

                    {editingProduct.builderSpecs?.slot === "gpu" && (
                      <>
                        <label>
                          VRAM dung lượng (GB)
                          <input
                            type="number"
                            placeholder="12"
                            value={editingProduct.builderSpecs?.vramGb || ""}
                            onChange={(e) =>
                              setEditingProduct({
                                ...editingProduct,
                                builderSpecs: { ...editingProduct.builderSpecs, vramGb: Number(e.target.value) },
                              })
                            }
                          />
                        </label>
                        <label>
                          Nguồn đề xuất tối thiểu (W)
                          <input
                            type="number"
                            placeholder="650"
                            value={editingProduct.builderSpecs?.recommendedPsuW || ""}
                            onChange={(e) =>
                              setEditingProduct({
                                ...editingProduct,
                                builderSpecs: { ...editingProduct.builderSpecs, recommendedPsuW: Number(e.target.value) },
                              })
                            }
                          />
                        </label>
                        <label>
                          Chiều dài VGA tối đa (mm)
                          <input
                            type="number"
                            placeholder="269"
                            value={editingProduct.builderSpecs?.maxGpuLengthMm || ""}
                            onChange={(e) =>
                              setEditingProduct({
                                ...editingProduct,
                                builderSpecs: { ...editingProduct.builderSpecs, maxGpuLengthMm: Number(e.target.value) },
                              })
                            }
                          />
                        </label>
                      </>
                    )}

                    {editingProduct.builderSpecs?.slot === "psu" && (
                      <>
                        <label>
                          Công suất danh định (W)
                          <input
                            type="number"
                            placeholder="850"
                            value={editingProduct.builderSpecs?.wattage || ""}
                            onChange={(e) =>
                              setEditingProduct({
                                ...editingProduct,
                                builderSpecs: { ...editingProduct.builderSpecs, wattage: Number(e.target.value) },
                              })
                            }
                          />
                        </label>
                        <label>
                          Chuẩn hiệu suất
                          <input
                            placeholder="80 Plus Gold..."
                            value={editingProduct.builderSpecs?.efficiency || ""}
                            onChange={(e) =>
                              setEditingProduct({
                                ...editingProduct,
                                builderSpecs: { ...editingProduct.builderSpecs, efficiency: e.target.value },
                              })
                            }
                          />
                        </label>
                      </>
                    )}

                    {editingProduct.builderSpecs?.slot === "storage" && (
                      <label>
                        Dung lượng bộ nhớ (GB)
                        <input
                          type="number"
                          placeholder="1000"
                          value={editingProduct.builderSpecs?.capacityGb || ""}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              builderSpecs: { ...editingProduct.builderSpecs, capacityGb: Number(e.target.value) },
                            })
                          }
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              <div className="admin-image-editor">
                <div className="admin-image-preview">
                  <Image src={editingProduct.imageUrl} alt={`Xem trước ${editingProduct.name || "sản phẩm"}`} fill unoptimized sizes="116px" />
                </div>
                <div className="admin-image-fields">
                  <label>
                    Ảnh sản phẩm (URL)
                    <input
                      type="text"
                      value={editingProduct.imageUrl}
                      onChange={(event) => setEditingProduct({ ...editingProduct, imageUrl: event.target.value })}
                      placeholder="/admin/products/laptop.svg"
                    />
                  </label>
                  <label className="admin-file-label">
                    Chọn ảnh từ máy
                    <input type="file" accept="image/*" onChange={handleImageUpload} />
                  </label>
                  <small>Ảnh chọn từ máy xem được trong phiên demo này.</small>
                </div>
              </div>

              {editingProduct.status === "DISCONTINUED" && (
                <div className="admin-form-warning">
                  Sản phẩm ngừng bán sẽ bị ẩn khỏi trang cửa hàng và không thể thêm vào giỏ.
                </div>
              )}

              <div className="admin-form-note">
                <Package size={16} />
                <span>Dữ liệu lưu tạm trong phiên xem. Bấm Lưu để cập nhật vào bảng.</span>
              </div>

              <div className="admin-drawer-actions">
                <button type="button" className="admin-button admin-button-secondary" onClick={() => setEditingProduct(null)}>
                  Hủy
                </button>
                <button type="submit" className="admin-button admin-button-primary">
                  <Check size={16} />
                  Lưu sản phẩm
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}

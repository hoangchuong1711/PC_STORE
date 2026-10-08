"use client";

import { FormEvent, useEffect, useMemo, useState, type ChangeEvent } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Layers,
  Loader2,
  Package,
  Plus,
  RotateCcw,
  Search,
  Square,
  X,
} from "lucide-react";
import { ProductSpecEditor } from "./product-spec-editor";
import { collectProductSpec, isProductComponentType } from "../../lib/product-spec-fields";
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
import { catalogApi, type CatalogProduct, type CatalogCategoryOption, type CatalogBrandOption } from "../../lib/catalog-api";
import { adminProductApi, type AdminProductItem } from "../../lib/admin-product-api";
import { adminTaxonomyApi } from "../../lib/admin-taxonomy-api";

const STORAGE_KEY = "pcstore_admin_products_v2";
const DRAFT_KEY = "pcstore_admin_product_draft_v2";

function loadDraftProduct(): AdminProductFormState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft || typeof draft !== "object" || typeof draft.name !== "string") return null;
    return {
      ...draft,
      price: draft.price === 0 || draft.price === "0" ? "" : draft.price,
      stock: draft.stock === 0 || draft.stock === "0" ? "" : draft.stock,
    };
  } catch { return null; }
}

function loadStoredProducts(): AdminProduct[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return null;
}

function saveStoredProducts(products: AdminProduct[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch {
    // ignore
  }
}

function toAdminProduct(p: CatalogProduct): AdminProduct {
  const brandName = p.brand?.name ?? "PC Store";
  const catName = p.category?.name ?? "Linh kiện";
  return {
    id: String(p.productId),
    sku: `PCS-${p.productId.toString().padStart(4, "0")}`,
    name: p.name,
    brand: brandName,
    category: catName,
    price: p.price,
    stock: p.availableQuantity,
    status: p.inStock ? "ACTIVE" : "OUT_OF_STOCK",
    imageUrl: p.imageUrls?.[0] || "/admin/products/laptop.svg",
    imageColor: "#e6e9ef",
    description: p.description ?? "",
    updatedAt: new Date().toISOString(),
  };
}

function fromAdminProductItem(p: AdminProductItem): AdminProduct {
  return {
    id: String(p.productId),
    sku: `PCS-${p.productId.toString().padStart(4, "0")}`,
    name: p.name,
    brand: p.brandName || "PC Store",
    category: p.categoryName || "Linh kiện",
    price: p.price,
    stock: p.quantityOnHand,
    status: p.status,
    imageUrl: "/admin/products/laptop.svg",
    imageColor: "#e6e9ef",
    description: p.description ?? "",
    updatedAt: new Date().toISOString(),
    spec: p.spec ?? null,
  };
}

const itemsPerPage = 6;

export type AdminProductFormState = Omit<AdminProduct, "price" | "stock"> & {
  price: number | "";
  stock: number | "";
};

const emptyProduct = (): AdminProductFormState => ({
  id: `p-${Date.now()}`,
  sku: `PCS-${Date.now().toString().slice(-4)}`,
  name: "",
  brand: "ASUS",
  category: "Laptop",
  price: "",
  stock: "",
  status: "ACTIVE",
  imageUrl: "/admin/products/laptop.svg",
  imageColor: "#e6e9ef",
  description: "",
  updatedAt: new Date().toISOString(),
});

const statusTone: Record<AdminProductStatus, string> = {
  ACTIVE: "bg-admin-green-soft text-admin-green border-admin-green/20",
  DRAFT: "bg-admin-amber-soft text-admin-amber border-admin-amber/20",
  HIDDEN: "bg-gray-100 text-gray-600 border-gray-200",
  OUT_OF_STOCK: "bg-admin-red-soft text-admin-red border-admin-red/20",
  DISCONTINUED: "bg-gray-100 text-gray-500 border-gray-200",
};

export function AdminProducts() {
  const [items, setItems] = useState<AdminProduct[]>(() => loadStoredProducts() ?? initialAdminProducts);
  const [categoriesList, setCategoriesList] = useState<CatalogCategoryOption[]>([]);
  const [brandsList, setBrandsList] = useState<CatalogBrandOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AdminProductFilters>({
    query: "",
    category: "ALL",
    brand: "ALL",
    status: "ALL",
    stock: "ALL",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<AdminProductFormState | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<AdminProductStatus>("ACTIVE");
  const [feedback, setFeedback] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let cats: CatalogCategoryOption[] = [];
      let brs: CatalogBrandOption[] = [];

      try {
        const adminCats = await adminTaxonomyApi.list("categories");
        if (adminCats && adminCats.length > 0) {
          cats = adminCats.map((c) => ({
            categoryId: c.id,
            name: c.name,
            description: c.description,
            componentType: c.componentType,
          }));
        }
      } catch {
        cats = await catalogApi.listCategories().catch(() => []);
      }

      try {
        const adminBrs = await adminTaxonomyApi.list("brands");
        if (adminBrs && adminBrs.length > 0) {
          brs = adminBrs.map((b) => ({
            brandId: b.id,
            name: b.name,
            description: b.description,
            logoUrl: b.logoUrl,
          }));
        }
      } catch {
        brs = await catalogApi.listBrands().catch(() => []);
      }

      if (cats.length > 0) setCategoriesList(cats);
      if (brs.length > 0) setBrandsList(brs);

      let serverProds: AdminProduct[] = [];
      try {
        const adminList = await adminProductApi.list();
        serverProds = adminList.map(fromAdminProductItem);
      } catch {
        const publicPage = await catalogApi.list({ size: 100 }).catch(() => ({ items: [] }));
        serverProds = (publicPage.items || []).map(toAdminProduct);
      }

      setItems((prev) => {
        if (serverProds.length === 0) return prev;

        const serverMap = new Map<string, AdminProduct>();
        serverProds.forEach((p) => serverMap.set(p.id, p));

        const updated = prev.map((local) => {
          const fromServer = serverMap.get(local.id);
          if (fromServer) {
            serverMap.delete(local.id);
            return {
              ...local,
              price: fromServer.price,
              stock: fromServer.stock,
              status: local.status === "DRAFT" || local.status === "HIDDEN" ? local.status : fromServer.status,
              category: fromServer.category || local.category,
              brand: fromServer.brand || local.brand,
            };
          }
          return local;
        });

        const merged = [...updated, ...Array.from(serverMap.values())];
        saveStoredProducts(merged);
        return merged;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể kết nối máy chủ để tải danh mục sản phẩm.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setEditingProduct((current) => current ?? loadDraftProduct());
      void fetchData();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (editingProduct) {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(editingProduct));
      } else {
        sessionStorage.removeItem(DRAFT_KEY);
      }
    } catch {
      // ignore
    }
  }, [editingProduct]);

  const availableCategories = categoriesList.length > 0 ? categoriesList.map((c) => c.name) : adminCategories;
  const availableBrands = brandsList.length > 0 ? brandsList.map((b) => b.name) : adminBrands;
  const categoryComponentType = editingProduct
    ? categoriesList.find((category) => category.name === editingProduct.category)?.componentType
    : null;
  const selectedComponentType = isProductComponentType(categoryComponentType)
    ? categoryComponentType : null;

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

  async function applyBulkStatus() {
    if (selectedIds.size === 0) return;
    try {
      for (const id of selectedIds) {
        const numId = /^\d+$/.test(id) ? Number(id) : null;
        if (numId !== null) {
          await adminProductApi.setStatus(numId, bulkStatus);
        }
      }
      setItems((current) => {
        const next = current.map((item) => (selectedIds.has(item.id) ? { ...item, status: bulkStatus } : item));
        saveStoredProducts(next);
        return next;
      });
      setFeedback(`Đã cập nhật trạng thái ${selectedIds.size} sản phẩm sang "${productStatusLabels[bulkStatus]}".`);
      setSelectedIds(new Set());
    } catch (err) {
      setFeedback(err instanceof Error ? `Lỗi: ${err.message}` : "Không thể cập nhật hàng loạt");
    }
  }

  function openCreate() {
    setFeedback("");
    setDrawerError(null);
    const defaultBrand = brandsList.length > 0 ? brandsList[0].name : (availableBrands[0] ?? "ASUS");
    const defaultCat = categoriesList.length > 0 ? categoriesList[0].name : (availableCategories[0] ?? "Laptop");
    setEditingProduct({
      ...emptyProduct(),
      brand: defaultBrand,
      category: defaultCat,
      status: "ACTIVE",
    });
  }

  async function openEdit(product: AdminProduct) {
    setFeedback("");
    setDrawerError(null);
    setEditingProduct({
      ...product,
      price: product.price === 0 ? "" : product.price,
      stock: product.stock === 0 ? "" : product.stock,
    });
    const productId = /^\d+$/.test(product.id) ? Number(product.id) : null;
    if (productId !== null) {
      try {
        const detail = await adminProductApi.get(productId);
        setEditingProduct((current) => current?.id === product.id
          ? { ...current, category: detail.categoryName, brand: detail.brandName, spec: detail.spec ?? null }
          : current);
      } catch (error) {
        setDrawerError(error instanceof Error ? error.message : "Không đọc được thông số sản phẩm.");
      }
    }
  }

  function closeDrawer() {
    if (isSubmitting) return;
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    setEditingProduct(null);
    setDrawerError(null);
  }

  async function updateProductStatus(productId: string, status: AdminProductStatus) {
    try {
      const numId = /^\d+$/.test(productId) ? Number(productId) : null;
      if (numId !== null) {
        await adminProductApi.setStatus(numId, status);
      }
      setItems((current) => {
        const next = current.map((product) => (product.id === productId ? { ...product, status } : product));
        saveStoredProducts(next);
        return next;
      });
      setFeedback("Đã cập nhật trạng thái sản phẩm.");
    } catch (err) {
      setFeedback(err instanceof Error ? `Lỗi: ${err.message}` : "Không thể cập nhật trạng thái");
    }
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !editingProduct) return;
    setEditingProduct({ ...editingProduct, imageUrl: URL.createObjectURL(file) });
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProduct || isSubmitting) return;

    const trimmedName = editingProduct.name.trim();
    if (!trimmedName) {
      setDrawerError("Vui lòng nhập tên sản phẩm.");
      return;
    }

    const priceNum = editingProduct.price === "" ? 0 : Number(editingProduct.price);
    const stockNum = editingProduct.stock === "" ? 0 : Number(editingProduct.stock);

    if (isNaN(priceNum) || priceNum < 0) {
      setDrawerError("Giá bán không được âm.");
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setDrawerError("Số lượng tồn kho không được âm.");
      return;
    }

    setIsSubmitting(true);
    setDrawerError(null);
    try {
      const numId = /^\d+$/.test(editingProduct.id) ? Number(editingProduct.id) : null;
      const cat = categoriesList.find((c) => c.name === editingProduct.category) ?? categoriesList[0];
      const br = brandsList.find((b) => b.name === editingProduct.brand) ?? brandsList[0];
      if (!cat || !br) throw new Error("Cần chọn danh mục và thương hiệu có trên máy chủ.");
      const componentType = isProductComponentType(cat.componentType) ? cat.componentType : null;
      const spec = componentType ? collectProductSpec(componentType, editingProduct.spec) : undefined;

      let savedProduct: AdminProduct;

      if (numId !== null) {
        try {
          await adminProductApi.update(numId, {
            name: trimmedName,
            description: editingProduct.description || null,
            price: priceNum,
            categoryId: cat.categoryId,
            brandId: br.brandId,
            status: editingProduct.status,
            spec,
          });
          await adminProductApi.updateInventory(numId, {
            quantityOnHand: stockNum,
          });
        } catch (backendErr) {
          const msg = backendErr instanceof Error ? backendErr.message : "Không thể cập nhật sản phẩm lên máy chủ.";
          setDrawerError(msg);
          setIsSubmitting(false);
          return;
        }

        savedProduct = {
          ...editingProduct,
          name: trimmedName,
          price: priceNum,
          stock: stockNum,
          spec: spec ?? null,
          updatedAt: new Date().toISOString(),
        };

        setItems((current) => {
          const next = current.map((item) => (item.id === savedProduct.id ? savedProduct : item));
          saveStoredProducts(next);
          return next;
        });
        setFeedback(`Đã lưu thay đổi cho sản phẩm #${numId}.`);
      } else {
        let createdProduct: AdminProductItem;
        try {
          createdProduct = await adminProductApi.create({
            name: trimmedName,
            description: editingProduct.description || null,
            price: priceNum,
            categoryId: cat.categoryId,
            brandId: br.brandId,
            status: editingProduct.status,
            quantityOnHand: stockNum,
            spec,
          });
        } catch (backendErr) {
          const msg = backendErr instanceof Error ? backendErr.message : "Không thể tạo sản phẩm mới trên máy chủ.";
          setDrawerError(msg);
          setIsSubmitting(false);
          return;
        }

        savedProduct = fromAdminProductItem(createdProduct);

        setItems((current) => {
          const next = [savedProduct, ...current.filter((item) => item.id !== savedProduct.id)];
          saveStoredProducts(next);
          return next;
        });

        setFeedback(`Đã thêm sản phẩm mới "${savedProduct.name}" (#${createdProduct.productId}) thành công.`);
      }

      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
      setEditingProduct(null);
      setCurrentPage(1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể lưu sản phẩm";
      setDrawerError(msg);
      setFeedback(`Lỗi: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-[1250px] mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-7">
        <div>
          <span className="block text-[10px] font-bold text-admin-soft tracking-wider uppercase">Danh mục và tồn kho</span>
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-admin-ink tracking-tight mt-1 mb-1.5 leading-tight">Sản phẩm</h1>
          <p className="text-sm text-admin-muted max-w-[570px] m-0">Quản lý danh mục hàng hóa, phân loại linh kiện và số lượng tồn sẵn sàng bán.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 min-h-[38px] px-4 rounded-lg bg-admin-accent-dark hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          onClick={openCreate}
        >
          <Plus size={16} />
          Thêm sản phẩm
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between text-xs font-semibold" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center min-h-[32px] px-3 rounded-lg border border-red-300 bg-white hover:bg-red-50 text-red-800 transition-colors cursor-pointer"
            onClick={() => void fetchData()}
          >
            Tải lại
          </button>
        </div>
      )}

      {feedback && (
        <div className="flex items-center justify-between gap-2.5 p-3 rounded-lg bg-admin-green-soft border border-admin-green/20 text-xs font-semibold text-admin-green mb-5" role="status">
          <div className="flex items-center gap-2">
            <Check size={16} />
            <span>{feedback}</span>
          </div>
          <button type="button" aria-label="Đóng thông báo" className="cursor-pointer text-admin-green/70 hover:text-admin-green" onClick={() => setFeedback("")}>
            <X size={15} />
          </button>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="mb-4 p-3 px-4 rounded-xl border border-admin-blue/30 bg-admin-blue-soft flex flex-wrap items-center justify-between gap-3 text-xs" role="region" aria-label="Thao tác hàng loạt">
          <div className="flex items-center gap-2 text-admin-ink font-medium">
            <Layers size={16} className="text-admin-blue" />
            <span>
              Đã chọn <strong className="font-bold">{selectedIds.size}</strong> sản phẩm
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <label className="flex items-center gap-1.5 text-admin-muted font-medium">
              <span>Đổi trạng thái:</span>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as AdminProductStatus)}
                aria-label="Chọn trạng thái hàng loạt"
                className="h-8 px-2.5 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue cursor-pointer"
              >
                {adminProductStatuses.map((st) => (
                  <option key={st} value={st}>
                    {productStatusLabels[st]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="inline-flex items-center justify-center h-8 px-3 rounded-lg border border-admin-line bg-white hover:bg-admin-bg text-admin-ink text-xs font-bold transition-colors cursor-pointer shadow-xs"
              onClick={applyBulkStatus}
            >
              Áp dụng
            </button>
            <button
              type="button"
              className="text-xs font-semibold text-admin-muted hover:text-admin-red transition-colors cursor-pointer underline ml-1"
              onClick={() => setSelectedIds(new Set())}
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      <section className="rounded-xl border border-admin-line bg-admin-surface overflow-hidden">
        <div className="p-3.5 border-b border-admin-line bg-white flex flex-wrap items-center gap-2.5">
          <label className="relative flex items-center flex-1 min-w-[220px] max-w-sm">
            <Search size={16} className="absolute left-3 text-admin-soft pointer-events-none" />
            <span className="sr-only">Tìm sản phẩm</span>
            <input
              type="search"
              value={filters.query}
              placeholder="Tìm theo tên, SKU, thương hiệu..."
              onChange={(event) => updateFilter("query", event.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink placeholder:text-admin-soft focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue transition-colors"
            />
          </label>
          <select
            aria-label="Lọc danh mục"
            value={filters.category ?? "ALL"}
            onChange={(event) => updateFilter("category", event.target.value)}
            className="h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue cursor-pointer max-w-[170px]"
          >
            <option value="ALL">Tất cả danh mục</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc thương hiệu"
            value={filters.brand ?? "ALL"}
            onChange={(event) => updateFilter("brand", event.target.value)}
            className="h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue cursor-pointer max-w-[170px]"
          >
            <option value="ALL">Tất cả thương hiệu</option>
            {availableBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc trạng thái"
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value as AdminProductFilters["status"])}
            className="h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue cursor-pointer max-w-[170px]"
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
            className="h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue cursor-pointer max-w-[170px]"
          >
            <option value="ALL">Tất cả tồn kho</option>
            <option value="LOW">Sắp hết hàng</option>
            <option value="OUT">Hết hàng</option>
          </select>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-transparent text-xs font-semibold text-admin-muted hover:text-admin-ink transition-colors cursor-pointer"
            onClick={resetFilters}
          >
            <RotateCcw size={15} />
            Đặt lại
          </button>
        </div>

        <div className="w-full overflow-x-auto">
          {loading ? (
            <div className="min-h-[260px] flex items-center justify-center">
              <Loader2 size={36} className="animate-spin text-admin-soft" />
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr>
                  <th className="w-10 py-3 px-3 border-b border-admin-line text-center bg-admin-bg/30">
                    <button
                      type="button"
                      className="text-admin-soft hover:text-admin-ink cursor-pointer inline-flex items-center justify-center"
                      onClick={toggleSelectAll}
                      aria-label={allVisibleSelected ? "Bỏ chọn tất cả trang này" : "Chọn tất cả trang này"}
                    >
                      {allVisibleSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </th>
                  <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">Sản phẩm</th>
                  <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">Danh mục</th>
                  <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">Giá bán</th>
                  <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">Tồn kho</th>
                  <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30">Trạng thái</th>
                  <th className="py-3 px-4 border-b border-admin-line text-[10px] font-bold uppercase tracking-wider text-admin-soft whitespace-nowrap bg-admin-bg/30 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => {
                  const isSelected = selectedIds.has(product.id);
                  return (
                    <tr key={product.id} className={`hover:bg-admin-bg/40 transition-colors ${isSelected ? "bg-admin-blue-soft/40" : ""}`}>
                      <td className="py-3 px-3 border-b border-[#edf0f2] text-center align-middle">
                        <button
                          type="button"
                          className="text-admin-soft hover:text-admin-ink cursor-pointer inline-flex items-center justify-center"
                          onClick={() => toggleSelectOne(product.id)}
                          aria-label={`Chọn ${product.name}`}
                        >
                          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                        <div className="flex items-center gap-2.5 min-w-[230px]">
                          <span className="grid w-[34px] h-[34px] shrink-0 place-items-center rounded-lg overflow-hidden border border-admin-line/50" style={{ backgroundColor: product.imageColor }}>
                            <Image src={product.imageUrl} alt="" width={34} height={34} className="w-full h-full object-cover" unoptimized />
                          </span>
                          <span>
                            <strong className="block text-xs font-bold text-admin-ink leading-snug">{product.name}</strong>
                            <small className="block mt-0.5 text-[10px] text-admin-soft">
                              {product.sku} · {product.brand}
                              {product.builderSpecs?.slot && (
                                <span className="inline-block ml-1.5 px-1.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded text-[9px] font-bold uppercase">
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
                      <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle text-admin-muted text-xs">
                        {product.category}
                      </td>
                      <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle text-admin-ink font-bold whitespace-nowrap text-xs">
                        {formatAdminPrice(product.price)}
                      </td>
                      <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle whitespace-nowrap text-xs">
                        <span
                          className={`font-bold ${
                            product.stock === 0 ? "text-admin-red" : product.stock <= 5 ? "text-admin-amber" : "text-admin-green"
                          }`}
                        >
                          {product.stock === 0 ? "Hết hàng" : `${product.stock} sản phẩm`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle">
                        <select
                          className={`min-h-[26px] px-2.5 py-0.5 rounded border text-[10px] font-bold cursor-pointer focus:outline-hidden ${statusTone[product.status]}`}
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
                      <td className="py-3.5 px-4 border-b border-[#edf0f2] align-middle text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-admin-line bg-white hover:bg-admin-bg hover:border-admin-soft text-admin-muted hover:text-admin-ink text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                          onClick={() => openEdit(product)}
                        >
                          <Edit3 size={13} />
                          Sửa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && visibleProducts.length === 0 && (
            <div className="flex flex-col items-center gap-1.5 py-16 px-4 text-admin-soft text-center">
              <Package size={28} className="text-admin-soft mb-1" />
              <strong className="text-admin-ink text-sm font-bold">Không tìm thấy sản phẩm</strong>
              <span className="text-xs">Thử thay đổi từ khóa hoặc điều kiện lọc.</span>
            </div>
          )}
        </div>

        <div className="p-3.5 px-4 border-t border-admin-line flex items-center justify-between gap-3 text-xs text-admin-soft">
          <span>
            Hiển thị <strong className="text-admin-ink font-bold">{visibleProducts.length}</strong> trên <strong className="text-admin-ink font-bold">{filteredProducts.length}</strong> sản phẩm
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="grid w-7 h-7 place-items-center rounded-md border border-admin-line bg-white text-admin-muted hover:text-admin-ink hover:border-admin-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              aria-label="Trang trước"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs">
              Trang <strong className="text-admin-ink font-bold">{currentPage}</strong> / {totalPages}
            </span>
            <button
              type="button"
              className="grid w-7 h-7 place-items-center rounded-md border border-admin-line bg-white text-admin-muted hover:text-admin-ink hover:border-admin-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity cursor-pointer border-0"
            aria-label="Đóng form sản phẩm"
            onClick={closeDrawer}
          />
          <aside className="relative z-10 w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-y-auto p-6 sm:p-7" aria-label="Form sản phẩm">
            <div className="flex items-start justify-between gap-4 pb-5 border-b border-admin-line">
              <div>
                <span className="block text-[10px] font-bold text-admin-soft tracking-wider uppercase">Thông tin catalog</span>
                <h2 className="text-lg sm:text-xl font-bold text-admin-ink tracking-tight mt-1">
                  {items.some((item) => item.id === editingProduct.id) ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}
                </h2>
              </div>
              <button
                type="button"
                className="grid w-8 h-8 place-items-center rounded-lg border border-transparent hover:border-admin-line hover:bg-admin-bg text-admin-muted hover:text-admin-ink transition-colors cursor-pointer"
                aria-label="Đóng form"
                onClick={closeDrawer}
              >
                <X size={18} />
              </button>
            </div>
            <form className="flex flex-col gap-4.5 pt-5 flex-1" onSubmit={saveProduct}>
              <label className="flex flex-col gap-1.5 text-[11px] font-bold text-admin-muted">
                Tên sản phẩm
                <input
                  required
                  value={editingProduct.name}
                  onChange={(event) => setEditingProduct({ ...editingProduct, name: event.target.value })}
                  placeholder="Ví dụ: ROG Strix G16 2025"
                  className="w-full h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue transition-colors"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-[11px] font-bold text-admin-muted">
                  Mã SKU
                  <input
                    required
                    value={editingProduct.sku}
                    onChange={(event) => setEditingProduct({ ...editingProduct, sku: event.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue transition-colors"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-[11px] font-bold text-admin-muted">
                  Thương hiệu
                  <select
                    value={editingProduct.brand}
                    onChange={(event) => setEditingProduct({ ...editingProduct, brand: event.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue transition-colors cursor-pointer"
                  >
                    {availableBrands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-[11px] font-bold text-admin-muted">
                  Danh mục
                  <select
                    value={editingProduct.category}
                    onChange={(event) => setEditingProduct({
                      ...editingProduct, category: event.target.value,
                      spec: event.target.value === editingProduct.category ? editingProduct.spec : null,
                    })}
                    className="w-full h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue transition-colors cursor-pointer"
                  >
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-[11px] font-bold text-admin-muted">
                  Trạng thái
                  <select
                    value={editingProduct.status}
                    onChange={(event) =>
                      setEditingProduct({ ...editingProduct, status: event.target.value as AdminProductStatus })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue transition-colors cursor-pointer"
                  >
                    {adminProductStatuses.map((status) => (
                      <option key={status} value={status}>
                        {productStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-[11px] font-bold text-admin-muted">
                  Giá bán (VNĐ)
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={editingProduct.price}
                    onChange={(event) => {
                      const val = event.target.value;
                      setEditingProduct({
                        ...editingProduct,
                        price: val === "" ? "" : Number(val),
                      });
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue transition-colors"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-[11px] font-bold text-admin-muted">
                  Tồn kho sẵn sàng
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={editingProduct.stock}
                    onChange={(event) => {
                      const val = event.target.value;
                      setEditingProduct({
                        ...editingProduct,
                        stock: val === "" ? "" : Number(val),
                      });
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue transition-colors"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-[11px] font-bold text-admin-muted">
                Mô tả tóm tắt
                <textarea
                  rows={2}
                  value={editingProduct.description ?? ""}
                  placeholder="Thông số chính, chế độ bảo hành..."
                  onChange={(event) => setEditingProduct({ ...editingProduct, description: event.target.value })}
                  className="w-full p-2.5 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue transition-colors resize-y"
                />
              </label>

              {selectedComponentType && (
                <ProductSpecEditor
                  type={selectedComponentType}
                  value={editingProduct.spec}
                  onChange={(spec) => setEditingProduct({ ...editingProduct, spec })}
                />
              )}

              <div className="grid grid-cols-[116px_minmax(0,1fr)] gap-3.5 items-start">
                <div className="relative w-[116px] h-[84px] rounded-lg border border-admin-line bg-admin-bg overflow-hidden flex items-center justify-center">
                  <Image src={editingProduct.imageUrl} alt={`Xem trước ${editingProduct.name || "sản phẩm"}`} fill className="object-cover" unoptimized sizes="116px" />
                </div>
                <div className="flex flex-col gap-2 min-w-0">
                  <label className="flex flex-col gap-1.5 text-[11px] font-bold text-admin-muted">
                    Ảnh sản phẩm (URL)
                    <input
                      type="text"
                      value={editingProduct.imageUrl}
                      onChange={(event) => setEditingProduct({ ...editingProduct, imageUrl: event.target.value })}
                      placeholder="/admin/products/laptop.svg"
                      className="w-full h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue transition-colors"
                    />
                  </label>
                  <label className="inline-flex flex-col gap-1 text-[11px] font-bold text-admin-muted">
                    <span>Chọn ảnh từ máy</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs text-admin-muted file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border border-admin-line file:bg-white file:text-xs file:font-semibold hover:file:bg-admin-bg cursor-pointer" />
                  </label>
                  <small className="text-[10px] text-admin-soft">Ảnh chọn từ máy xem được trong phiên demo này.</small>
                </div>
              </div>

              {editingProduct.status === "DISCONTINUED" && (
                <div className="p-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-xs font-medium">
                  Sản phẩm ngừng bán sẽ bị ẩn khỏi trang cửa hàng và không thể thêm vào giỏ.
                </div>
              )}

              <div className="flex items-start gap-2 p-2.5 rounded-lg border border-admin-line bg-admin-bg text-admin-muted text-xs leading-relaxed">
                <Package size={16} className="shrink-0 mt-0.5 text-admin-soft" />
                <span>Dữ liệu nháp được tự động lưu. Bấm &quot;Lưu sản phẩm&quot; để cập nhật vào bảng quản lý.</span>
              </div>

              {drawerError && (
                <div
                  className="mt-1.5 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2 text-xs font-semibold"
                  role="alert"
                >
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{drawerError}</span>
                </div>
              )}

              <div className="sticky bottom-0 bg-white flex items-center justify-end gap-2.5 pt-3.5 pb-2 -mx-6 -mb-6 px-6 sm:-mx-7 sm:-mb-7 sm:px-7 border-t border-admin-line shadow-xs z-20">
                <button
                  type="button"
                  className="inline-flex items-center justify-center min-h-[38px] px-4 rounded-lg border border-admin-line bg-white hover:bg-admin-bg text-admin-ink text-xs font-bold transition-colors cursor-pointer"
                  disabled={isSubmitting}
                  onClick={closeDrawer}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 min-h-[38px] px-4 rounded-lg bg-admin-accent-dark hover:bg-black text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {isSubmitting ? "Đang lưu..." : "Lưu sản phẩm"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}

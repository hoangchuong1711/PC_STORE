"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  Cpu,
  Layers,
  HardDrive,
  Monitor,
  Zap,
  Box,
  Wind,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShoppingCart,
  Sparkles,
  ArrowRight,
  X,
  Search,
} from "lucide-react";
import { Header, Footer } from "./storefront";
import { useCart } from "./cart-provider";
import { useToast } from "./toast";
import { formatPrice } from "../lib/products";
import {
  ComponentSlot,
  BuilderProduct,
  builderCatalog,
  slotLabels,
  PcBuildSelection,
  calculateEstimatedWattage,
  validateCompatibility,
  presetBuilds,
} from "../lib/builder";
import "./builder.css";

const slotIcons: Record<ComponentSlot, typeof Cpu> = {
  cpu: Cpu,
  motherboard: Layers,
  ram: Layers,
  gpu: Monitor,
  storage: HardDrive,
  psu: Zap,
  case: Box,
  cooler: Wind,
};

export function PCBuilderPage() {
  const [selection, setSelection] = useState<PcBuildSelection>({});
  const [activeSlotModal, setActiveSlotModal] = useState<ComponentSlot | null>(null);
  const [modalSearch, setModalSearch] = useState("");
  const [modalBrand, setModalBrand] = useState("Tất cả");
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [needAssembly, setNeedAssembly] = useState(true);

  const { add } = useCart();
  const { toast } = useToast();

  const slots: ComponentSlot[] = [
    "cpu",
    "motherboard",
    "ram",
    "gpu",
    "storage",
    "psu",
    "case",
    "cooler",
  ];

  const selectedCount = Object.keys(selection).filter(
    (k) => selection[k as ComponentSlot],
  ).length;

  const totalCost = useMemo(() => {
    return Object.values(selection).reduce((sum, item) => {
      return sum + (item?.price ?? 0);
    }, 0);
  }, [selection]);

  const estimatedWattage = useMemo(() => {
    return calculateEstimatedWattage(selection);
  }, [selection]);

  const compatibilityRules = useMemo(() => {
    return validateCompatibility(selection);
  }, [selection]);

  const hasFail = compatibilityRules.some((r) => r.status === "FAIL");
  const allPass =
    selectedCount >= 4 &&
    compatibilityRules.every((r) => r.status === "PASS");

  const handleSelectComponent = (item: BuilderProduct) => {
    setSelection((prev) => ({
      ...prev,
      [item.slot]: item,
    }));
    setActiveSlotModal(null);
    setModalSearch("");
    setModalBrand("Tất cả");
    toast(`Đã chọn "${item.name}"!`, "success");
  };

  const handleRemoveSlot = (slot: ComponentSlot) => {
    setSelection((prev) => {
      const copy = { ...prev };
      delete copy[slot];
      return copy;
    });
    toast(`Đã gỡ linh kiện khỏi vị trí ${slotLabels[slot].label}`, "info");
  };

  const handleLoadPreset = (presetIndex: number) => {
    const preset = presetBuilds[presetIndex];
    if (preset) {
      setSelection(preset.selection);
      toast(`Đã tải cấu hình mẫu: "${preset.name}"!`, "success");
    }
  };

  const handleClearBuild = () => {
    setSelection({});
    toast("Đã làm mới cấu hình máy!", "info");
  };

  const handleAddToCart = () => {
    const items = Object.values(selection).filter(Boolean) as BuilderProduct[];
    if (items.length === 0) {
      toast("Vui lòng chọn ít nhất 1 linh kiện trước khi thêm vào giỏ!", "error");
      return;
    }

    if (hasFail) {
      toast("Cấu hình có xung đột phần cứng. Hãy điều chỉnh trước khi mua!", "error");
      return;
    }

    items.forEach((item) => {
      add(item.id, 1);
    });

    toast(
      `Đã thêm toàn bộ ${items.length} linh kiện dàn PC vào giỏ hàng!`,
      "success",
    );
  };

  // Filter products for active slot modal
  const modalProducts = useMemo(() => {
    if (!activeSlotModal) return [];
    return builderCatalog
      .filter((item) => item.slot === activeSlotModal)
      .filter((item) => {
        const matchSearch =
          !modalSearch.trim() ||
          item.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
          item.brand.toLowerCase().includes(modalSearch.toLowerCase());
        const matchBrand =
          modalBrand === "Tất cả" || item.brand === modalBrand;
        return matchSearch && matchBrand;
      });
  }, [activeSlotModal, modalSearch, modalBrand]);

  const availableBrandsInSlot = useMemo(() => {
    if (!activeSlotModal) return [];
    const brandsSet = new Set(
      builderCatalog
        .filter((item) => item.slot === activeSlotModal)
        .map((i) => i.brand),
    );
    return ["Tất cả", ...Array.from(brandsSet)];
  }, [activeSlotModal]);

  return (
    <>
      <Header />
      <main className="container builder-page">
        {/* Header Hero */}
        <div className="builder-hero">
          <div className="builder-hero-copy">
            <span className="eyebrow">PC Store · Intelligent Compatibility Engine</span>
            <h1>
              Tự ráp PC đỉnh cao,
              <br />
              <em>chuẩn từng chân cắm.</em>
            </h1>
            <p>
              Chọn từng món linh kiện, tự động tính nguồn (Watt) và kiểm tra tương thích socket CPU, bo mạch chủ, RAM và thùng máy trong thời gian thực.
            </p>
          </div>

          <div className="builder-presets-card">
            <span className="builder-presets-title">
              <Sparkles size={16} /> Hoặc chọn cấu hình chuẩn hóa sẵn:
            </span>
            <div className="builder-presets-buttons">
              {presetBuilds.map((preset, idx) => (
                <button
                  key={preset.name}
                  type="button"
                  className="preset-btn"
                  onClick={() => handleLoadPreset(idx)}
                >
                  <span className="preset-btn-name">{preset.name}</span>
                  <span className="preset-btn-tag">{preset.tag}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Compatibility Alert Banner */}
        <div
          className={`builder-compatibility-banner ${
            hasFail ? "status-fail" : allPass ? "status-pass" : "status-unknown"
          }`}
        >
          <div className="compat-banner-left">
            {hasFail ? (
              <AlertTriangle size={24} className="compat-banner-icon fail" />
            ) : allPass ? (
              <CheckCircle2 size={24} className="compat-banner-icon pass" />
            ) : (
              <HelpCircle size={24} className="compat-banner-icon unknown" />
            )}
            <div>
              <strong>
                {hasFail
                  ? "Phát hiện xung đột linh kiện!"
                  : allPass
                    ? "Cấu hình tương thích hoàn hảo (100% Pass)"
                    : `Đã chọn ${selectedCount} / 8 nhóm linh kiện`}
              </strong>
              <p>
                {hasFail
                  ? "Có ít nhất 1 quy tắc không khớp (Socket, Chuẩn RAM, hoặc Nguồn). Vui lòng kiểm tra lại."
                  : allPass
                    ? "Tất cả socket CPU, kích cỡ case và công suất nguồn đều khớp nhau hoàn hảo."
                    : "Tiếp tục chọn thêm linh kiện để hoàn thiện cỗ máy của bạn."}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="compat-view-rules-btn"
            onClick={() => setShowRulesModal(true)}
          >
            Chi tiết 5 quy tắc tương thích ({compatibilityRules.filter((r) => r.status === "PASS").length}/5)
          </button>
        </div>

        {/* Main Grid: Slots on Left, Summary on Right */}
        <div className="builder-layout">
          {/* Slots List */}
          <section className="builder-slots-list" aria-label="8 nhóm linh kiện PC">
            {slots.map((slot) => {
              const item = selection[slot];
              const slotInfo = slotLabels[slot];
              const Icon = slotIcons[slot];

              return (
                <article
                  key={slot}
                  className={`builder-slot-card ${item ? "has-item" : "empty"}`}
                >
                  <div className="slot-type-header">
                    <div className="slot-icon-badge">
                      <Icon size={18} />
                    </div>
                    <div>
                      <span className="slot-title">{slotInfo.label}</span>
                      <small className="slot-desc">{slotInfo.desc}</small>
                    </div>
                  </div>

                  {item ? (
                    <div className="slot-item-body">
                      <div
                        className="slot-item-visual"
                        style={{ background: item.accent }}
                      >
                        {item.name.slice(0, 1)}
                      </div>

                      <div className="slot-item-details">
                        <span className="slot-item-brand">{item.brand}</span>
                        <h3 className="slot-item-name">{item.name}</h3>

                        <div className="slot-item-specs-tags">
                          {item.specs.socket && (
                            <span className="builder-spec-chip">
                              Socket: {item.specs.socket}
                            </span>
                          )}
                          {item.specs.ramType && (
                            <span className="builder-spec-chip">
                              {item.specs.ramType}
                            </span>
                          )}
                          {item.specs.formFactor && (
                            <span className="builder-spec-chip">
                              Form: {item.specs.formFactor}
                            </span>
                          )}
                          {item.specs.wattage && (
                            <span className="builder-spec-chip">
                              {item.specs.wattage}W {item.specs.efficiency}
                            </span>
                          )}
                          {item.specs.capacityGb && (
                            <span className="builder-spec-chip">
                              {item.specs.capacityGb}GB
                            </span>
                          )}
                        </div>

                        <div className="slot-item-price">
                          <strong>{formatPrice(item.price)}</strong>
                          <span className="slot-stock-ok">✓ Có sẵn</span>
                        </div>
                      </div>

                      <div className="slot-item-actions">
                        <button
                          type="button"
                          className="button button-outline slot-change-btn"
                          onClick={() => setActiveSlotModal(slot)}
                        >
                          <RefreshCw size={14} /> Đổi
                        </button>
                        <button
                          type="button"
                          className="slot-remove-btn"
                          onClick={() => handleRemoveSlot(slot)}
                          aria-label={`Gỡ ${item.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="slot-empty-body">
                      <button
                        type="button"
                        className="button button-outline slot-pick-btn"
                        onClick={() => setActiveSlotModal(slot)}
                      >
                        <Plus size={16} /> Chọn {slotInfo.label}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          {/* Builder Summary Sidebar */}
          <aside className="builder-summary-sidebar" aria-label="Tóm tắt cấu hình">
            <div className="summary-sticky-card">
              <div className="summary-card-header">
                <h2>Cấu hình của bạn</h2>
                <span className="selected-counter">
                  <b>{selectedCount}</b> / 8 linh kiện
                </span>
              </div>

              {/* Power Estimates Box */}
              <div className="wattage-meter-box">
                <div className="wattage-meter-label">
                  <span>
                    <Zap size={15} /> Công suất ước tính:
                  </span>
                  <strong>~{estimatedWattage} Watt</strong>
                </div>
                <div className="wattage-bar-track">
                  <div
                    className="wattage-bar-fill"
                    style={{
                      width: `${Math.min(100, (estimatedWattage / 850) * 100)}%`,
                    }}
                  />
                </div>
                <small className="wattage-advice">
                  {selection.psu
                    ? `Nguồn đã chọn: ${selection.psu.specs.wattage}W (${
                        (selection.psu.specs.wattage ?? 0) >= estimatedWattage + 150
                          ? "Đủ tải an toàn"
                          : "Cảnh báo thiếu công suất"
                      })`
                    : "Khuyến nghị nguồn PSU: 650W — 850W"}
                </small>
              </div>

              {/* Free Assembly Option */}
              <label className="assembly-checkbox-row">
                <input
                  type="checkbox"
                  checked={needAssembly}
                  onChange={(e) => setNeedAssembly(e.target.checked)}
                />
                <div>
                  <strong>Yêu cầu lắp ráp & cài Win miễn phí</strong>
                  <p>Kỹ thuật viên PC Store sẽ ráp máy và stress test 24h trước khi gửi.</p>
                </div>
              </label>

              {/* Cost Calculation */}
              <div className="builder-pricing-box">
                <div className="price-row">
                  <span>Tổng tiền linh kiện:</span>
                  <strong className="builder-total-price">
                    {formatPrice(totalCost)}
                  </strong>
                </div>
                <div className="price-row">
                  <span>Công lắp ráp & cài đặt:</span>
                  <span className="free-tag">0₫ (Miễn phí)</span>
                </div>
                <div className="price-row">
                  <span>Vận chuyển toàn quốc:</span>
                  <span className="free-tag">Miễn phí</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="builder-cta-actions">
                <button
                  type="button"
                  className="button button-primary builder-add-cart-btn"
                  onClick={handleAddToCart}
                  disabled={selectedCount === 0}
                >
                  <ShoppingCart size={18} /> Thêm cả bộ vào giỏ hàng
                </button>
                <div className="builder-secondary-actions">
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={handleClearBuild}
                    disabled={selectedCount === 0}
                  >
                    Làm mới dàn PC
                  </button>
                  <Link
                    href="/checkout"
                    className="button button-outline"
                    onClick={handleAddToCart}
                  >
                    Mua ngay <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Modal: Pick Component for Slot */}
        {activeSlotModal && (
          <div
            className="modal-overlay"
            onClick={() => setActiveSlotModal(null)}
          >
            <div
              className="modal-content builder-picker-modal"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="picker-modal-header">
                <div>
                  <span className="eyebrow">Danh mục linh kiện</span>
                  <h2>Chọn {slotLabels[activeSlotModal].label}</h2>
                </div>
                <button
                  type="button"
                  className="picker-close-btn"
                  onClick={() => setActiveSlotModal(null)}
                  aria-label="Đóng"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search & Brand Filter Toolbar */}
              <div className="picker-toolbar">
                <label className="picker-search-field">
                  <Search size={16} />
                  <input
                    type="text"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder="Tìm theo tên hoặc thông số..."
                  />
                  {modalSearch && (
                    <button onClick={() => setModalSearch("")}>
                      <X size={14} />
                    </button>
                  )}
                </label>

                <div className="picker-brand-chips">
                  {availableBrandsInSlot.map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      className={`picker-brand-chip ${
                        modalBrand === brand ? "active" : ""
                      }`}
                      onClick={() => setModalBrand(brand)}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product List */}
              <div className="picker-products-list">
                {modalProducts.length > 0 ? (
                  modalProducts.map((prod) => (
                    <div key={prod.id} className="picker-product-row">
                      <div
                        className="picker-prod-mark"
                        style={{ background: prod.accent }}
                      >
                        {prod.name.slice(0, 1)}
                      </div>

                      <div className="picker-prod-info">
                        <span className="picker-prod-brand">{prod.brand}</span>
                        <h3>{prod.name}</h3>

                        <div className="picker-prod-specs">
                          {prod.specs.socket && (
                            <span>Socket: {prod.specs.socket}</span>
                          )}
                          {prod.specs.ramType && (
                            <span>Chuẩn: {prod.specs.ramType}</span>
                          )}
                          {prod.specs.formFactor && (
                            <span>Kích thước: {prod.specs.formFactor}</span>
                          )}
                          {prod.specs.wattage && (
                            <span>{prod.specs.wattage}W</span>
                          )}
                        </div>
                      </div>

                      <div className="picker-prod-action">
                        <strong className="picker-prod-price">
                          {formatPrice(prod.price)}
                        </strong>
                        <button
                          type="button"
                          className="button button-primary picker-select-btn"
                          onClick={() => handleSelectComponent(prod)}
                        >
                          Chọn món này
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="picker-empty-results">
                    <p>Không tìm thấy linh kiện nào khớp với từ khóa đã lọc.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Compatibility Rules Checklist Detail */}
        {showRulesModal && (
          <div className="modal-overlay" onClick={() => setShowRulesModal(false)}>
            <div
              className="modal-content rules-checklist-modal"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rules-modal-header">
                <h2>Báo cáo kiểm tra tương thích phần cứng</h2>
                <button
                  type="button"
                  className="picker-close-btn"
                  onClick={() => setShowRulesModal(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <p className="rules-modal-desc">
                Hệ thống tự động đối chiếu thông số kỹ thuật (Socket, RAM Type, TDP, Kích thước case) dựa trên dữ liệu chuẩn từ nhà sản xuất.
              </p>

              <div className="rules-list">
                {compatibilityRules.map((rule) => (
                  <div key={rule.id} className={`rule-item-card status-${rule.status.toLowerCase()}`}>
                    <div className="rule-status-badge">
                      {rule.status === "PASS" && "PASS · TƯƠNG THÍCH"}
                      {rule.status === "FAIL" && "FAIL · XUNG ĐỘT"}
                      {rule.status === "UNKNOWN" && "CHƯA KIỂM TRA"}
                    </div>
                    <h4>{rule.name}</h4>
                    <p>{rule.message}</p>
                  </div>
                ))}
              </div>

              <div className="rules-modal-footer">
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => setShowRulesModal(false)}
                >
                  Đã hiểu, quay lại dàn máy
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

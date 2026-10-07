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
      <main className="container py-11 pb-24 min-h-[80vh]">
        {/* Header Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 items-center mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#006ce1] block mb-1">
              PC Store · Intelligent Compatibility Engine
            </span>
            <h1 className="font-heading text-3xl md:text-5xl font-extrabold tracking-tight my-2.5 text-ink">
              Tự ráp PC đỉnh cao,
              <br />
              <em className="text-[#006ce1] not-italic">chuẩn từng chân cắm.</em>
            </h1>
            <p className="text-muted text-sm md:text-base max-w-xl leading-relaxed m-0">
              Chọn từng món linh kiện, tự động tính nguồn (Watt) và kiểm tra tương thích socket CPU, bo mạch chủ, RAM và thùng máy trong thời gian thực.
            </p>
          </div>

          <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-sm">
            <span className="flex items-center gap-2 text-xs font-bold text-ink mb-3.5">
              <Sparkles size={16} className="text-[#006ce1]" /> Hoặc chọn cấu hình chuẩn hóa sẵn:
            </span>
            <div className="flex flex-col gap-2.5">
              {presetBuilds.map((preset, idx) => (
                <button
                  key={preset.name}
                  type="button"
                  className="flex items-center justify-between p-3 px-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-[#006ce1] hover:shadow-sm rounded-xl cursor-pointer transition-all text-left"
                  onClick={() => handleLoadPreset(idx)}
                >
                  <span className="font-nav text-xs md:text-sm font-bold text-ink">{preset.name}</span>
                  <span className="font-specs text-[11px] font-bold tracking-wider uppercase bg-[#edf5fe] text-[#006ce1] px-2 py-0.5 rounded-md">
                    {preset.tag}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Compatibility Alert Banner */}
        <div
          className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4.5 px-6 rounded-2xl mb-9 border ${
            hasFail
              ? "bg-red-50 border-red-200 text-red-900"
              : allPass
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-slate-50 border-slate-200 text-slate-800"
          }`}
        >
          <div className="flex items-center gap-4">
            {hasFail ? (
              <AlertTriangle size={24} className="text-red-600 shrink-0" />
            ) : allPass ? (
              <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
            ) : (
              <HelpCircle size={24} className="text-slate-500 shrink-0" />
            )}
            <div>
              <strong className="block text-sm md:text-base font-bold mb-0.5">
                {hasFail
                  ? "Phát hiện xung đột linh kiện!"
                  : allPass
                    ? "Cấu hình tương thích hoàn hảo (100% Pass)"
                    : `Đã chọn ${selectedCount} / 8 nhóm linh kiện`}
              </strong>
              <p className="m-0 text-xs md:text-sm opacity-90 leading-relaxed">
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
            className="bg-white border border-current text-current text-xs font-bold py-2 px-3.5 rounded-xl cursor-pointer whitespace-nowrap hover:opacity-80 transition-opacity"
            onClick={() => setShowRulesModal(true)}
          >
            Chi tiết 5 quy tắc ({compatibilityRules.filter((r) => r.status === "PASS").length}/5)
          </button>
        </div>

        {/* Main Grid: Slots on Left, Summary on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-8 items-start">
          {/* Slots List */}
          <section className="flex flex-col gap-4" aria-label="8 nhóm linh kiện PC">
            {slots.map((slot) => {
              const item = selection[slot];
              const slotInfo = slotLabels[slot];
              const Icon = slotIcons[slot];

              return (
                <article
                  key={slot}
                  className={`bg-white border rounded-2xl p-5 md:p-6 transition-colors ${
                    item ? "border-slate-300" : "border-[#e0e0e0]"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 grid place-items-center text-[#006ce1] shrink-0">
                      <Icon size={18} />
                    </div>
                    <div>
                      <span className="block font-heading text-sm font-bold text-ink">{slotInfo.label}</span>
                      <small className="block text-[11px] text-muted">{slotInfo.desc}</small>
                    </div>
                  </div>

                  {item ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4.5 pt-3 border-t border-slate-100">
                      <div
                        className="w-16 h-16 rounded-xl grid place-items-center text-white font-gaming text-xl font-bold shrink-0"
                        style={{ background: item.accent }}
                      >
                        {item.name.slice(0, 1)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="font-specs text-[11px] font-bold tracking-wider uppercase text-muted block mb-0.5">
                          {item.brand}
                        </span>
                        <h3 className="font-heading text-sm md:text-base font-bold text-ink m-0 mb-1.5 truncate">
                          {item.name}
                        </h3>

                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {item.specs.socket && (
                            <span className="font-specs text-[11px] font-bold tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              Socket: {item.specs.socket}
                            </span>
                          )}
                          {item.specs.ramType && (
                            <span className="font-specs text-[11px] font-bold tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {item.specs.ramType}
                            </span>
                          )}
                          {item.specs.formFactor && (
                            <span className="font-specs text-[11px] font-bold tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              Form: {item.specs.formFactor}
                            </span>
                          )}
                          {item.specs.wattage && (
                            <span className="font-specs text-[11px] font-bold tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {item.specs.wattage}W {item.specs.efficiency}
                            </span>
                          )}
                          {item.specs.capacityGb && (
                            <span className="font-specs text-[11px] font-bold tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {item.specs.capacityGb}GB
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5">
                          <strong className="font-specs text-base font-bold text-ink">
                            {formatPrice(item.price)}
                          </strong>
                          <span className="text-xs text-emerald-600 font-semibold">✓ Có sẵn</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-ink border border-[#e0e0e0] hover:border-slate-400 bg-white transition-colors cursor-pointer"
                          onClick={() => setActiveSlotModal(slot)}
                        >
                          <RefreshCw size={14} /> Đổi
                        </button>
                        <button
                          type="button"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                          onClick={() => handleRemoveSlot(slot)}
                          aria-label={`Gỡ ${item.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1">
                      <button
                        type="button"
                        className="w-full inline-flex items-center justify-center gap-2 p-3 font-nav text-xs md:text-sm font-bold border border-dashed border-slate-300 hover:border-[#006ce1] hover:text-[#006ce1] hover:bg-blue-50/50 rounded-xl transition-all cursor-pointer bg-slate-50/60"
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
          <aside className="lg:sticky lg:top-24" aria-label="Tóm tắt cấu hình">
            <div className="bg-white border border-[#e0e0e0] rounded-2xl p-7 shadow-sm">
              <div className="flex items-center justify-between mb-5 pb-3.5 border-b border-[#e0e0e0]">
                <h2 className="text-lg font-bold text-ink m-0">Cấu hình của bạn</h2>
                <span className="text-xs text-muted">
                  <b className="text-[#006ce1] text-base">{selectedCount}</b> / 8 linh kiện
                </span>
              </div>

              {/* Power Estimates Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4.5">
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="flex items-center gap-1 font-semibold text-ink">
                    <Zap size={15} className="text-amber-500" /> Công suất ước tính:
                  </span>
                  <strong className="font-specs text-base font-bold text-amber-600">
                    ~{estimatedWattage} Watt
                  </strong>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (estimatedWattage / 850) * 100)}%`,
                    }}
                  />
                </div>
                <small className="block text-[11px] text-slate-500 leading-relaxed">
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
              <label className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3.5 mb-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={needAssembly}
                  onChange={(e) => setNeedAssembly(e.target.checked)}
                  className="mt-0.5 text-[#006ce1]"
                />
                <div>
                  <strong className="block text-xs md:text-sm text-blue-900 mb-0.5">
                    Yêu cầu lắp ráp & cài Win miễn phí
                  </strong>
                  <p className="m-0 text-[11px] text-blue-700 leading-relaxed">
                    Kỹ thuật viên PC Store sẽ ráp máy và stress test 24h trước khi gửi.
                  </p>
                </div>
              </label>

              {/* Cost Calculation */}
              <div className="space-y-2.5 mb-6 text-xs md:text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Tổng tiền linh kiện:</span>
                  <strong className="font-specs text-xl md:text-2xl font-bold text-ink">
                    {formatPrice(totalCost)}
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Công lắp ráp & cài đặt:</span>
                  <span className="text-emerald-600 font-bold">0₫ (Miễn phí)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Vận chuyển toàn quốc:</span>
                  <span className="text-emerald-600 font-bold">Miễn phí</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  className="w-full p-3.5 font-gaming text-xs md:text-sm font-bold tracking-wider uppercase bg-[#006ce1] hover:bg-[#0051a8] text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  onClick={handleAddToCart}
                  disabled={selectedCount === 0}
                >
                  <ShoppingCart size={18} /> Thêm cả bộ vào giỏ hàng
                </button>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    className="p-2.5 text-xs font-semibold text-center border border-[#e0e0e0] hover:border-slate-400 bg-white rounded-xl cursor-pointer disabled:opacity-50"
                    onClick={handleClearBuild}
                    disabled={selectedCount === 0}
                  >
                    Làm mới dàn PC
                  </button>
                  <Link
                    href="/checkout"
                    className="p-2.5 text-xs font-semibold text-center border border-[#e0e0e0] hover:border-slate-400 bg-white rounded-xl inline-flex items-center justify-center gap-1"
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 grid place-items-center p-5"
            onClick={() => setActiveSlotModal(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-[680px] w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start p-6 pb-4 border-b border-[#e0e0e0]">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#006ce1] block mb-1">
                    Danh mục linh kiện
                  </span>
                  <h2 className="text-xl font-bold text-ink m-0">Chọn {slotLabels[activeSlotModal].label}</h2>
                </div>
                <button
                  type="button"
                  className="text-muted hover:text-ink p-1 rounded-lg cursor-pointer bg-transparent border-none"
                  onClick={() => setActiveSlotModal(null)}
                  aria-label="Đóng"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search & Brand Filter Toolbar */}
              <div className="p-4 px-6 bg-slate-50 border-b border-[#e0e0e0] flex flex-col gap-3">
                <label className="flex items-center gap-2.5 bg-white border border-[#e0e0e0] rounded-xl px-3.5 py-2">
                  <Search size={16} className="text-muted shrink-0" />
                  <input
                    type="text"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder="Tìm theo tên hoặc thông số..."
                    className="flex-1 border-none bg-transparent text-sm outline-none"
                  />
                  {modalSearch && (
                    <button type="button" onClick={() => setModalSearch("")} className="text-muted hover:text-ink border-none bg-transparent cursor-pointer">
                      <X size={14} />
                    </button>
                  )}
                </label>

                <div className="flex flex-wrap gap-1.5">
                  {availableBrandsInSlot.map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                        modalBrand === brand
                          ? "bg-ink text-white"
                          : "bg-white text-slate-700 border border-slate-200 hover:border-[#006ce1]"
                      }`}
                      onClick={() => setModalBrand(brand)}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product List */}
              <div className="flex-1 overflow-y-auto p-4 px-6 flex flex-col gap-3">
                {modalProducts.length > 0 ? (
                  modalProducts.map((prod) => (
                    <div key={prod.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-3.5 px-4.5 border border-[#e0e0e0] hover:border-[#006ce1] hover:shadow-sm rounded-xl transition-all bg-white">
                      <div
                        className="w-12 h-12 rounded-xl grid place-items-center text-white font-gaming text-xl font-bold shrink-0"
                        style={{ background: prod.accent }}
                      >
                        {prod.name.slice(0, 1)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="font-specs text-[11px] font-bold tracking-wider uppercase text-muted block mb-0.5">
                          {prod.brand}
                        </span>
                        <h3 className="font-heading text-sm font-bold text-ink m-0 mb-1 truncate">{prod.name}</h3>

                        <div className="flex flex-wrap gap-1.5 text-xs text-slate-600">
                          {prod.specs.socket && (
                            <span className="font-specs font-bold bg-slate-100 px-1.5 py-0.5 rounded">Socket: {prod.specs.socket}</span>
                          )}
                          {prod.specs.ramType && (
                            <span className="font-specs font-bold bg-slate-100 px-1.5 py-0.5 rounded">Chuẩn: {prod.specs.ramType}</span>
                          )}
                          {prod.specs.formFactor && (
                            <span className="font-specs font-bold bg-slate-100 px-1.5 py-0.5 rounded">Kích thước: {prod.specs.formFactor}</span>
                          )}
                          {prod.specs.wattage && (
                            <span className="font-specs font-bold bg-slate-100 px-1.5 py-0.5 rounded">{prod.specs.wattage}W</span>
                          )}
                        </div>
                      </div>

                      <div className="sm:text-right shrink-0 flex sm:flex-col justify-between items-center sm:items-end gap-2">
                        <strong className="font-specs text-base font-bold text-ink block">
                          {formatPrice(prod.price)}
                        </strong>
                        <button
                          type="button"
                          className="px-3.5 py-1.5 font-nav text-xs font-bold bg-[#006ce1] hover:bg-[#0051a8] text-white rounded-lg cursor-pointer transition-colors border-none"
                          onClick={() => handleSelectComponent(prod)}
                        >
                          Chọn món này
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-muted text-sm">
                    <p>Không tìm thấy linh kiện nào khớp với từ khóa đã lọc.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Compatibility Rules Checklist Detail */}
        {showRulesModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 grid place-items-center p-5" onClick={() => setShowRulesModal(false)}>
            <div
              className="bg-white rounded-2xl p-7 md:p-8 max-w-[580px] w-full shadow-2xl"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-ink m-0">Báo cáo kiểm tra tương thích phần cứng</h2>
                <button
                  type="button"
                  className="text-muted hover:text-ink p-1 rounded-lg cursor-pointer bg-transparent border-none"
                  onClick={() => setShowRulesModal(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-xs md:text-sm text-muted m-0 mb-5 leading-relaxed">
                Hệ thống tự động đối chiếu thông số kỹ thuật (Socket, RAM Type, TDP, Kích thước case) dựa trên dữ liệu chuẩn từ nhà sản xuất.
              </p>

              <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto mb-6">
                {compatibilityRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-xl border ${
                      rule.status === "PASS"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                        : rule.status === "FAIL"
                          ? "bg-red-50 border-red-200 text-red-950"
                          : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  >
                    <span
                      className={`inline-block text-[10px] font-extrabold tracking-wider px-1.5 py-0.5 rounded mb-1.5 ${
                        rule.status === "PASS"
                          ? "bg-emerald-100 text-emerald-800"
                          : rule.status === "FAIL"
                            ? "bg-red-100 text-red-800"
                            : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {rule.status === "PASS" && "PASS · TƯƠNG THÍCH"}
                      {rule.status === "FAIL" && "FAIL · XUNG ĐỘT"}
                      {rule.status === "UNKNOWN" && "CHƯA KIỂM TRA"}
                    </span>
                    <h4 className="m-0 mb-1 text-sm font-bold">{rule.name}</h4>
                    <p className="m-0 text-xs text-slate-600 leading-relaxed">{rule.message}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm cursor-pointer border-none"
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

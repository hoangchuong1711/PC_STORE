"use client";

import { Cpu } from "lucide-react";
import { productSpecFields, type ProductComponentType } from "../../lib/product-spec-fields";

type Props = {
  type: ProductComponentType;
  value: Record<string, unknown> | null | undefined;
  onChange: (value: Record<string, unknown>) => void;
};

export function ProductSpecEditor({ type, value, onChange }: Props) {
  return (
    <div className="rounded-xl border border-admin-line bg-white p-4.5 sm:p-5 shadow-2xs">
      <div className="flex items-center justify-between gap-3 pb-3.5 mb-4 border-b border-admin-line">
        <div className="flex items-center gap-2">
          <Cpu size={17} className="text-admin-blue shrink-0" />
          <h3 className="text-sm font-bold text-admin-ink tracking-tight m-0">
            Thông số kỹ thuật Builder
          </h3>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-admin-blue-soft text-admin-blue border border-admin-blue/20 uppercase tracking-wider">
            {type}
          </span>
        </div>
        <span className="hidden sm:inline-block text-[11px] text-admin-muted">
          Dữ liệu dùng kiểm tra tương thích trên PC Builder
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {productSpecFields[type]
          .filter((field) => {
            if (type !== "COOLER") return true;
            if (field.key === "heightMm" && value?.coolerType !== "AIR") return false;
            if (field.key === "radiatorSizeMm" && value?.coolerType !== "AIO" && value?.coolerType !== "LIQUID") {
              return false;
            }
            return true;
          })
          .map((field) => {
            // Trường hợp 1: Checkbox tag chọn nhiều giá trị (Form factor case, Socket tản nhiệt)
            if (field.kind === "codes") {
              const currentArr: string[] = Array.isArray(value?.[field.key])
                ? (value[field.key] as string[])
                : String(value?.[field.key] ?? "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);

              return (
                <div key={field.key} className="flex flex-col gap-2 col-span-1 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-admin-muted">
                      {field.label} {field.optional ? "(tùy chọn)" : ""}
                    </span>
                    <span className="text-[10px] text-admin-soft">Tick chọn các mục hỗ trợ</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {(field.options || []).map((opt) => {
                      const checked = currentArr.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            const next = checked
                              ? currentArr.filter((c) => c !== opt)
                              : [...currentArr, opt];
                            onChange({ ...value, [field.key]: next });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                            checked
                              ? "bg-admin-blue text-white border-admin-blue shadow-xs"
                              : "bg-white text-admin-ink border-admin-line hover:border-admin-soft"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] font-bold ${
                              checked
                                ? "bg-white text-admin-blue border-white"
                                : "border-admin-soft"
                            }`}
                          >
                            {checked ? "✓" : ""}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // Trường hợp 2: Dropdown chọn 1 giá trị chuẩn (Socket, RAM Type, Form Factor, Cooler Type, Modular...)
            if (field.options && field.options.length > 0) {
              const currentValue = String(value?.[field.key] ?? "");
              return (
                <label key={field.key} className="flex flex-col gap-1.5 text-[11px] font-bold text-admin-muted">
                  {field.label} {field.optional ? "(tùy chọn)" : ""}
                  <select
                    required={!field.optional}
                    value={currentValue}
                    onChange={(event) => {
                      const nextVal = event.target.value;
                      if (field.key === "coolerType") {
                        onChange({
                          ...value,
                          coolerType: nextVal,
                          heightMm: "",
                          radiatorSizeMm: "",
                        });
                      } else {
                        onChange({ ...value, [field.key]: nextVal });
                      }
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue transition-colors cursor-pointer"
                  >
                    <option value="">-- Chọn {field.label.toLowerCase()} --</option>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              );
            }

            // Trường hợp 3: Ô nhập số có đơn vị cố định ở đuôi (GHz, W, mm, GB, Nhân, Luồng...)
            if (field.kind === "integer" || field.kind === "decimal") {
              return (
                <label key={field.key} className="flex flex-col gap-1.5 text-[11px] font-bold text-admin-muted">
                  {field.label} {field.optional ? "(tùy chọn)" : ""}
                  <div className="relative flex items-center">
                    <input
                      required={!field.optional || field.key === "heightMm" || field.key === "radiatorSizeMm"}
                      type="number"
                      min={field.min}
                      step={field.kind === "integer" ? 1 : "any"}
                      placeholder={field.hint || "0"}
                      value={String(value?.[field.key] ?? "")}
                      onChange={(event) => onChange({ ...value, [field.key]: event.target.value })}
                      className={`w-full h-9 pl-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue transition-colors ${
                        field.unit ? "pr-14" : "pr-3"
                      }`}
                    />
                    {field.unit && (
                      <span className="absolute right-3 text-xs font-bold text-admin-muted pointer-events-none select-none">
                        {field.unit}
                      </span>
                    )}
                  </div>
                </label>
              );
            }

            // Trường hợp 4: Text input thông thường (Chipset, etc.)
            return (
              <label key={field.key} className="flex flex-col gap-1.5 text-[11px] font-bold text-admin-muted">
                {field.label} {field.optional ? "(tùy chọn)" : ""}
                <input
                  required={!field.optional}
                  type="text"
                  placeholder={field.hint}
                  value={String(value?.[field.key] ?? "")}
                  onChange={(event) => onChange({ ...value, [field.key]: event.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue transition-colors"
                />
              </label>
            );
          })}
      </div>
    </div>
  );
}

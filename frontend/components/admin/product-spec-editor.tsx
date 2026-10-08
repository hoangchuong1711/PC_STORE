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
    <div className="rounded-lg border border-slate-300 bg-slate-50/70 p-3.5 my-1">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 pb-2.5 mb-3 border-b border-slate-200">
        <Cpu size={15} className="text-blue-600" />
        <strong>Thông số kỹ thuật {type}</strong>
      </div>
      <p className="mb-3 text-[11px] text-slate-600">
        Nhập đủ thông số để Builder kiểm tra tương thích. Socket và form factor phải có trong danh mục chuẩn.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {productSpecFields[type]
          .filter((field) => type !== "COOLER" ||
            (field.key !== "heightMm" || value?.coolerType === "AIR") &&
            (field.key !== "radiatorSizeMm" || value?.coolerType === "AIO" || value?.coolerType === "LIQUID"))
          .map((field) => (
          <label key={field.key} className="flex flex-col gap-1.5 text-[11px] font-bold text-admin-muted">
            {field.label}{field.optional ? " (nếu áp dụng)" : ""}
            {field.key === "coolerType" ? (
              <select
                required
                value={String(value?.coolerType ?? "")}
                onChange={(event) => onChange({ ...value, coolerType: event.target.value,
                  heightMm: "", radiatorSizeMm: "" })}
                className="w-full h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink"
              >
                <option value="">Chọn loại tản nhiệt</option>
                <option value="AIR">Tản khí (AIR)</option>
                <option value="AIO">Tản nước AIO</option>
                <option value="LIQUID">Tản nước khác (LIQUID)</option>
              </select>
            ) : <input
              required={!field.optional || field.key === "heightMm" || field.key === "radiatorSizeMm"}
              type={field.kind === "integer" || field.kind === "decimal" ? "number" : "text"}
              min={field.min}
              step={field.kind === "integer" ? 1 : field.kind === "decimal" ? "any" : undefined}
              placeholder={field.hint}
              value={Array.isArray(value?.[field.key]) ? (value[field.key] as string[]).join(", ") : String(value?.[field.key] ?? "")}
              onChange={(event) => onChange({ ...value, [field.key]: event.target.value })}
              className="w-full h-9 px-3 rounded-lg border border-admin-line bg-white text-xs text-admin-ink focus:outline-hidden focus:border-admin-blue focus:ring-1 focus:ring-admin-blue transition-colors"
            />}
          </label>
        ))}
      </div>
    </div>
  );
}

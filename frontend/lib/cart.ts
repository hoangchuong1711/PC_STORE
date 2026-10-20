export type CartItem = { id: string; quantity: number };

/**
 * Convert only a real catalog identifier to the numeric id expected by the
 * backend. Legacy UI fixtures use ids such as `p3`; those ids are deliberately
 * rejected because `p3` is not proof that the fixture represents product 3.
 */
export function parseServerProductId(id: string | number): number | null {
  if (typeof id === "number") {
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }

  if (!/^[1-9]\d*$/.test(id)) return null;
  const parsed = Number(id);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function summarizeSelection(
  items: readonly { id: string; cartItemId?: number; unitPrice: number; quantity: number }[],
  selectedIds: readonly string[],
) {
  const selected = new Set(selectedIds);
  const lines = items.filter((item) => selected.has(item.id));
  return {
    subtotal: lines.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    cartItemIds: lines.flatMap((item) => item.cartItemId === undefined ? [] : [item.cartItemId]),
  };
}

export function changeQuantity(
  items: CartItem[],
  id: string,
  quantity: number,
  stock: number,
): CartItem[] {
  const bounded = Math.max(0, Math.min(stock, Math.floor(quantity)));
  return items.flatMap((item) =>
    item.id !== id ? [item] : bounded > 0 ? [{ id, quantity: bounded }] : [],
  );
}

export function addItem(
  items: CartItem[],
  id: string,
  quantity: number,
  stock: number,
): CartItem[] {
  if (stock <= 0 || quantity <= 0) return items;
  const existing = items.find((item) => item.id === id);
  if (existing)
    return changeQuantity(items, id, existing.quantity + quantity, stock);
  return [...items, { id, quantity: Math.min(stock, Math.floor(quantity)) }];
}

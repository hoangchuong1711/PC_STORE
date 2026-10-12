export type CartItem = { id: string; quantity: number };

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

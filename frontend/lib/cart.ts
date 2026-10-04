export type CartItem = { id: string; quantity: number };

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

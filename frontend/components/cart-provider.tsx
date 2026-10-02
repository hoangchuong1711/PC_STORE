"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { addItem, changeQuantity, type CartItem } from "../lib/cart";
import { products } from "../lib/products";

type CartContextValue = {
  items: CartItem[];
  add: (id: string, quantity: number) => void;
  update: (id: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  function add(id: string, quantity: number) {
    const product = products.find((item) => item.id === id);
    if (product)
      setItems((current) => addItem(current, id, quantity, product.stock));
  }

  function update(id: string, quantity: number) {
    const product = products.find((item) => item.id === id);
    if (product)
      setItems((current) =>
        changeQuantity(current, id, quantity, product.stock),
      );
  }

  return (
    <CartContext.Provider
      value={{ items, add, update, clear: () => setItems([]) }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("CartProvider is required");
  return context;
}

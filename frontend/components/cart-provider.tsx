"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { addItem, changeQuantity, type CartItem } from "../lib/cart";
import { products } from "../lib/products";

type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  add: (id: string, quantity: number) => void;
  update: (id: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  function add(id: string, quantity: number) {
    const product = products.find((item) => item.id === id);
    if (product) {
      setItems((current) => addItem(current, id, quantity, product.stock));
      setIsOpen(true);
    }
  }

  function update(id: string, quantity: number) {
    const product = products.find((item) => item.id === id);
    if (product) {
      setItems((current) =>
        changeQuantity(current, id, quantity, product.stock),
      );
    }
  }

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        add,
        update,
        clear: () => setItems([]),
      }}
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

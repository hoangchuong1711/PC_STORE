"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-provider";
import { cartApi, type CartResponse, type CartItemResponse } from "../lib/cart-api";
import { addItem as localAddItem, changeQuantity as localChangeQuantity } from "../lib/cart";
import { products } from "../lib/products";

export type UnifiedCartItem = {
  cartItemId?: number;
  productId?: number;
  id: string; // compatibility: string identifier
  name: string;
  price: number;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  stock?: number;
  product?: {
    id: string;
    productId: number;
    name: string;
    price: number;
    stock: number;
    brand: string;
    category: string;
    accent: string;
    slug: string;
  };
};

type CartContextValue = {
  items: UnifiedCartItem[];
  totalAmount: number;
  totalCount: number;
  isOpen: boolean;
  loading: boolean;
  error: string | null;
  openCart: () => void;
  closeCart: () => void;
  add: (id: string | number, quantity: number) => Promise<void>;
  update: (id: string | number, quantity: number) => Promise<void>;
  remove: (id: string | number) => Promise<void>;
  clear: () => Promise<void>;
  refreshCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

function mapServerCart(serverCart: CartResponse): UnifiedCartItem[] {
  return serverCart.items.map((item: CartItemResponse) => {
    const id = String(item.productId);
    const fallback = products.find((p) => p.id === id || p.id === `p${id}`);
    return {
      cartItemId: item.cartItemId,
      productId: item.productId,
      id,
      name: item.name,
      price: item.unitPrice,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      stock: item.availableQuantity ?? fallback?.stock ?? 99,
      product: {
        id,
        productId: item.productId,
        name: item.name,
        price: item.unitPrice,
        stock: item.availableQuantity ?? fallback?.stock ?? 99,
        brand: fallback?.brand ?? "PC Store",
        category: fallback?.category ?? "Linh kiện",
        accent: fallback?.accent ?? "#00539b",
        slug: fallback?.slug ?? id,
      },
    };
  });
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<UnifiedCartItem[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCart = useCallback(async () => {
    if (!user) {
      // Guest mode - items remain in local state
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const serverCart = await cartApi.get();
      const mapped = mapServerCart(serverCart);
      setItems(mapped);
      setTotalAmount(serverCart.totalAmount);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể tải giỏ hàng.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void refreshCart();
    } else {
      // When logged out, reset cart or clear server bindings
      setItems([]);
      setTotalAmount(0);
    }
  }, [user, refreshCart]);

  const add = useCallback(
    async (id: string | number, quantity: number) => {
      setError(null);
      let numericId: number | null = null;
      if (typeof id === "number" && Number.isInteger(id) && id > 0) {
        numericId = id;
      } else if (typeof id === "string") {
        const parsed = parseInt(id.replace(/^p-?/i, ""), 10);
        if (Number.isInteger(parsed) && parsed > 0) {
          numericId = parsed;
        }
      }

      if (user && numericId !== null) {
        try {
          setLoading(true);
          const serverCart = await cartApi.add(numericId, quantity);
          setItems(mapServerCart(serverCart));
          setTotalAmount(serverCart.totalAmount);
          setIsOpen(true);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Không thể thêm vào giỏ hàng.";
          setError(msg);
          throw err;
        } finally {
          setLoading(false);
        }
      } else {
        // Fallback for guest or mock product
        const idStr = String(id);
        const product = products.find((item) => item.id === idStr);
        if (product) {
          setItems((current) => {
            const localItems = current.map((i) => ({ id: i.id, quantity: i.quantity }));
            const updated = localAddItem(localItems, idStr, quantity, product.stock);
            return updated.map((u) => {
              const p = products.find((x) => x.id === u.id) ?? product;
              return {
                id: u.id,
                name: p.name,
                price: p.price,
                unitPrice: p.price,
                quantity: u.quantity,
                lineTotal: p.price * u.quantity,
                stock: p.stock,
                product: {
                  id: p.id,
                  productId: 1,
                  name: p.name,
                  price: p.price,
                  stock: p.stock,
                  brand: p.brand,
                  category: p.category,
                  accent: p.accent,
                  slug: p.slug,
                },
              };
            });
          });
          setIsOpen(true);
        }
      }
    },
    [user],
  );

  const update = useCallback(
    async (id: string | number, quantity: number) => {
      setError(null);
      // id can be cartItemId or productId
      const targetItem = items.find(
        (i) =>
          (i.cartItemId !== undefined && String(i.cartItemId) === String(id)) ||
          i.id === String(id) ||
          (i.productId !== undefined && String(i.productId) === String(id)),
      );

      if (user && targetItem?.cartItemId !== undefined) {
        try {
          setLoading(true);
          if (quantity <= 0) {
            await cartApi.remove(targetItem.cartItemId);
            await refreshCart();
          } else {
            const serverCart = await cartApi.update(targetItem.cartItemId, quantity);
            setItems(mapServerCart(serverCart));
            setTotalAmount(serverCart.totalAmount);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Không thể cập nhật giỏ hàng.";
          setError(msg);
          throw err;
        } finally {
          setLoading(false);
        }
      } else {
        // Fallback for guest
        const idStr = String(id);
        const product = products.find((item) => item.id === idStr);
        if (product) {
          setItems((current) => {
            const localItems = current.map((i) => ({ id: i.id, quantity: i.quantity }));
            const updated = localChangeQuantity(localItems, idStr, quantity, product.stock);
            return updated.map((u) => {
              const p = products.find((x) => x.id === u.id) ?? product;
              return {
                id: u.id,
                name: p.name,
                price: p.price,
                unitPrice: p.price,
                quantity: u.quantity,
                lineTotal: p.price * u.quantity,
                stock: p.stock,
                product: {
                  id: p.id,
                  productId: 1,
                  name: p.name,
                  price: p.price,
                  stock: p.stock,
                  brand: p.brand,
                  category: p.category,
                  accent: p.accent,
                  slug: p.slug,
                },
              };
            });
          });
        }
      }
    },
    [user, items, refreshCart],
  );

  const remove = useCallback(
    async (id: string | number) => {
      await update(id, 0);
    },
    [update],
  );

  const clear = useCallback(async () => {
    setItems([]);
    setTotalAmount(0);
    if (user) {
      // Reload cart from backend
      try {
        await refreshCart();
      } catch {
        // Ignored on clear
      }
    }
  }, [user, refreshCart]);

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const calculatedTotal =
    totalAmount > 0
      ? totalAmount
      : items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        totalAmount: calculatedTotal,
        totalCount,
        isOpen,
        loading,
        error,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        add,
        update,
        remove,
        clear,
        refreshCart,
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

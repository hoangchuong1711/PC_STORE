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
import { parseServerProductId } from "../lib/cart";

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
    productId?: number;
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
  selectedIds: string[];
  toggleSelected: (id: string) => void;
  selectAll: (selected: boolean) => void;
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
  acceptServerCart: (cart: CartResponse) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function mapServerCart(serverCart: CartResponse): UnifiedCartItem[] {
  return serverCart.items.map((item: CartItemResponse) => {
    const id = String(item.productId);
    return {
      cartItemId: item.cartItemId,
      productId: item.productId,
      id,
      name: item.name,
      price: item.unitPrice,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      stock: item.availableQuantity,
      product: {
        id,
        productId: item.productId,
        name: item.name,
        price: item.unitPrice,
        stock: item.availableQuantity,
        brand: "",
        category: "",
        accent: "#00539b",
        slug: id,
      },
    };
  });
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.userId;
  const [items, setItems] = useState<UnifiedCartItem[]>([]);
  const [selection, setSelection] = useState<string[] | null>(null);
  const selectedIds = items.filter((item) => selection === null || selection.includes(item.id)).map((item) => item.id);
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

  const acceptServerCart = useCallback((cart: CartResponse) => {
    setItems(mapServerCart(cart));
    setTotalAmount(cart.totalAmount);
    setIsOpen(true);
    setError(null);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (user) {
        void refreshCart();
      } else {
        // When logged out, reset cart or clear server bindings
        setItems([]);
        setTotalAmount(0);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [user, refreshCart]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSelection(null));
    return () => cancelAnimationFrame(frame);
  }, [userId]);

  const add = useCallback(
    async (id: string | number, quantity: number) => {
      setError(null);
      const numericId = parseServerProductId(id);

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
      } else if (user) {
        const invalidProductError = new Error(
          "Sản phẩm này không tồn tại trong catalog hiện tại và không thể thêm vào giỏ hàng.",
        );
        setError(invalidProductError.message);
        throw invalidProductError;
      } else {
        const loginError = new Error("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.");
        setError(loginError.message);
        throw loginError;
      }
    },
    [user],
  );

  const update = useCallback(
    async (id: string | number, quantity: number) => {
      setError(null);
      // id can be cartItemId or productId
      const targetItem = items.find((i) => i.cartItemId !== undefined && String(i.cartItemId) === String(id)) ?? items.find(
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
        const loginError = new Error("Vui lòng đăng nhập để cập nhật giỏ hàng.");
        setError(loginError.message);
        throw loginError;
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
        selectedIds,
        toggleSelected: (id) => setSelection(selectedIds.includes(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id]),
        selectAll: (selected) => setSelection(selected ? items.map((item) => item.id) : []),
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
        acceptServerCart,
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

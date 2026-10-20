export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  oldPrice?: number;
  stock: number;
  description: string;
  specs: Record<string, string>;
  accent: string;
  badge?: string;
  featured?: boolean;
  rating?: number;
  reviewCount?: number;
  warranty?: string;
  images?: string[];
};

export function formatPrice(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

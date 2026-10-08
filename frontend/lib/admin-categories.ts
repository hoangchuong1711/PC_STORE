export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  productCount: number;
  status: "ACTIVE" | "HIDDEN";
  iconName?: string;
};

export type AdminBrand = {
  id: string;
  name: string;
  origin: string;
  productCount: number;
  status: "ACTIVE" | "HIDDEN";
  website?: string;
};

export const initialAdminCategories: AdminCategory[] = [
  {
    id: "cat-1",
    name: "Laptop",
    slug: "laptop",
    description: "Laptop gaming hiệu năng cao, đồ họa và văn phòng cao cấp.",
    productCount: 14,
    status: "ACTIVE",
    iconName: "Laptop",
  },
  {
    id: "cat-2",
    name: "PC Gaming",
    slug: "pc-gaming",
    description: "Bộ máy tính để bàn dựng sẵn, tối ưu tản nhiệt và đồng bộ cấu hình.",
    productCount: 8,
    status: "ACTIVE",
    iconName: "Monitor",
  },
  {
    id: "cat-3",
    name: "Linh kiện",
    slug: "linh-kien",
    description: "CPU, Mainboard, RAM, GPU, Nguồn, Tản nhiệt và Vỏ case chính hãng.",
    productCount: 42,
    status: "ACTIVE",
    iconName: "Cpu",
  },
  {
    id: "cat-4",
    name: "Phụ kiện",
    slug: "phu-kien",
    description: "Màn hình, bàn phím cơ, chuột gaming và tai nghe cao cấp.",
    productCount: 26,
    status: "ACTIVE",
    iconName: "Headphones",
  },
];

export const initialAdminBrands: AdminBrand[] = [
  { id: "b-1", name: "ASUS", origin: "Đài Loan", productCount: 18, status: "ACTIVE", website: "https://rog.asus.com" },
  { id: "b-2", name: "PC Store", origin: "Việt Nam", productCount: 8, status: "ACTIVE" },
  { id: "b-3", name: "GIGABYTE", origin: "Đài Loan", productCount: 12, status: "ACTIVE", website: "https://gigabyte.com" },
  { id: "b-4", name: "Kingston", origin: "Mỹ", productCount: 15, status: "ACTIVE", website: "https://kingston.com" },
  { id: "b-5", name: "Samsung", origin: "Hàn Quốc", productCount: 9, status: "ACTIVE", website: "https://samsung.com" },
  { id: "b-6", name: "Keychron", origin: "Pháp / Hong Kong", productCount: 11, status: "ACTIVE", website: "https://keychron.com" },
  { id: "b-7", name: "LG", origin: "Hàn Quốc", productCount: 7, status: "ACTIVE", website: "https://lg.com" },
  { id: "b-8", name: "Corsair", origin: "Mỹ", productCount: 14, status: "ACTIVE", website: "https://corsair.com" },
];

export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function filterAdminCategories(
  items: readonly AdminCategory[],
  query: string,
): AdminCategory[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];
  return items.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q),
  );
}

export function filterAdminBrands(
  items: readonly AdminBrand[],
  query: string,
): AdminBrand[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];
  return items.filter(
    (b) =>
      b.name.toLowerCase().includes(q) ||
      b.origin.toLowerCase().includes(q),
  );
}



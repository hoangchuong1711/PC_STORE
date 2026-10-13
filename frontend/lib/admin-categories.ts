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



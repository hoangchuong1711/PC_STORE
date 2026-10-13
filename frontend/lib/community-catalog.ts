import type { CatalogProduct } from "./catalog-api";
import type { PostComponent } from "./community";

export type CommunityCatalogState =
  | "loading"
  | "available"
  | "out-of-stock"
  | "unavailable";

export type CatalogPostComponent = PostComponent & {
  catalogState: CommunityCatalogState;
  availableQuantity?: number;
};

type CommunityCatalogApi = {
  getById(productId: number): Promise<CatalogProduct>;
  findExactByName(name: string): Promise<CatalogProduct | null>;
};

const legacyCatalogNameBySlug: Readonly<Record<string, string>> = {
  "pc-creator-pro-x": "PC Creator Pro X",
  "rog-strix-g16-2025": "ROG Strix G16 2025",
  "tuf-gaming-a15": "TUF Gaming A15",
  "kingston-fury-32gb": "Kingston Fury 32GB DDR5-6000",
  "ssd-nvme-990-pro": "Samsung 990 Pro NVMe 2TB",
  "ultrawide-monitor-34": "Ultrawide Monitor 34",
  "keychron-q1-pro": "Keychron Q1 Pro Custom QMK",
  "rtx-4070-super-dual": "RTX 4070 Super Dual 12GB",
};

export function prepareCommunityComponents(
  components: readonly PostComponent[],
): CatalogPostComponent[] {
  return components.map((component) => ({
    ...component,
    // A price copied into a setup is only presentation data. Hide it until the
    // current catalog response has confirmed the product identity and price.
    price: undefined,
    slug: component.productId ? String(component.productId) : undefined,
    catalogState: "loading",
  }));
}

function fromCatalogProduct(
  component: PostComponent,
  product: CatalogProduct,
): CatalogPostComponent {
  const category = product.category?.name ?? component.category;
  const brand = product.brand?.name;
  return {
    ...component,
    productId: product.productId,
    slug: String(product.productId),
    name: product.name,
    category,
    price: product.price,
    specsSummary: brand ? `${brand} · ${category}` : component.specsSummary,
    availableQuantity: product.availableQuantity,
    catalogState: product.inStock ? "available" : "out-of-stock",
  };
}

export async function resolveCommunityComponents(
  components: readonly PostComponent[],
  catalog: CommunityCatalogApi,
): Promise<CatalogPostComponent[]> {
  return Promise.all(
    components.map(async (component) => {
      try {
        const product = component.productId
          ? await catalog.getById(component.productId)
          : await catalog.findExactByName(
              (component.slug && legacyCatalogNameBySlug[component.slug]) || component.name,
            );
        if (product) return fromCatalogProduct(component, product);
      } catch {
        // A setup may outlive a catalog item or the catalog may be temporarily
        // unavailable. In either case it must not become a guessed cart id.
      }

      return {
        ...component,
        productId: undefined,
        slug: undefined,
        price: undefined,
        availableQuantity: undefined,
        catalogState: "unavailable",
      };
    }),
  );
}

export async function addAvailableCommunityComponents(
  components: readonly CatalogPostComponent[],
  add: (productId: number, quantity: number) => Promise<void>,
): Promise<{ added: number; failed: number; skipped: number }> {
  let added = 0;
  let failed = 0;
  let skipped = 0;

  // Keep requests sequential: every cart mutation returns a complete server
  // snapshot, so parallel adds could overwrite one another in client state.
  for (const component of components) {
    if (component.catalogState !== "available" || !component.productId) {
      skipped += 1;
      continue;
    }
    try {
      await add(component.productId, 1);
      added += 1;
    } catch {
      failed += 1;
    }
  }

  return { added, failed, skipped };
}

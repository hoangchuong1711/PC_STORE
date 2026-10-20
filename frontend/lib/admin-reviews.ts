export const adminReviewStatuses = ["PUBLISHED", "HIDDEN"] as const;

export function publishedAverage(items: readonly { rating: number; status: string }[]): number {
  const published = items.filter((item) => item.status === "PUBLISHED");
  return published.length === 0 ? 0 : published.reduce((sum, item) => sum + item.rating, 0) / published.length;
}
export type AdminReviewStatus = (typeof adminReviewStatuses)[number];

export type AdminReview = {
  id: string;
  productSlug: string;
  productName: string;
  orderId?: string;
  orderItemId?: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  createdAt: string;
  content: string;
  images?: string[];
  likesCount: number;
  verifiedBuyer: boolean;
  status: AdminReviewStatus;
  moderationReason?: string;
  moderatedBy?: string;
  moderatedAt?: string;
};

export type AdminReviewFilters = {
  query: string;
  rating: "ALL" | 1 | 2 | 3 | 4 | 5;
  status: "ALL" | AdminReviewStatus;
  hasMedia: "ALL" | "YES" | "NO";
};

export function filterAdminReviews(
  items: readonly AdminReview[],
  filters: AdminReviewFilters,
): AdminReview[] {
  const query = filters.query.trim().toLowerCase();

  return items.filter((review) => {
    const matchesQuery =
      !query ||
      review.productName.toLowerCase().includes(query) ||
      review.userName.toLowerCase().includes(query) ||
      review.content.toLowerCase().includes(query);

    const matchesRating = filters.rating === "ALL" || review.rating === filters.rating;
    const matchesStatus = filters.status === "ALL" || review.status === filters.status;
    const matchesMedia =
      filters.hasMedia === "ALL" ||
      (filters.hasMedia === "YES" && (review.images?.length ?? 0) > 0) ||
      (filters.hasMedia === "NO" && (!review.images || review.images.length === 0));

    return matchesQuery && matchesRating && matchesStatus && matchesMedia;
  });
}

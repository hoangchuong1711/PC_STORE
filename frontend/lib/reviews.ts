export type ProductReview = {
  id: string;
  productSlug: string;
  orderId?: string;
  orderItemId?: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1 to 5
  createdAt: string;
  content: string;
  images?: string[];
  likesCount: number;
  isLiked?: boolean;
  verifiedBuyer: boolean;
};

export type RatingDistribution = {
  star: number;
  count: number;
  percentage: number;
};

export type ReviewSummary = {
  averageRating: number;
  totalReviews: number;
  distribution: RatingDistribution[];
};

export const initialReviews: ProductReview[] = [];

let reviewStore: ProductReview[] = [...initialReviews];

export function getProductReviews(slug: string): ProductReview[] {
  return reviewStore.filter((r) => r.productSlug === slug);
}

export function getReviewSummary(source: string | ProductReview[]): ReviewSummary {
  const reviews = typeof source === "string" ? getProductReviews(source) : source;
  const totalReviews = reviews.length;

  if (totalReviews === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      distribution: [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: 0,
        percentage: 0,
      })),
    };
  }

  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = Math.round((sum / totalReviews) * 10) / 10;

  const distribution: RatingDistribution[] = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length;
    const percentage = Math.round((count / totalReviews) * 100);
    return { star, count, percentage };
  });

  return { averageRating, totalReviews, distribution };
}

export function addReview(input: {
  productSlug: string;
  orderId?: string;
  orderItemId?: string;
  userName: string;
  rating: number;
  content: string;
  images?: string[];
}): ProductReview {
  const newReview: ProductReview = {
    id: `rev-${Date.now()}`,
    productSlug: input.productSlug,
    orderId: input.orderId,
    orderItemId: input.orderItemId,
    userName: input.userName || "Khách hàng PC Store",
    rating: input.rating,
    createdAt: new Date().toISOString(),
    content: input.content,
    images: input.images,
    likesCount: 0,
    isLiked: false,
    verifiedBuyer: true,
  };

  reviewStore = [newReview, ...reviewStore];
  return newReview;
}

export function toggleLikeReview(reviewId: string): ProductReview | undefined {
  const review = reviewStore.find((r) => r.id === reviewId);
  if (review) {
    review.isLiked = !review.isLiked;
    review.likesCount += review.isLiked ? 1 : -1;
  }
  return review;
}

export function hasUserReviewedProduct(slug: string, orderId?: string): boolean {
  return reviewStore.some(
    (r) => r.productSlug === slug && (!orderId || r.orderId === orderId),
  );
}

export function formatReviewDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

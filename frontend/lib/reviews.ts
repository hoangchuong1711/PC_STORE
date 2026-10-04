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

export const initialReviews: ProductReview[] = [
  {
    id: "rev-1",
    productSlug: "rog-strix-g16-2025",
    orderId: "ord-20251018-01",
    userName: "Trần Hoàng Quân",
    rating: 5,
    createdAt: "2026-09-20T14:30:00+07:00",
    content:
      "Máy build cực kỳ chắc chắn, bàn phím gõ nảy tay. Màn hình 240Hz màu sắc chuẩn, làm đồ họa hay chơi CS2, Valorant đều rất mượt. Quạt tản nhiệt thông minh, lúc lướt web làm văn phòng hầu như không nghe tiếng gió.",
    images: [
      "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&auto=format&fit=crop&q=80",
    ],
    likesCount: 14,
    isLiked: false,
    verifiedBuyer: true,
  },
  {
    id: "rev-2",
    productSlug: "rog-strix-g16-2025",
    userName: "Lê Minh Tuấn",
    rating: 5,
    createdAt: "2026-09-15T09:12:00+07:00",
    content:
      "Card RTX 5070 cân tốt màn 2K 240Hz. Shop đóng thùng xốp cẩn thận, nhận máy nguyên seal 100%. Được hỗ trợ cài Windows và driver đầy đủ trước khi giao.",
    likesCount: 8,
    isLiked: true,
    verifiedBuyer: true,
  },
  {
    id: "rev-3",
    productSlug: "rog-strix-g16-2025",
    userName: "Ngô Đức Duy",
    rating: 4,
    createdAt: "2026-09-02T18:45:00+07:00",
    content:
      "Hiệu năng tuyệt vời không có gì để chê. Điểm trừ duy nhất là cục sạc công suất lớn hơi nặng khi cần mang đi cà phê mỗi ngày.",
    likesCount: 5,
    isLiked: false,
    verifiedBuyer: true,
  },

  // RTX 4070 Super
  {
    id: "rev-4",
    productSlug: "rtx-4070-super-dual",
    orderId: "ord-20251012-02",
    userName: "Nguyễn Hải Đăng",
    rating: 5,
    createdAt: "2026-09-28T20:10:00+07:00",
    content:
      "Nhiệt độ phòng điều hòa chỉ loanh quanh 62°C khi kéo Cyberpunk 2077 max setting 1440p DLSS Quality. Cụm quạt Windforce của Gigabyte rất êm, hoàn toàn không bị coil whine như card đời trước.",
    images: [
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80",
    ],
    likesCount: 19,
    isLiked: false,
    verifiedBuyer: true,
  },
  {
    id: "rev-5",
    productSlug: "rtx-4070-super-dual",
    userName: "Phạm Quốc Bảo",
    rating: 5,
    createdAt: "2026-09-22T11:20:00+07:00",
    content:
      "Giá hợp lý cho phân khúc card tầm trung cận cao cấp. Lắp vào case ATX gọn gàng, có kèm giá đỡ chống xệ card trong hộp.",
    likesCount: 6,
    isLiked: false,
    verifiedBuyer: true,
  },

  // Kingston Fury
  {
    id: "rev-6",
    productSlug: "kingston-fury-32gb",
    orderId: "ord-20250927-03",
    userName: "Nguyễn Minh Anh",
    rating: 5,
    createdAt: "2026-09-30T10:05:00+07:00",
    content:
      "Bật XMP trong BIOS ăn ngay bus 6000MHz CL36 rất ổn định, không bị dump màn xanh. Cặp tản nhiệt nhôm đen nhìn tối giản, không bị cấn tản tháp CPU.",
    likesCount: 11,
    isLiked: true,
    verifiedBuyer: true,
  },

  // Samsung 990 Pro
  {
    id: "rev-7",
    productSlug: "ssd-nvme-990-pro",
    userName: "Đặng Tiến Dũng",
    rating: 5,
    createdAt: "2026-09-25T16:40:00+07:00",
    content:
      "Test CrystalDiskMark đọc thực tế 7400 MB/s, ghi 6900 MB/s đúng thông số công bố. Nhiệt độ kèm tản theo main khoảng 48°C. Load thư viện game nặng hay render project Premiere tốc độ khác biệt rõ rệt.",
    likesCount: 23,
    isLiked: false,
    verifiedBuyer: true,
  },

  // Ultrawide LG
  {
    id: "rev-8",
    productSlug: "ultrawide-monitor-34",
    orderId: "ord-20250927-03",
    userName: "Vũ Thanh Tùng",
    rating: 5,
    createdAt: "2026-09-29T15:10:00+07:00",
    content:
      "Tỉ lệ 21:9 mở cùng lúc 3 cửa sổ làm việc cực sướng mắt. Tần số quét 165Hz chơi game bắn súng hay đua xe rất đã. Màu sắc tấm nền IPS chuẩn xác, không hở sáng góc.",
    images: [
      "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80",
    ],
    likesCount: 16,
    isLiked: false,
    verifiedBuyer: true,
  },
];

let reviewStore: ProductReview[] = [...initialReviews];

export function getProductReviews(slug: string): ProductReview[] {
  return reviewStore.filter((r) => r.productSlug === slug);
}

export function getReviewSummary(source: string | ProductReview[]): ReviewSummary {
  const reviews = typeof source === "string" ? getProductReviews(source) : source;
  const totalReviews = reviews.length;

  if (totalReviews === 0) {
    return {
      averageRating: 5.0,
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

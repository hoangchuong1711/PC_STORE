export const adminReviewStatuses = ["PUBLISHED", "HIDDEN"] as const;
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

export const initialAdminReviews: AdminReview[] = [
  {
    id: "rev-1",
    productSlug: "rog-strix-g16-2025",
    productName: "ROG Strix G16 2025",
    orderId: "ord-20251018-01",
    userName: "Trần Hoàng Quân",
    rating: 5,
    createdAt: "2026-09-20T14:30:00+07:00",
    content: "Máy build cực kỳ chắc chắn, bàn phím gõ nảy tay. Màn hình 240Hz màu sắc chuẩn, làm đồ họa hay chơi CS2, Valorant đều rất mượt. Quạt tản nhiệt thông minh, lúc lướt web làm văn phòng hầu như không nghe tiếng gió.",
    images: [
      "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&auto=format&fit=crop&q=80",
    ],
    likesCount: 14,
    verifiedBuyer: true,
    status: "PUBLISHED",
  },
  {
    id: "rev-2",
    productSlug: "rtx-4070-super-dual",
    productName: "RTX 4070 Super Dual 12GB",
    orderId: "ord-20251102-09",
    userName: "Lê Minh Tuấn",
    rating: 4,
    createdAt: "2026-09-18T19:15:00+07:00",
    content: "Card chạy mát mẻ trong case M-ATX, nhiệt độ full load tầm 68-70 độ C. Chiến Black Myth Wukong 2K DLSS Quality mượt mà trên 85fps. Hàng chính hãng tem phân phối đầy đủ.",
    images: [
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80",
    ],
    likesCount: 8,
    verifiedBuyer: true,
    status: "PUBLISHED",
  },
  {
    id: "rev-3",
    productSlug: "pc-creator-pro-x",
    productName: "PC Creator Pro X",
    userName: "Nguyễn Hải Đăng",
    rating: 2,
    createdAt: "2026-09-05T09:40:00+07:00",
    content: "Hàng giao chậm hơn hẹn 1 ngày, tài xế không gọi trước. Sản phẩm dùng thì tốt nhưng giao hàng làm mất việc cả buổi sáng của tôi.",
    likesCount: 1,
    verifiedBuyer: false,
    status: "HIDDEN",
    moderationReason: "Nội dung phản ánh dịch vụ vận chuyển giao nhận bên thứ 3, không phản ánh chất lượng sản phẩm.",
    moderatedBy: "Minh Anh (Admin)",
    moderatedAt: "2026-09-05T10:00:00+07:00",
  },
  {
    id: "rev-4",
    productSlug: "keychron-k75-pro",
    productName: "Mechanical Keyboard K75",
    userName: "Phạm Thu Hương",
    rating: 5,
    createdAt: "2026-09-02T16:20:00+07:00",
    content: "Phím gõ cực êm, lube sẵn rất mượt không bị lộc cộc. Kết nối Bluetooth 3 thiết bị chuyển đổi nhanh. Rất đáng tiền!",
    images: [
      "https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&auto=format&fit=crop&q=80",
    ],
    likesCount: 19,
    verifiedBuyer: true,
    status: "PUBLISHED",
  },
];

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

import type { SetupPost } from "./community-api";

function mediaContentUrl(mediaId: string): string {
  return `/api/media/${mediaId}/content`;
}

export type PostComponent = {
  /** Numeric id from the backend catalog. Never derive this from a mock `pX` id. */
  productId?: number;
  slug?: string;
  name: string;
  category: string;
  price?: number;
  specsSummary?: string;
};

export type CommunityPost = {
  id: string;
  title: string;
  author: {
    name: string;
    handle: string;
    avatar: string;
    role: string;
  };
  coverImage: string;
  images: string[];
  description: string;
  components: PostComponent[];
  likesCount: number;
  isLiked: boolean;
  featured?: boolean;
  createdAt: string;
};

export function formatTimeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Hôm nay";
    if (days < 30) return `${days} ngày trước`;
    const months = Math.floor(days / 30);
    return `${months} tháng trước`;
  } catch {
    return dateStr;
  }
}

export function setupDtoToCommunityPost(
  dto: SetupPost,
  meta?: { likeCount?: number; liked?: boolean }
): CommunityPost {
  const images =
    dto.mediaIds && dto.mediaIds.length > 0
      ? dto.mediaIds.map((id) => mediaContentUrl(id))
      : [
          "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1400&auto=format&fit=crop&q=80",
        ];

  return {
    id: String(dto.postId),
    title: dto.title,
    author: {
      name: `Khách hàng #${dto.authorId}`,
      handle: `@member_${dto.authorId}`,
      avatar: "",
      role: "Thành viên PC Store",
    },
    coverImage: images[0],
    images,
    description: dto.description,
    components: (dto.products || []).map((p) => {
      return {
        productId: p.productId,
        slug: String(p.productId),
        name: p.name,
        category: "",
      };
    }),
    likesCount: meta?.likeCount ?? 0,
    isLiked: meta?.liked ?? false,
    createdAt: dto.createdAt,
  };
}

// app/community/[id]/page.tsx gọi ở server Next.js, trước khi truyền post xuống CommunityDetail.
// Gọi thẳng BACKEND_ORIGIN, không qua rewrite /api và không chuyển tiếp cookie trình duyệt.
export async function getOrFetchCommunityPost(id: string): Promise<CommunityPost | null> {
  const numericId = parseInt(id, 10);
  if (!isNaN(numericId) && numericId > 0) {
    const origin =
      process.env.BACKEND_ORIGIN ||
      (process.env.NODE_ENV === "production" ? "http://backend:8080" : "http://localhost:8080");
    try {
      const res = await fetch(`${origin}/pc-store-backend/api/setups/${numericId}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const dto: SetupPost = await res.json();
        let likeCount = 0;
        let liked = false;
        try {
          const likeRes = await fetch(`${origin}/pc-store-backend/api/setup-likes/${numericId}`, {
            cache: "no-store",
          });
          if (likeRes.ok) {
            const likeData = await likeRes.json();
            likeCount = likeData.likeCount || 0;
            liked = likeData.liked || false;
          }
        } catch {}

        return setupDtoToCommunityPost(dto, { likeCount, liked });
      }
    } catch (err) {
      console.warn("Failed to fetch setup by ID from backend:", err);
    }
  }

  return null;
}


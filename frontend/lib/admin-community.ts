import { setupDtoToCommunityPost, type CommunityPost } from "./community";
import type { SetupModeratedItem } from "./community-api";

export const adminCommunityStatuses = ["PUBLISHED", "HIDDEN"] as const;
export type AdminCommunityStatus = (typeof adminCommunityStatuses)[number];

export type AdminCommunityPost = CommunityPost & {
  status: AdminCommunityStatus;
  moderationReason?: string;
  moderatedBy?: string;
  moderatedAt?: string;
};

export type AdminCommunityFilters = {
  query: string;
  status: "ALL" | AdminCommunityStatus;
};

export const communityStatusLabels: Record<AdminCommunityStatus, string> = {
  PUBLISHED: "Đang hiển thị",
  HIDDEN: "Đã ẩn",
};

export function filterAdminCommunityPosts<T extends Pick<AdminCommunityPost, "title" | "author" | "status">>(
  items: readonly T[],
  filters: AdminCommunityFilters,
) {
  const query = filters.query.trim().toLowerCase();
  return items.filter((post) => {
    const matchesQuery =
      !query ||
      post.title.toLowerCase().includes(query) ||
      post.author.name.toLowerCase().includes(query) ||
      post.author.handle.toLowerCase().includes(query);
    const matchesStatus = filters.status === "ALL" || post.status === filters.status;
    return matchesQuery && matchesStatus;
  });
}

export function setupModeratedItemToAdminPost(
  item: SetupModeratedItem
): AdminCommunityPost {
  const base = setupDtoToCommunityPost(item.post, {
    likeCount: item.likeCount,
    liked: false,
  });
  return {
    ...base,
    status: item.post.status === "HIDDEN" ? "HIDDEN" : "PUBLISHED",
    moderationReason: item.moderationReason ?? undefined,
    moderatedBy: item.moderatedBy ? `Quản trị viên #${item.moderatedBy}` : undefined,
    moderatedAt: item.moderatedAt ?? undefined,
  };
}


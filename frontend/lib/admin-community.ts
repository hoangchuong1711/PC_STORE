import { initialCommunityPosts, type CommunityPost, type SetupStyle } from "./community";

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
  style: "ALL" | Exclude<SetupStyle, "all">;
};

export const communityStyleLabels: Record<Exclude<SetupStyle, "all">, string> = {
  minimalist: "Tối giản",
  "rgb-gaming": "RGB & Battlestation",
  workstation: "Workstation",
  ergonomic: "Công thái học",
};

export const communityStatusLabels: Record<AdminCommunityStatus, string> = {
  PUBLISHED: "Đang hiển thị",
  HIDDEN: "Đã ẩn",
};

export const initialAdminCommunityPosts: AdminCommunityPost[] = initialCommunityPosts.map(
  (post, index) => ({
    ...post,
    status: index === 3 ? "HIDDEN" : "PUBLISHED",
    moderationReason: index === 3 ? "Bài đang chờ chỉnh sửa ảnh đại diện." : undefined,
    moderatedBy: index === 3 ? "Minh Anh" : undefined,
    moderatedAt: index === 3 ? "2026-10-01T10:15:00+07:00" : undefined,
  }),
);

export function filterAdminCommunityPosts<T extends Pick<AdminCommunityPost, "title" | "author" | "style" | "status">>(
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
    const matchesStyle = filters.style === "ALL" || post.style === filters.style;
    return matchesQuery && matchesStatus && matchesStyle;
  });
}

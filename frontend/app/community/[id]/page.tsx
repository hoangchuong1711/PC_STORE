import { notFound } from "next/navigation";
import { Metadata } from "next";
import { CommunityDetail } from "../../../components/community/community-detail";
import { getOrFetchCommunityPost } from "../../../lib/community";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getOrFetchCommunityPost(id);
  if (!post) {
    return { title: "Không tìm thấy góc máy | PC Store" };
  }
  return {
    title: `${post.title} | Góc máy cộng đồng PC Store`,
    description: post.description.slice(0, 160),
  };
}

// URL /community/[id]: Next.js nhận id, tải bài từ backend ở server rồi truyền xuống view.
export default async function CommunityPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getOrFetchCommunityPost(id);

  if (!post) {
    notFound();
  }

  // Sau bước này, các thao tác thích/thêm giỏ chạy trong CommunityDetail ở trình duyệt.
  return <CommunityDetail post={post} />;
}

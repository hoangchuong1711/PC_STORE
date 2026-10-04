import { notFound } from "next/navigation";
import { Metadata } from "next";
import { CommunityDetail } from "../../../components/community";
import { getCommunityPost, initialCommunityPosts } from "../../../lib/community";

export function generateStaticParams() {
  return initialCommunityPosts.map((post) => ({ id: post.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = getCommunityPost(id);
  if (!post) {
    return { title: "Không tìm thấy góc máy | PC Store" };
  }
  return {
    title: `${post.title} | Góc máy cộng đồng PC Store`,
    description: post.description.slice(0, 160),
  };
}

export default async function CommunityPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = getCommunityPost(id);

  if (!post) {
    notFound();
  }

  return <CommunityDetail post={post} />;
}

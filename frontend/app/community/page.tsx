import { Metadata } from "next";
import { CommunityFeed } from "../../components/community/community-feed";

export const metadata: Metadata = {
  title: "Góc máy & Cảm hứng không gian | PC Store",
  description:
    "Khám phá các góc máy tính, bàn làm việc công thái học và phòng chơi game được chia sẻ trực tiếp từ cộng đồng người dùng PC Store.",
};

// URL /community: mở CommunityFeed; form đăng bài ở components/community/create-setup-modal.tsx.
export default function CommunityPage() {
  return <CommunityFeed />;
}

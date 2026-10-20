import { Metadata } from "next";
import { CommunityFeed } from "../../components/community";

export const metadata: Metadata = {
  title: "Góc máy & Cảm hứng không gian | PC Store",
  description:
    "Khám phá các góc máy tính, bàn làm việc công thái học và phòng chơi game được chia sẻ trực tiếp từ cộng đồng người dùng PC Store.",
};

export default function CommunityPage() {
  return <CommunityFeed />;
}

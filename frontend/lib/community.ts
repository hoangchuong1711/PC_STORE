export type SetupStyle = "all" | "minimalist" | "rgb-gaming" | "workstation" | "ergonomic";

export const knownProductMap: Record<
  string,
  { id: string; name: string; category: string; price: number; specsSummary: string }
> = {
  "pc-creator-pro-x": {
    id: "p3",
    name: "PC Creator Pro X",
    category: "PC Gaming",
    price: 52990000,
    specsSummary: "Core i9-14900K · RTX 4080 Super",
  },
  "rog-strix-g16-2025": {
    id: "p1",
    name: "ROG Strix G16 2025",
    category: "Laptop",
    price: 38990000,
    specsSummary: "Intel Core Ultra 9 · RTX 5070",
  },
  "tuf-gaming-a15": {
    id: "p2",
    name: "TUF Gaming A15",
    category: "Laptop",
    price: 24990000,
    specsSummary: "Ryzen 7 8845HS · RTX 4060",
  },
  "rtx-4070-super-dual": {
    id: "p4",
    name: "RTX 4070 Super Dual 12GB",
    category: "Linh kiện",
    price: 16990000,
    specsSummary: "12GB GDDR6X · Windforce",
  },
  "kingston-fury-32gb": {
    id: "p5",
    name: "Kingston Fury 32GB DDR5-6000",
    category: "Linh kiện",
    price: 2190000,
    specsSummary: "DDR5-6000 · CL36",
  },
  "ssd-nvme-990-pro": {
    id: "p6",
    name: "Samsung 990 Pro NVMe 2TB",
    category: "Linh kiện",
    price: 4390000,
    specsSummary: "7450 MB/s · PCIe 4.0",
  },
  "ultrawide-monitor-34": {
    id: "p7",
    name: "LG UltraWide 34 inch 165Hz",
    category: "Màn hình",
    price: 9490000,
    specsSummary: "3440x1440 · 165Hz",
  },
  "keychron-q1-pro": {
    id: "p8",
    name: "Keychron Q1 Pro Custom QMK",
    category: "Phụ kiện",
    price: 4390000,
    specsSummary: "Full nhôm CNC · Bluetooth 5.1",
  },
};

export type PostComponent = {
  productId?: string;
  slug?: string;
  name: string;
  category: string;
  price?: number;
  specsSummary?: string;
};

export type PostComment = {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  createdAt: string;
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
  style: SetupStyle;
  coverImage: string;
  images: string[];
  description: string;
  deskSpecs: {
    desk: string;
    chair: string;
    lighting: string;
    audio?: string;
  };
  components: PostComponent[];
  likesCount: number;
  isLiked: boolean;
  viewsCount: number;
  featured?: boolean;
  createdAt: string;
  comments: PostComment[];
};

export const styleCategories: { id: SetupStyle; label: string; description: string }[] = [
  { id: "all", label: "Tất cả phong cách", description: "Toàn bộ góc máy được cộng đồng chia sẻ" },
  { id: "minimalist", label: "Tối giản (Minimalist)", description: "Bố cục gọn gàng, tone màu đơn sắc hoặc gỗ ấm" },
  { id: "rgb-gaming", label: "RGB & Battlestation", description: "Ánh sáng neon, không gian đắm chìm cho game thủ" },
  { id: "workstation", label: "Trạm làm việc (Workstation)", description: "Cấu hình siêu khủng cho render, đồ họa và code" },
  { id: "ergonomic", label: "Công thái học (Ergonomic)", description: "Bàn nâng hạ tự động, ghế công thái học bảo vệ sức khỏe" },
];

export const initialCommunityPosts: CommunityPost[] = [
  {
    id: "setup-01",
    title: "Cyberpunk Studio - Dàn máy Dual Monitor & Lian Li O11 Dynamic",
    author: {
      name: "Trần Hoàng Quân",
      handle: "@quanbuilds",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      role: "3D Artist & Gamer",
    },
    style: "rgb-gaming",
    coverImage: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1400&auto=format&fit=crop&q=80",
    images: [
      "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1400&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1400&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=1400&auto=format&fit=crop&q=80",
    ],
    description:
      "Sau 2 tháng hoàn thiện đường đi dây giấu dưới gầm bàn và căn chỉnh ánh sáng LED ARGB cùng dải màu tím neon, góc máy phục vụ cả công việc render Maya lẫn giải trí cuối tuần đã sẵn sàng. Điểm ưng ý nhất là tản nhiệt nước AIO 360mm giữ CPU i9 luôn dưới 70°C kể cả khi render nặng.",
    deskSpecs: {
      desk: "Bàn gỗ óc chó nguyên tấm 1m8 x 80cm kèm khung nâng hạ 2 motor",
      chair: "Herman Miller Embody Gaming Edition",
      lighting: "Đèn thanh treo màn hình BenQ ScreenBar Halo + LED dán tường Nanoleaf Lines",
      audio: "Loa Audioengine A2+ Wireless kèm DAC FiiO K7",
    },
    components: [
      {
        slug: "pc-creator-pro-x",
        name: "PC Creator Pro X",
        category: "PC Gaming",
        price: 52990000,
        specsSummary: "Core i9-14900K · RTX 4080 Super · 64GB DDR5",
      },
      {
        slug: "ultrawide-monitor-34",
        name: "LG UltraWide 34 inch 165Hz",
        category: "Màn hình",
        price: 9490000,
        specsSummary: "WQHD 3440x1440 · 165Hz · HDR10",
      },
      {
        slug: "keychron-q1-pro",
        name: "Keychron Q1 Pro Custom QMK",
        category: "Phụ kiện",
        price: 4390000,
        specsSummary: "Full nhôm CNC · Gateron Jupiter Banana Switch",
      },
      {
        slug: "rtx-4070-super-dual",
        name: "RTX 4070 Super Dual 12GB",
        category: "Linh kiện",
        price: 16990000,
        specsSummary: "12GB GDDR6X · Quạt kép Windforce",
      },
    ],
    likesCount: 248,
    isLiked: false,
    viewsCount: 3820,
    featured: true,
    createdAt: "2026-09-24T10:00:00+07:00",
    comments: [
      {
        id: "c1",
        author: "Ngô Đức Duy",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
        content: "Cách bạn đi dây dưới bàn gọn gàng quá, cho mình xin tên bộ kẹp dây gắn bàn với!",
        createdAt: "2026-09-24T14:20:00+07:00",
      },
      {
        id: "c2",
        author: "Lê Minh Tuấn",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
        content: "Màn hình LG 34 inch kéo cùng RTX 4080 Super góc làm việc nhìn quá đã mắt bác ơi.",
        createdAt: "2026-09-25T08:15:00+07:00",
      },
    ],
  },
  {
    id: "setup-02",
    title: "Nordic Warm Wood - Góc làm việc tối giản gỗ sồi & ROG Strix",
    author: {
      name: "Nguyễn Lan Anh",
      handle: "@lananh.workspace",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      role: "Lead UI/UX Designer",
    },
    style: "minimalist",
    coverImage: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=1400&auto=format&fit=crop&q=80",
    images: [
      "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=1400&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=1400&auto=format&fit=crop&q=80",
    ],
    description:
      "Mình ưu tiên sự thông thoáng và ánh sáng tự nhiên từ cửa sổ lớn. Bàn gỗ sồi sáng màu kết hợp thảm nỉ len màu ghi xám giúp tập trung cao độ khi thiết kế giao diện Figma. Laptop ROG Strix cắm qua cổng Thunderbolt một sợi dây duy nhất vào màn hình mở rộng.",
    deskSpecs: {
      desk: "Mặt bàn gỗ sồi tự nhiên Bắc Âu 1m6 x 75cm",
      chair: "Ghế công thái học Sihoo Doro C300",
      lighting: "Đèn bàn kẹp thân đồng cổ điển & ánh sáng tự nhiên",
      audio: "Tai nghe Sony WH-1000XM5",
    },
    components: [
      {
        slug: "rog-strix-g16-2025",
        name: "ROG Strix G16 2025",
        category: "Laptop",
        price: 38990000,
        specsSummary: "Intel Core Ultra 9 · RTX 5070 · 32GB RAM",
      },
      {
        slug: "ultrawide-monitor-34",
        name: "LG UltraWide 34 inch 165Hz",
        category: "Màn hình",
        price: 9490000,
        specsSummary: "WQHD 3440x1440 · Màn hình phụ xuất sắc",
      },
      {
        slug: "keychron-q1-pro",
        name: "Keychron Q1 Pro Custom",
        category: "Bàn phím",
        price: 4390000,
        specsSummary: "Keycap PVD Profile Cherry Retro",
      },
    ],
    likesCount: 195,
    isLiked: false,
    viewsCount: 2940,
    featured: false,
    createdAt: "2026-09-28T09:30:00+07:00",
    comments: [
      {
        id: "c3",
        author: "Phạm Quốc Bảo",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80",
        content: "Tone màu ấm cúng quá! Nhìn góc làm việc thế này có động lực ngồi cả ngày.",
        createdAt: "2026-09-28T11:45:00+07:00",
      },
    ],
  },
  {
    id: "setup-03",
    title: "All-White Monolith - Dàn máy White Edition & Tản nước NZXT",
    author: {
      name: "Đặng Tuấn Kiệt",
      handle: "@kiet_custompc",
      avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
      role: "Hardware Enthusiast & Modder",
    },
    style: "workstation",
    coverImage: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1400&auto=format&fit=crop&q=80",
    images: [
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1400&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1400&auto=format&fit=crop&q=80",
    ],
    description:
      "Tất cả linh kiện từ vỏ case, tản nhiệt AIO có màn hình LCD, dây nguồn bọc dù đến thanh RAM đều được tuyển chọn tone màu trắng tuyết (Snow White). Hệ thống sử dụng quạt tản không dây kết nối nam châm giúp thùng máy không còn một sợi dây thừa nào.",
    deskSpecs: {
      desk: "Bàn mặt đá nhân tạo chống xước chân thép sơn tĩnh điện trắng",
      chair: "Noblechairs Hero White Edition",
      lighting: "Đèn LED hắt gầm bàn RGB IC màu Ice Blue",
    },
    components: [
      {
        slug: "rtx-4070-super-dual",
        name: "RTX 4070 Super Dual",
        category: "Linh kiện",
        price: 16990000,
        specsSummary: "Gia cố giá đỡ chống xệ đồng màu trắng",
      },
      {
        slug: "kingston-fury-32gb",
        name: "Kingston Fury 32GB DDR5-6000",
        category: "Linh kiện",
        price: 2190000,
        specsSummary: "Tản nhiệt nhôm tản nhanh",
      },
      {
        slug: "ssd-nvme-990-pro",
        name: "Samsung 990 Pro NVMe 2TB",
        category: "Linh kiện",
        price: 4390000,
        specsSummary: "Tốc độ 7450 MB/s",
      },
    ],
    likesCount: 312,
    isLiked: true,
    viewsCount: 5120,
    featured: false,
    createdAt: "2026-09-18T16:20:00+07:00",
    comments: [
      {
        id: "c4",
        author: "Vũ Thanh Tùng",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80",
        content: "Bộ máy trắng đẹp không tì vết! Cho mình hỏi dây bọc nguồn là tự mod hay mua sẵn vậy bác?",
        createdAt: "2026-09-18T20:10:00+07:00",
      },
    ],
  },
  {
    id: "setup-04",
    title: "Ergonomic Productivity Hub - Bàn nâng hạ & Arm màn hình kép",
    author: {
      name: "Ngô Minh Trí",
      handle: "@tri.tech",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      role: "Backend Architect",
    },
    style: "ergonomic",
    coverImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&auto=format&fit=crop&q=80",
    images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=1400&auto=format&fit=crop&q=80",
    ],
    description:
      "Vì phải ngồi code và họp trực tuyến từ 8-10 tiếng mỗi ngày, mình đầu tư kỹ vào công thái học: Arm lò xo trợ lực giữ màn hình luôn ngang tầm mắt, bàn nâng hạ chuyển đổi tư thế đứng làm việc mỗi 45 phút, chuột đứng dọc chống mỏi cổ tay.",
    deskSpecs: {
      desk: "Bàn nâng hạ thông minh 3 tầng nhớ vị trí",
      chair: "Steelcase Gesture có kê đầu công thái học",
      lighting: "Đèn cảm ứng chống cận 4000K tự điều chỉnh theo độ sáng phòng",
    },
    components: [
      {
        slug: "pc-creator-pro-x",
        name: "PC Creator Pro X Workstation",
        category: "PC Gaming",
        price: 52990000,
        specsSummary: "Chạy Docker và máy ảo đa luồng mượt mà",
      },
      {
        slug: "keychron-q1-pro",
        name: "Keychron Q1 Pro Bluetooth 5.1",
        category: "Bàn phím",
        price: 4390000,
        specsSummary: "Switch êm ái khi gõ code đêm",
      },
      {
        slug: "ssd-nvme-990-pro",
        name: "Samsung 990 Pro 2TB",
        category: "Ổ cứng",
        price: 4390000,
        specsSummary: "Build code và compile cực nhanh",
      },
    ],
    likesCount: 174,
    isLiked: false,
    viewsCount: 2180,
    featured: false,
    createdAt: "2026-09-12T14:15:00+07:00",
    comments: [],
  },
];

let communityStore: CommunityPost[] = [...initialCommunityPosts];

export function getCommunityPosts(
  styleFilter: SetupStyle = "all",
  sortBy: "newest" | "likes" | "views" = "newest",
  searchQuery: string = "",
  _version?: number,
): CommunityPost[] {
  void _version;
  return communityStore
    .filter((post) => {
      const matchStyle = styleFilter === "all" || post.style === styleFilter;
      const matchSearch =
        !searchQuery ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.components.some((c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      return matchStyle && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === "likes") return b.likesCount - a.likesCount;
      if (sortBy === "views") return b.viewsCount - a.viewsCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export function getFeaturedPost(): CommunityPost {
  return (
    communityStore.find((p) => p.featured) ||
    communityStore[0] ||
    initialCommunityPosts[0]
  );
}

export function getCommunityPost(id: string): CommunityPost | undefined {
  return communityStore.find((p) => p.id === id);
}

export function toggleLikePost(id: string): CommunityPost | undefined {
  const post = communityStore.find((p) => p.id === id);
  if (post) {
    post.isLiked = !post.isLiked;
    post.likesCount += post.isLiked ? 1 : -1;
  }
  return post;
}

export function addCommentToPost(
  postId: string,
  comment: { author: string; content: string; avatar?: string },
): PostComment | undefined {
  const post = communityStore.find((p) => p.id === postId);
  if (!post) return undefined;

  const newComment: PostComment = {
    id: `c-${Date.now()}`,
    author: comment.author || "Thành viên PC Store",
    avatar:
      comment.avatar ||
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
    content: comment.content,
    createdAt: new Date().toISOString(),
  };

  post.comments = [...post.comments, newComment];
  return newComment;
}

export function createCommunityPost(input: {
  title: string;
  authorName: string;
  authorRole?: string;
  style: SetupStyle;
  coverImage?: string;
  description: string;
  deskSpecs?: {
    desk: string;
    chair: string;
    lighting: string;
  };
  componentSlugs?: string[];
}): CommunityPost {
  const matchedComponents: PostComponent[] = (input.componentSlugs ?? []).map(
    (slug) => {
      const prod = knownProductMap[slug];
      if (prod) {
        return {
          productId: prod.id,
          slug,
          name: prod.name,
          category: prod.category,
          price: prod.price,
          specsSummary: prod.specsSummary,
        };
      }
      return {
        name: slug,
        category: "Linh kiện",
      };
    },
  );

  const newPost: CommunityPost = {
    id: `setup-${Date.now()}`,
    title: input.title,
    author: {
      name: input.authorName || "Gamer PC Store",
      handle: `@${(input.authorName || "gamer").toLowerCase().replace(/\s+/g, "")}`,
      avatar:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      role: input.authorRole || "Thành viên cộng đồng",
    },
    style: input.style,
    coverImage:
      input.coverImage ||
      "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1400&auto=format&fit=crop&q=80",
    images: [
      input.coverImage ||
        "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1400&auto=format&fit=crop&q=80",
    ],
    description: input.description,
    deskSpecs: input.deskSpecs || {
      desk: "Bàn nâng hạ tự động mặt gỗ công nghiệp",
      chair: "Ghế công thái học tiêu chuẩn",
      lighting: "Đèn treo màn hình chống cận",
    },
    components: matchedComponents,
    likesCount: 1,
    isLiked: true,
    viewsCount: 12,
    createdAt: new Date().toISOString(),
    comments: [],
  };

  communityStore = [newPost, ...communityStore];
  return newPost;
}

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

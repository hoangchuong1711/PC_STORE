export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  role: string;
  tier: string;
  tierDiscount: number; // e.g. 3 for 3%
  joinDate: string;
};

export type SavedAddress = {
  id: string;
  label: string; // "Nhà riêng", "Văn phòng", etc.
  recipientName: string;
  phone: string;
  address: string;
  isDefault: boolean;
};

export type SavedBuild = {
  id: string;
  name: string;
  createdAt: string;
  totalPrice: number;
  estimatedWattage: number;
  compatibilityPassed: boolean;
  components: Array<{
    slot: string;
    slotLabel: string;
    productId: string;
    name: string;
    price: number;
  }>;
};

let userProfile: UserProfile = {
  id: "usr-01",
  name: "Nguyễn Minh Anh",
  email: "minhanh@example.com",
  phone: "0901234567",
  avatar:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  role: "Hardware Enthusiast & Gamer",
  tier: "Hội viên Kim Cương (VIP)",
  tierDiscount: 5,
  joinDate: "2024-03-15T00:00:00Z",
};

let savedAddresses: SavedAddress[] = [
  {
    id: "addr-1",
    label: "Nhà riêng",
    recipientName: "Nguyễn Minh Anh",
    phone: "0901234567",
    address: "Tòa S2.05 Vinhome Grand Park, P. Long Thạnh Mỹ, TP. Thủ Đức, TP. Hồ Chí Minh",
    isDefault: true,
  },
  {
    id: "addr-2",
    label: "Văn phòng làm việc",
    recipientName: "Nguyễn Minh Anh",
    phone: "0901234567",
    address: "Tầng 12, Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Q. Bình Thạnh, TP. Hồ Chí Minh",
    isDefault: false,
  },
];

let savedBuilds: SavedBuild[] = [
  {
    id: "build-01",
    name: "Dàn máy Gaming 2K Max Setting 2026",
    createdAt: "2026-09-25T14:30:00+07:00",
    totalPrice: 48970000,
    estimatedWattage: 580,
    compatibilityPassed: true,
    components: [
      {
        slot: "cpu",
        slotLabel: "Bộ vi xử lý (CPU)",
        productId: "p-cpu-1",
        name: "Intel Core i7-14700K (LGA1700)",
        price: 10490000,
      },
      {
        slot: "motherboard",
        slotLabel: "Bo mạch chủ",
        productId: "p-mb-1",
        name: "ASUS ROG STRIX Z790-A Gaming WiFi D5",
        price: 9990000,
      },
      {
        slot: "ram",
        slotLabel: "Bộ nhớ RAM",
        productId: "p5",
        name: "Kingston Fury Beast 32GB (2x16GB) DDR5-6000",
        price: 2190000,
      },
      {
        slot: "gpu",
        slotLabel: "Card đồ họa (VGA)",
        productId: "p4",
        name: "GIGABYTE RTX 4070 Super Dual 12GB",
        price: 16990000,
      },
      {
        slot: "storage",
        slotLabel: "Ổ cứng SSD",
        productId: "p6",
        name: "Samsung 990 Pro NVMe 2TB PCIe 4.0",
        price: 4390000,
      },
      {
        slot: "psu",
        slotLabel: "Nguồn máy tính",
        productId: "p-psu-1",
        name: "Corsair RM850e 850W 80 Plus Gold ATX 3.0",
        price: 2990000,
      },
      {
        slot: "case",
        slotLabel: "Vỏ thùng máy",
        productId: "p-case-1",
        name: "Lian Li O11 Dynamic EVO White",
        price: 3690000,
      },
      {
        slot: "cooler",
        slotLabel: "Tản nhiệt CPU",
        productId: "p-cool-1",
        name: "NZXT Kraken Elite 360 RGB White",
        price: 6890000,
      },
    ],
  },
  {
    id: "build-02",
    name: "Cấu hình Workstation Đồ họa & Render 3D",
    createdAt: "2026-09-10T10:15:00+07:00",
    totalPrice: 62450000,
    estimatedWattage: 680,
    compatibilityPassed: true,
    components: [
      {
        slot: "cpu",
        slotLabel: "Bộ vi xử lý (CPU)",
        productId: "p-cpu-2",
        name: "AMD Ryzen 9 7950X (AM5)",
        price: 13990000,
      },
      {
        slot: "gpu",
        slotLabel: "Card đồ họa (VGA)",
        productId: "p-gpu-2",
        name: "MSI GeForce RTX 4080 Super Gaming X Slim",
        price: 28990000,
      },
    ],
  },
];

export function getUserProfile(): UserProfile {
  return { ...userProfile };
}

export function syncUserProfileFromAuth(auth: {
  fullName: string;
  email: string;
  phone?: string | null;
  role?: string;
}): UserProfile {
  userProfile = {
    ...userProfile,
    name: auth.fullName,
    email: auth.email,
    phone: auth.phone || userProfile.phone,
    role: auth.role === "ADMIN" ? "Quản trị viên hệ thống" : "Khách hàng PC Store",
  };
  return { ...userProfile };
}

export function updateUserProfile(data: Partial<UserProfile>): UserProfile {
  userProfile = { ...userProfile, ...data };
  return { ...userProfile };
}

export function getUserAddresses(): SavedAddress[] {
  return [...savedAddresses];
}

export function addSavedAddress(data: Omit<SavedAddress, "id">): SavedAddress {
  const newAddress: SavedAddress = {
    ...data,
    id: `addr-${Date.now()}`,
  };

  if (newAddress.isDefault) {
    savedAddresses = savedAddresses.map((a) => ({ ...a, isDefault: false }));
  }

  savedAddresses = [newAddress, ...savedAddresses];
  return newAddress;
}

export function updateSavedAddress(
  id: string,
  data: Partial<SavedAddress>,
): SavedAddress | undefined {
  const target = savedAddresses.find((a) => a.id === id);
  if (!target) return undefined;

  if (data.isDefault) {
    savedAddresses = savedAddresses.map((a) => ({ ...a, isDefault: false }));
  }

  const updated: SavedAddress = { ...target, ...data };
  savedAddresses = savedAddresses.map((a) => (a.id === id ? updated : a));
  return updated;
}

export function deleteSavedAddress(id: string): boolean {
  const initialLength = savedAddresses.length;
  savedAddresses = savedAddresses.filter((a) => a.id !== id);
  // If the deleted one was default, make the first one default
  if (savedAddresses.length > 0 && !savedAddresses.some((a) => a.isDefault)) {
    savedAddresses[0].isDefault = true;
  }
  return savedAddresses.length < initialLength;
}

export function setDefaultAddress(id: string): SavedAddress | undefined {
  savedAddresses = savedAddresses.map((a) => ({
    ...a,
    isDefault: a.id === id,
  }));
  return savedAddresses.find((a) => a.id === id);
}

export function getSavedBuilds(): SavedBuild[] {
  return [...savedBuilds];
}

export function deleteSavedBuild(id: string): boolean {
  const initialLength = savedBuilds.length;
  savedBuilds = savedBuilds.filter((b) => b.id !== id);
  return savedBuilds.length < initialLength;
}

export function formatAccountDate(dateStr: string): string {
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

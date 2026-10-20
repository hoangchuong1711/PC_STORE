export type SavedAddress = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  address: string;
  isDefault: boolean;
};

export function formatAccountDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

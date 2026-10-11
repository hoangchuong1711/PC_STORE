export type AddressItem = {
  addressId: number;
  addressDetail: string;
  recipientName?: string;
  phone?: string;
  label?: string;
  address?: string;
  isDefault: boolean;
};

export type CreateAddressInput = {
  recipientName?: string;
  phone?: string;
  label?: string;
  address?: string;
  addressDetail?: string;
  isDefault?: boolean;
};

export type UpdateAddressInput = Partial<CreateAddressInput>;

export class AddressApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function createAddressApi(transport: typeof fetch = fetch) {
  async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await transport(path, {
        method,
        credentials: "same-origin",
        cache: "no-store",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new AddressApiError(0, "NETWORK_ERROR", "Không thể kết nối máy chủ sổ địa chỉ.");
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new AddressApiError(
        response.status,
        data?.code ?? "HTTP_ERROR",
        data?.message ?? `Máy chủ trả lỗi ${response.status}.`
      );
    }
    return data as T;
  }

  return {
    async list(): Promise<AddressItem[]> {
      const data = await request<AddressItem[]>("/api/customer/addresses", "GET");
      return Array.isArray(data) ? data : [];
    },

    async get(addressId: number): Promise<AddressItem> {
      return await request<AddressItem>(`/api/customer/addresses/${addressId}`, "GET");
    },

    async create(input: CreateAddressInput): Promise<AddressItem> {
      return await request<AddressItem>("/api/customer/addresses", "POST", input);
    },

    async update(addressId: number, input: UpdateAddressInput): Promise<AddressItem> {
      return await request<AddressItem>(`/api/customer/addresses/${addressId}`, "PUT", input);
    },

    async setDefault(addressId: number): Promise<AddressItem> {
      return await request<AddressItem>(`/api/customer/addresses/${addressId}/default`, "PUT");
    },

    async delete(addressId: number): Promise<void> {
      await request<void>(`/api/customer/addresses/${addressId}`, "DELETE");
    },
  };
}

export const addressApi = createAddressApi();

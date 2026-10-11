export type MediaModule = "REVIEW" | "SETUP";

export type UploadMediaResponse = {
  mediaId: string;
  module: MediaModule;
  status: string;
};

export class MediaApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const MAX_IMAGE_SIZE_BYTES = 8_000_000;
export const MAX_VIDEO_SIZE_BYTES = 20_000_000;

export function mediaContentUrl(mediaId: string): string {
  return `/api/media/${mediaId}/content`;
}

function normalizeImageMimeType(rawType: string, filename?: string): string {
  const lower = rawType.toLowerCase().trim();
  if (lower === "image/jpeg" || lower === "image/jpg") return "image/jpeg";
  if (lower === "image/png") return "image/png";
  if (!lower && filename) {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    if (ext === "png") return "image/png";
  }
  return lower;
}

function normalizeVideoMimeType(rawType: string, filename?: string): string {
  const lower = rawType.toLowerCase().trim();
  if (lower === "video/mp4") return "video/mp4";
  if (lower === "video/quicktime" || lower === "video/mov") return "video/quicktime";
  if (!lower && filename) {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext === "mp4") return "video/mp4";
    if (ext === "mov") return "video/quicktime";
  }
  return lower;
}

export function createMediaApi(transport: typeof fetch = fetch) {
  return {
    async uploadImage(
      file: Blob | File | Uint8Array,
      module: MediaModule = "REVIEW",
      options?: { filename?: string; mimeType?: string }
    ): Promise<UploadMediaResponse> {
      if (module !== "REVIEW" && module !== "SETUP") {
        throw new MediaApiError(400, "INVALID_MEDIA_MODULE", "Module media không hợp lệ (chỉ hỗ trợ REVIEW hoặc SETUP).");
      }

      const size = "size" in file ? file.size : file.byteLength;
      if (size > MAX_IMAGE_SIZE_BYTES) {
        throw new MediaApiError(413, "MEDIA_TOO_LARGE", "Ảnh vượt quá dung lượng tối đa 8 MB.");
      }

      const rawType = options?.mimeType || ("type" in file ? file.type : "");
      const filename = options?.filename || ("name" in file ? file.name : undefined);
      const mimeType = normalizeImageMimeType(rawType, filename);

      if (mimeType !== "image/jpeg" && mimeType !== "image/png") {
        throw new MediaApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Chỉ hỗ trợ ảnh định dạng JPEG hoặc PNG.");
      }

      let response: Response;
      try {
        response = await transport("/api/customer/media/images", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Content-Type": mimeType,
            "X-Media-Module": module,
          },
          body: file as BodyInit,
        });
      } catch {
        throw new MediaApiError(0, "NETWORK_ERROR", "Không thể kết nối đến máy chủ upload ảnh.");
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new MediaApiError(
          response.status,
          data?.code ?? "UPLOAD_FAILED",
          data?.message ?? `Upload ảnh thất bại (${response.status}).`
        );
      }

      return data as UploadMediaResponse;
    },

    async uploadVideo(
      file: Blob | File | Uint8Array,
      options?: { filename?: string; mimeType?: string }
    ): Promise<UploadMediaResponse> {
      const size = "size" in file ? file.size : file.byteLength;
      if (size > MAX_VIDEO_SIZE_BYTES) {
        throw new MediaApiError(413, "MEDIA_TOO_LARGE", "Video vượt quá dung lượng tối đa 20 MB.");
      }

      const rawType = options?.mimeType || ("type" in file ? file.type : "");
      const filename = options?.filename || ("name" in file ? file.name : undefined);
      const mimeType = normalizeVideoMimeType(rawType, filename);

      if (mimeType !== "video/mp4" && mimeType !== "video/quicktime") {
        throw new MediaApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Chỉ hỗ trợ video định dạng MP4 hoặc MOV.");
      }

      let response: Response;
      try {
        response = await transport("/api/customer/media/videos", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Content-Type": mimeType,
            "X-Media-Module": "REVIEW",
          },
          body: file as BodyInit,
        });
      } catch {
        throw new MediaApiError(0, "NETWORK_ERROR", "Không thể kết nối đến máy chủ upload video.");
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new MediaApiError(
          response.status,
          data?.code ?? "UPLOAD_FAILED",
          data?.message ?? `Upload video thất bại (${response.status}).`
        );
      }

      return data as UploadMediaResponse;
    },

    mediaContentUrl,
  };
}

export const mediaApi = createMediaApi();

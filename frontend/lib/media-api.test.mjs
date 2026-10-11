import test from "node:test";
import assert from "node:assert/strict";
import { createMediaApi, MediaApiError, mediaContentUrl } from "./media-api.ts";

const sampleImageResponse = {
  mediaId: "123e4567-e89b-12d3-a456-426614174000",
  module: "REVIEW",
  status: "TEMP",
};

const sampleVideoResponse = {
  mediaId: "987fcdeb-51a2-43f7-9876-ba0987654321",
  module: "REVIEW",
  status: "TEMP",
};

const response = (body, status = 201) =>
  new Response(JSON.stringify(body), { status });

test("generates media content proxy URL", () => {
  const url = mediaContentUrl("123e4567-e89b-12d3-a456-426614174000");
  assert.equal(url, "/api/media/123e4567-e89b-12d3-a456-426614174000/content");
});

test("uploads JPEG image to /api/customer/media/images", async () => {
  const mockTransport = async (url, options) => {
    assert.equal(url, "/api/customer/media/images");
    assert.equal(options.method, "POST");
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.headers["Content-Type"], "image/jpeg");
    assert.equal(options.headers["X-Media-Module"], "REVIEW");
    return response(sampleImageResponse, 201);
  };

  const api = createMediaApi(mockTransport);
  const fakeBlob = new Blob([new Uint8Array(1024)], { type: "image/jpeg" });

  const result = await api.uploadImage(fakeBlob, "REVIEW");
  assert.equal(result.mediaId, "123e4567-e89b-12d3-a456-426614174000");
  assert.equal(result.module, "REVIEW");
  assert.equal(result.status, "TEMP");
});

test("normalizes image/jpg and extension to image/jpeg", async () => {
  let capturedContentType = "";
  const mockTransport = async (url, options) => {
    capturedContentType = options.headers["Content-Type"];
    return response({ ...sampleImageResponse, module: "SETUP" }, 201);
  };

  const api = createMediaApi(mockTransport);
  const fakeBlob = new Blob([new Uint8Array(1024)], { type: "image/jpg" });

  const result = await api.uploadImage(fakeBlob, "SETUP");
  assert.equal(capturedContentType, "image/jpeg");
  assert.equal(result.module, "SETUP");
});

test("rejects unsupported image format before network request", async () => {
  let called = false;
  const api = createMediaApi(async () => {
    called = true;
    return response({});
  });

  const fakeGif = new Blob([new Uint8Array(500)], { type: "image/gif" });

  await assert.rejects(
    async () => {
      await api.uploadImage(fakeGif, "REVIEW");
    },
    (err) => {
      assert(err instanceof MediaApiError);
      assert.equal(err.code, "UNSUPPORTED_MEDIA_TYPE");
      assert.equal(err.status, 415);
      return true;
    }
  );
  assert.equal(called, false);
});

test("rejects image exceeding 8 MB before network request", async () => {
  let called = false;
  const api = createMediaApi(async () => {
    called = true;
    return response({});
  });

  // 8_000_001 bytes
  const oversized = new Blob([new Uint8Array(8_000_001)], { type: "image/jpeg" });

  await assert.rejects(
    async () => {
      await api.uploadImage(oversized, "REVIEW");
    },
    (err) => {
      assert(err instanceof MediaApiError);
      assert.equal(err.code, "MEDIA_TOO_LARGE");
      assert.equal(err.status, 413);
      return true;
    }
  );
  assert.equal(called, false);
});

test("uploads MP4 video to /api/customer/media/videos", async () => {
  const mockTransport = async (url, options) => {
    assert.equal(url, "/api/customer/media/videos");
    assert.equal(options.method, "POST");
    assert.equal(options.headers["Content-Type"], "video/mp4");
    assert.equal(options.headers["X-Media-Module"], "REVIEW");
    return response(sampleVideoResponse, 201);
  };

  const api = createMediaApi(mockTransport);
  const fakeVideo = new Blob([new Uint8Array(10_000)], { type: "video/mp4" });

  const result = await api.uploadVideo(fakeVideo);
  assert.equal(result.mediaId, "987fcdeb-51a2-43f7-9876-ba0987654321");
  assert.equal(result.module, "REVIEW");
  assert.equal(result.status, "TEMP");
});

test("rejects video exceeding 20 MB before network request", async () => {
  let called = false;
  const api = createMediaApi(async () => {
    called = true;
    return response({});
  });

  const oversized = new Blob([new Uint8Array(20_000_001)], { type: "video/mp4" });

  await assert.rejects(
    async () => {
      await api.uploadVideo(oversized);
    },
    (err) => {
      assert(err instanceof MediaApiError);
      assert.equal(err.code, "MEDIA_TOO_LARGE");
      assert.equal(err.status, 413);
      return true;
    }
  );
  assert.equal(called, false);
});

test("handles server error response with code and message", async () => {
  const mockTransport = async () => {
    return response(
      { code: "MEDIA_STORAGE_UNAVAILABLE", message: "Không thể lưu ảnh lúc này." },
      502
    );
  };

  const api = createMediaApi(mockTransport);
  const fakeBlob = new Blob([new Uint8Array(1024)], { type: "image/jpeg" });

  await assert.rejects(
    async () => {
      await api.uploadImage(fakeBlob, "REVIEW");
    },
    (err) => {
      assert(err instanceof MediaApiError);
      assert.equal(err.code, "MEDIA_STORAGE_UNAVAILABLE");
      assert.equal(err.status, 502);
      assert.equal(err.message, "Không thể lưu ảnh lúc này.");
      return true;
    }
  );
});

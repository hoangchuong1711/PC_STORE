"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X, Upload, Loader2 } from "lucide-react";
import { mediaApi, MediaApiError, MAX_IMAGE_SIZE_BYTES } from "../../lib/media-api";
import { communityApi, CommunityApiError, type CreateSetupInput } from "../../lib/community-api";
import { useToast } from "../toast";

// Form Chia sẻ góc máy của bạn, mở từ CommunityFeed ở /community.
// Luồng: kiểm tra điều kiện → nhập dữ liệu/upload ảnh → gửi JSON → mở /community/{postId}.
export function CreateSetupModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  // State lưu dữ liệu người dùng đang nhập; set... sẽ cập nhật phần JSX bên dưới.
  const [title, setTitle] = useState("");
  const [uploadedImages, setUploadedImages] = useState<
    Array<{ mediaId: string; previewUrl: string; name: string }>
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");

  const [eligibility, setEligibility] = useState<{
    checked: boolean;
    eligible: boolean;
    reason: string | null;
  }>({ checked: false, eligible: true, reason: null });

  const [availableProducts, setAvailableProducts] = useState<
    Array<{ productId: number; name: string; price: number; category?: string }>
  >([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    // Mở form → GET /api/customer/setups/eligibility → SetupServlet.doGet.
    async function loadEligibility() {
      try {
        const response = await communityApi.checkEligibility();
        if (cancelled) return;
        setEligibility({ checked: true, eligible: response.eligible, reason: response.reason });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof CommunityApiError && err.status === 401) {
          setEligibility({ checked: true, eligible: false, reason: "UNAUTHORIZED" });
        } else {
          // Giữ hành vi cũ: lỗi tải điều kiện không chặn form; backend kiểm tra lại khi đăng bài.
          setEligibility({ checked: true, eligible: true, reason: null });
        }
      }
    }

    // GET /api/products?size=50 → danh sách nút chọn linh kiện; gửi productId, không gửi tên sản phẩm.
    async function loadSetupProducts() {
      try {
        const products = await communityApi.listSetupProducts();
        if (cancelled) return;
        setAvailableProducts(products);
        if (products.length > 0) {
          setSelectedProductIds((previous) => previous.length === 0 ? [products[0].productId] : previous);
        }
      } catch {
        // JSX bên dưới hiển thị thông báo khi không có danh sách sản phẩm.
      }
    }

    void loadEligibility();
    void loadSetupProducts();
    return () => { cancelled = true; };
  }, [isOpen]);

  if (!isOpen) return null;

  // Chọn ảnh → mediaApi.uploadImage → MediaImageUploadServlet.doPost; lưu mediaId từ response.
  async function handleUploadSetupImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = "";

    if (uploadedImages.length + files.length > 8) {
      toast("Bài viết góc máy chỉ được đính kèm tối đa 8 ảnh.", "error");
      return;
    }

    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast(`Ảnh "${file.name}" vượt quá dung lượng tối đa 8 MB.`, "error");
        continue;
      }

      setUploadMessage(`Đang tải ảnh "${file.name}" (${i + 1}/${files.length})...`);
      try {
        const uploadResponse = await mediaApi.uploadImage(file, "SETUP");
        const previewUrl = URL.createObjectURL(file);
        setUploadedImages((prev) => [
          ...prev,
          { mediaId: uploadResponse.mediaId, previewUrl, name: file.name },
        ]);
        successCount++;
      } catch (err) {
        if (err instanceof MediaApiError) {
          if (err.status === 502 || err.code === "MEDIA_STORAGE_UNAVAILABLE") {
            toast(
              "Máy chủ lưu trữ ảnh chưa sẵn sàng. Vui lòng thử tải ảnh lên sau.",
              "error"
            );
          } else {
            toast(err.message, "error");
          }
        } else {
          toast(err instanceof Error ? err.message : `Tải lên ${file.name} thất bại.`, "error");
        }
      }
    }

    setIsUploading(false);
    setUploadMessage("");
    if (successCount > 0) {
      toast(`Đã tải lên ${successCount} ảnh thực tế thành công!`, "success");
    }
  }

  // Bỏ ảnh khỏi danh sách gửi lên; ảnh TEMP chưa dùng sẽ được backend dọn khi hết hạn.
  function handleRemoveSetupImage(index: number) {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  }

  // Chọn hoặc bỏ chọn mã sản phẩm sẽ gửi trong productIds của bài Setup.
  function handleToggleSetupProduct(productId: number) {
    if (selectedProductIds.includes(productId)) {
      setSelectedProductIds(selectedProductIds.filter((id) => id !== productId));
    } else {
      setSelectedProductIds([...selectedProductIds, productId]);
    }
  }

  // Nút Đăng góc máy ngay → communityApi.create → SetupServlet.doPost → mở bài vừa tạo.
  async function handleSubmitSetup(e: React.FormEvent) {
    // 1. Không submit HTML trực tiếp; kiểm tra các ô nhập trước khi gọi API.
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast("Vui lòng nhập đầy đủ tiêu đề và câu chuyện góc máy.", "error");
      return;
    }

    if (uploadedImages.length === 0) {
      toast(
        "Vui lòng tải lên ít nhất 1 ảnh chụp góc máy thực tế của bạn (tối đa 8 ảnh).",
        "error"
      );
      return;
    }

    if (selectedProductIds.length === 0) {
      toast("Vui lòng chọn ít nhất 1 sản phẩm / linh kiện trong góc máy.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      // 2. Gom state của form thành JSON khớp SetupDto.Request ở backend.
      const requestBody: CreateSetupInput = {
        title: title.trim(),
        description: description.trim(),
        mediaIds: uploadedImages.map((img) => img.mediaId),
        productIds: selectedProductIds,
      };
      // 3. POST /api/customer/setups → SetupServlet.doPost → response là SetupPost.
      const createdPost = await communityApi.create(requestBody);

      // 4. Báo danh sách tải lại, đóng form và dùng postId trong response để mở bài mới.
      toast("Góc máy của bạn đã được đăng tải thành công!", "success");
      onSuccess?.();
      onClose();
      // Chuyển hướng ngay đến trang chi tiết góc máy vừa tạo
      router.push(`/community/${createdPost.postId}`);
    } catch (err) {
      if (err instanceof CommunityApiError) {
        if (err.status === 401) {
          toast("Bạn cần đăng nhập tài khoản khách hàng để chia sẻ góc máy.", "error");
          router.push("/auth/login?redirect=/community");
        } else if (err.code === "SETUP_PURCHASE_REQUIRED" || err.status === 403) {
          toast(
            "Chính sách PC Store: Bạn cần có ít nhất 1 đơn hàng đã giao thành công (DELIVERED) để đăng bài.",
            "error"
          );
        } else {
          toast(err.message, "error");
        }
      } else {
        toast(err instanceof Error ? err.message : "Đăng bài thất bại.", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 grid place-items-center p-5" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-7 md:p-8 max-w-[640px] w-full max-h-[85vh] overflow-y-auto shadow-2xl"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-ink m-0">Chia sẻ góc máy của bạn</h2>
            <p className="text-xs md:text-sm text-muted mt-1 leading-relaxed">
              Lan tỏa cảm hứng làm việc và trải nghiệm phần cứng đến cộng đồng
            </p>
          </div>
          <button
            type="button"
            className="text-muted hover:text-ink p-1 rounded-lg cursor-pointer bg-transparent border-none"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {eligibility.checked && !eligibility.eligible && (
          <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between gap-3">
            {eligibility.reason === "UNAUTHORIZED" ? (
              <>
                <span>Bạn cần đăng nhập tài khoản khách hàng để chia sẻ góc máy.</span>
                <Link
                  href="/auth/login"
                  className="font-bold underline text-amber-950 shrink-0"
                >
                  Đăng nhập ngay
                </Link>
              </>
            ) : (
              <span>
                <strong>Chính sách cộng đồng:</strong> Bạn cần có ít nhất 1 đơn hàng đã giao thành công (DELIVERED) tại PC Store để đăng bài góc máy.
              </span>
            )}
          </div>
        )}

        {/* Form Chia sẻ góc máy → handleSubmitSetup; các input bên dưới cập nhật state. */}
        <form id="create-setup-form" onSubmit={handleSubmitSetup} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="setupTitle" className="text-xs font-bold text-ink">Tiêu đề góc máy *</label>
            <input
              id="setupTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Không gian làm việc tối giản phong cách Bắc Âu"
              required
              className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none focus:border-[#006ce1]"
            />
          </div>

          {/* Real Media Upload Section */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-ink">
                Hình ảnh thực tế góc máy (tải lên 1–8 ảnh chất lượng cao):
              </label>
              <span className="text-[11px] text-muted font-medium">
                {uploadedImages.length}/8 ảnh
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/jpg"
              className="hidden"
              onChange={(e) => void handleUploadSetupImages(e)}
            />

            {/* Custom Uploaded Images Preview */}
            <div className="flex gap-2.5 flex-wrap items-center">
              {uploadedImages.map((img, idx) => (
                <div
                  key={img.mediaId || idx}
                  className="relative w-22 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.previewUrl}
                    alt={img.name || `Ảnh góc máy ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 bg-[#006ce1] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                      Ảnh bìa
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveSetupImage(idx)}
                    className="absolute top-1 right-1 bg-slate-900/80 hover:bg-rose-600 text-white border-none rounded-full w-5 h-5 grid place-items-center cursor-pointer transition-colors"
                    aria-label="Xóa ảnh"
                    title="Xóa ảnh này"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {uploadedImages.length < 8 && (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-1 w-22 h-20 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-600 text-[11px] font-semibold hover:border-[#006ce1] hover:text-[#006ce1] hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-50"
                  aria-label="Chọn ảnh góc máy từ máy tính"
                >
                  {isUploading ? (
                    <Loader2 size={18} className="animate-spin text-[#006ce1]" />
                  ) : (
                    <Upload size={18} />
                  )}
                  <span>{isUploading ? "Đang tải..." : "Tải ảnh lên"}</span>
                </button>
              )}
            </div>

            {isUploading && uploadMessage && (
              <p className="text-xs text-blue-600 flex items-center gap-1.5 m-0 animate-pulse">
                <Loader2 size={13} className="animate-spin" /> {uploadMessage}
              </p>
            )}

          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-ink">Gắn thẻ linh kiện có sẵn tại PC Store *:</label>
              <span className="text-[11px] text-muted">
                Đã chọn: {selectedProductIds.length} sản phẩm
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
              {availableProducts.length > 0 ? (
                availableProducts.map((p) => {
                    const selected = selectedProductIds.includes(p.productId);
                    return (
                      <button
                        key={p.productId}
                        type="button"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors border ${
                          selected
                            ? "bg-[#006ce1] text-white border-[#006ce1]"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                        }`}
                        onClick={() => handleToggleSetupProduct(p.productId)}
                      >
                        {selected && <Check size={12} />} {p.name}
                      </button>
                    );
                  })
              ) : (
                <p className="m-1 text-xs text-amber-700">
                  Không tải được catalog sản phẩm. Vui lòng thử lại sau; hệ thống sẽ không dùng ID sản phẩm mẫu.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="setupDesc" className="text-xs font-bold text-ink">Câu chuyện góc máy & Bí quyết giấu dây *</label>
            <textarea
              id="setupDesc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Chia sẻ về ý tưởng setup, cách giấu dây, đèn nền hoặc cảm nhận hiệu năng..."
              required
              className="p-2.5 px-3.5 border border-[#e0e0e0] rounded-xl text-sm outline-none resize-y focus:border-[#006ce1]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-ink border border-[#e0e0e0] hover:border-slate-400 bg-white transition-colors cursor-pointer"
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#006ce1] hover:bg-[#0051a8] transition-colors shadow-sm cursor-pointer border-none disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Đang đăng góc máy...
                </>
              ) : (
                "Đăng góc máy ngay"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

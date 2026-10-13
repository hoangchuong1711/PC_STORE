"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { Product } from "../lib/products";

export function isProductImageSource(source: string | undefined): source is string {
  return Boolean(source && /^(https?:\/\/|\/(?!\/))/.test(source));
}

interface ProductGalleryZoomProps {
  product: Product;
  images: string[];
  selectedImageIdx: number;
  onSelectImageIdx: (idx: number) => void;
}

export function ProductGalleryZoom({
  product,
  images,
  selectedImageIdx,
  onSelectImageIdx,
}: ProductGalleryZoomProps) {
  const currentSource = images[selectedImageIdx];
  const [failedSources, setFailedSources] = useState<Record<string, boolean>>({});
  const isRealImage =
    isProductImageSource(currentSource) && !failedSources[currentSource];

  // Zoom state
  const [isHovering, setIsHovering] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const [containerDim, setContainerDim] = useState({ width: 0, height: 0 });

  // Lightbox Modal state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxScale, setLightboxScale] = useState(1);
  const [lightboxPos, setLightboxPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const zoomFactor = 2.4; // 2.4x optical magnification
  const lensWidth = Math.round((containerDim.width || 480) / zoomFactor);
  const lensHeight = Math.round((containerDim.height || 480) / zoomFactor);

  // Detect touch screens
  useEffect(() => {
    const isTouch =
      window.matchMedia("(pointer: coarse)").matches ||
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0;
    setIsTouchDevice(isTouch);
  }, []);

  // Update container dimensions on resize or when mounted
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerDim({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [updateDimensions]);

  // Handle mouse movement for lens & zoom window
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    // Cursor relative to container
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Center lens on cursor
    let nextX = mouseX - lensWidth / 2;
    let nextY = mouseY - lensHeight / 2;

    // Clamp inside image bounds
    nextX = Math.max(0, Math.min(nextX, rect.width - lensWidth));
    nextY = Math.max(0, Math.min(nextY, rect.height - lensHeight));

    setLensPos({ x: nextX, y: nextY });
  };

  const handleMouseEnter = () => {
    if (!isTouchDevice) {
      updateDimensions();
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const handleOpenLightbox = () => {
    setLightboxScale(1);
    setLightboxPos({ x: 0, y: 0 });
    setIsLightboxOpen(true);
  };

  const handleCloseLightbox = () => {
    setIsLightboxOpen(false);
    setLightboxScale(1);
    setLightboxPos({ x: 0, y: 0 });
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCloseLightbox();
      if (e.key === "ArrowLeft") {
        onSelectImageIdx((selectedImageIdx - 1 + images.length) % images.length);
        setLightboxScale(1);
        setLightboxPos({ x: 0, y: 0 });
      }
      if (e.key === "ArrowRight") {
        onSelectImageIdx((selectedImageIdx + 1) % images.length);
        setLightboxScale(1);
        setLightboxPos({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, selectedImageIdx, images.length, onSelectImageIdx]);

  // Lightbox dragging for pan
  const handleDragStart = (e: React.MouseEvent) => {
    if (lightboxScale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: lightboxPos.x,
      posY: lightboxPos.y,
    };
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging || lightboxScale <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setLightboxPos({
      x: dragStartRef.current.posX + dx,
      y: dragStartRef.current.posY + dy,
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div className="product-gallery-interactive">
      {/* Main Visual Display & Interactive Lens */}
      <div className="detail-main-visual detail-main-visual-wrapper">
        <div
          ref={containerRef}
          className={`product-visual product-visual-large product-gallery-stage ${isRealImage ? "product-visual-has-image" : ""} ${isHovering && !isTouchDevice ? "is-active" : ""}`}
          style={{ "--product-accent": product.accent } as React.CSSProperties}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
          onClick={handleOpenLightbox}
          role="button"
          tabIndex={0}
          aria-label="Phóng to ảnh sản phẩm"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleOpenLightbox();
          }}
        >
          {isRealImage ? (
            <Image
              src={currentSource}
              alt={product.name}
              fill
              unoptimized
              sizes="(max-width: 900px) 100vw, 50vw"
              className="product-photo gallery-photo-main"
              priority
              onError={() =>
                setFailedSources((prev) => ({ ...prev, [currentSource]: true }))
              }
            />
          ) : (
            <div className="gallery-graphic-fallback">
              <span className="visual-orbit" />
              <span className="visual-label">{product.category}</span>
              <span className="visual-letter">{product.name.slice(0, 1)}</span>
              <span className="visual-brand">{product.brand}</span>
              <div className="fallback-badge">
                <Sparkles size={14} />
                <span>Mẫu concept kỹ thuật</span>
              </div>
            </div>
          )}

          {/* Interactive Lens Viewfinder (Desktop Only) */}
          {isHovering && !isTouchDevice && containerDim.width > 0 && (
            <div
              className="gallery-zoom-lens"
              style={{
                width: `${lensWidth}px`,
                height: `${lensHeight}px`,
                transform: `translate3d(${lensPos.x}px, ${lensPos.y}px, 0)`,
              }}
            >
              {/* Corner reticle marks */}
              <span className="lens-corner top-left" />
              <span className="lens-corner top-right" />
              <span className="lens-corner bottom-left" />
              <span className="lens-corner bottom-right" />
              <span className="lens-crosshair-center" />
            </div>
          )}

          {/* Hover Hint Overlay Button */}
          <div className="gallery-action-badge">
            <Maximize2 size={13} />
            <span>{isTouchDevice ? "Chạm để phóng to" : "Bấm để mở toàn màn hình"}</span>
          </div>
        </div>

        {/* Side-by-Side Zoom Preview Window (Anchored beside gallery) */}
        {isHovering && !isTouchDevice && isRealImage && containerDim.width > 0 && (
          <div
            className="gallery-zoom-window"
            aria-hidden="true"
            style={{
              width: `${containerDim.width}px`,
              height: `${containerDim.height}px`,
            }}
          >
            {/* Magnified Image */}
            <div
              className="gallery-zoom-content"
              style={{
                width: `${containerDim.width * zoomFactor}px`,
                height: `${containerDim.height * zoomFactor}px`,
                transform: `translate3d(-${lensPos.x * zoomFactor}px, -${lensPos.y * zoomFactor}px, 0)`,
              }}
            >
              <Image
                src={currentSource}
                alt="Phóng to chi tiết"
                fill
                unoptimized
                className="gallery-zoom-photo"
              />
            </div>

            {/* Technical HUD Pill */}
            <div className="zoom-hud-pill">
              <span className="zoom-hud-indicator" />
              <strong>{zoomFactor.toFixed(1)}×</strong>
              <span>Độ phân giải cao</span>
            </div>
          </div>
        )}
      </div>

      {/* Caption & Current View Label */}
      <div className="detail-gallery-caption">
        Góc ảnh:{" "}
        <strong>
          {isProductImageSource(currentSource)
            ? `Ảnh ${selectedImageIdx + 1} / ${images.length}`
            : currentSource}
        </strong>
        <span className="caption-sub">
          {isTouchDevice ? " · Chạm để xem ảnh lớn" : " · Rê chuột để soi linh kiện, bấm để mở rộng"}
        </span>
      </div>

      {/* Thumbnail Selector */}
      <div className="detail-thumbnails" role="group" aria-label="Danh sách ảnh">
        {images.map((imgItem, idx) => {
          const isImgUrl =
            isProductImageSource(imgItem) && !failedSources[imgItem];
          const isSelected = selectedImageIdx === idx;
          return (
            <button
              key={idx}
              type="button"
              className={`thumbnail-btn ${isSelected ? "active" : ""}`}
              onClick={() => onSelectImageIdx(idx)}
              aria-label={`Xem ảnh ${idx + 1}`}
            >
              {isImgUrl ? (
                <div className="thumbnail-photo-wrap">
                  <Image
                    src={imgItem}
                    alt={`Thumbnail ${idx + 1}`}
                    fill
                    unoptimized
                    className="thumbnail-photo-img"
                  />
                </div>
              ) : (
                <span
                  className="thumbnail-swatch"
                  style={{ background: product.accent }}
                />
              )}
              <small>{isProductImageSource(imgItem) ? `Ảnh ${idx + 1}` : imgItem}</small>
            </button>
          );
        })}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="gallery-lightbox-backdrop"
          onClick={handleCloseLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Xem chi tiết ảnh toàn màn hình"
        >
          {/* Lightbox Controls Bar */}
          <div
            className="lightbox-top-bar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lightbox-product-meta">
              <span className="lightbox-brand">{product.brand}</span>
              <strong className="lightbox-title">{product.name}</strong>
              <span className="lightbox-index">
                ({selectedImageIdx + 1} / {images.length})
              </span>
            </div>

            <div className="lightbox-actions">
              <button
                type="button"
                className="lightbox-btn"
                title="Thu nhỏ"
                onClick={() => setLightboxScale((s) => Math.max(1, s - 0.5))}
                disabled={lightboxScale <= 1}
              >
                <ZoomOut size={18} />
              </button>
              <button
                type="button"
                className="lightbox-btn"
                title="Tỉ lệ mặc định"
                onClick={() => {
                  setLightboxScale(1);
                  setLightboxPos({ x: 0, y: 0 });
                }}
              >
                <RotateCcw size={16} />
                <span>{lightboxScale.toFixed(1)}×</span>
              </button>
              <button
                type="button"
                className="lightbox-btn"
                title="Phóng to"
                onClick={() => setLightboxScale((s) => Math.min(3.5, s + 0.5))}
                disabled={lightboxScale >= 3.5}
              >
                <ZoomIn size={18} />
              </button>
              <button
                type="button"
                className="lightbox-btn lightbox-btn-close"
                title="Đóng (Esc)"
                onClick={handleCloseLightbox}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Lightbox Canvas */}
          <div
            className="lightbox-viewport"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            style={{
              cursor:
                lightboxScale > 1
                  ? isDragging
                    ? "grabbing"
                    : "grab"
                  : "default",
            }}
          >
            {/* Prev/Next arrows */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="lightbox-nav-btn prev"
                  onClick={() => {
                    onSelectImageIdx(
                      (selectedImageIdx - 1 + images.length) % images.length,
                    );
                    setLightboxScale(1);
                    setLightboxPos({ x: 0, y: 0 });
                  }}
                  aria-label="Ảnh trước"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  type="button"
                  className="lightbox-nav-btn next"
                  onClick={() => {
                    onSelectImageIdx((selectedImageIdx + 1) % images.length);
                    setLightboxScale(1);
                    setLightboxPos({ x: 0, y: 0 });
                  }}
                  aria-label="Ảnh tiếp theo"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}

            <div
              className="lightbox-image-stage"
              style={{
                transform: `translate3d(${lightboxPos.x}px, ${lightboxPos.y}px, 0) scale(${lightboxScale})`,
                transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.2, 0, 0, 1)",
              }}
            >
              {isRealImage ? (
                <div className="lightbox-image-wrap">
                  <Image
                    src={currentSource}
                    alt={product.name}
                    width={1600}
                    height={1200}
                    unoptimized
                    className="lightbox-photo"
                    draggable={false}
                  />
                </div>
              ) : (
                <div
                  className="gallery-graphic-fallback lightbox-fallback"
                  style={{ "--product-accent": product.accent } as React.CSSProperties}
                >
                  <span className="visual-orbit" />
                  <span className="visual-label">{product.category}</span>
                  <span className="visual-letter">{product.name.slice(0, 1)}</span>
                  <span className="visual-brand">{product.brand}</span>
                </div>
              )}
            </div>
          </div>

          {/* Lightbox Bottom Thumbnails */}
          <div
            className="lightbox-bottom-strip"
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((img, idx) => {
              const isImg = isProductImageSource(img) && !failedSources[img];
              return (
                <button
                  key={idx}
                  type="button"
                  className={`lightbox-thumb ${selectedImageIdx === idx ? "active" : ""}`}
                  onClick={() => {
                    onSelectImageIdx(idx);
                    setLightboxScale(1);
                    setLightboxPos({ x: 0, y: 0 });
                  }}
                >
                  {isImg ? (
                    <div className="lightbox-thumb-img-wrap">
                      <Image
                        src={img}
                        alt={`Ảnh ${idx + 1}`}
                        fill
                        unoptimized
                        className="thumbnail-photo-img"
                      />
                    </div>
                  ) : (
                    <span
                      className="thumbnail-swatch"
                      style={{ background: product.accent }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

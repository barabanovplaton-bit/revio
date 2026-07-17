"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { uploadImage, type UploadResult } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  onUpload: (result: UploadResult) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  maxSize?: number;
  accept?: string;
}

export function ImageUploader({
  onUpload,
  onError,
  disabled = false,
  maxSize = 5,
  accept = "image/*",
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > maxSize * 1024 * 1024) {
        onError?.(`Файл слишком большой. Максимум ${maxSize}MB`);
        return;
      }

      if (!file.type.startsWith("image/")) {
        onError?.("Только изображения");
        return;
      }

      setIsUploading(true);
      setPreview(URL.createObjectURL(file));

      try {
        const result = await uploadImage(file);
        onUpload(result);
        setPreview(null);
      } catch (error) {
        console.error("Upload error:", error);
        onError?.("Не удалось загрузить изображение");
        setPreview(null);
      } finally {
        setIsUploading(false);
      }
    },
    [maxSize, onUpload, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const clearPreview = useCallback(() => {
    setPreview(null);
  }, []);

  return (
    <div className="relative">
      <div
        className={cn(
          "relative flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all",
          isDragging
            ? "border-text-primary bg-bg-cardHover"
            : "border-border-strong bg-bg-input hover:border-text-muted",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled || isUploading}
          className="absolute inset-0 cursor-pointer opacity-0"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
            <p className="text-sm text-text-muted">Загрузка...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-text-muted"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div>
              <p className="text-sm font-medium text-text-primary">
                Перетащите изображение сюда
              </p>
              <p className="text-xs text-text-muted">
                или нажмите для выбора (максимум {maxSize}MB)
              </p>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-bg-page/90 backdrop-blur-sm"
          >
            <div className="relative max-w-xs">
              <img
                src={preview}
                alt="Preview"
                className="max-h-48 w-auto rounded-lg"
              />
              <button
                type="button"
                onClick={clearPreview}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-bg-card border border-border-strong text-text-primary shadow-lg hover:bg-bg-cardHover"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  className="h-4 w-4"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface UploadedImageProps {
  url: string;
  onRemove: () => void;
  canRemove?: boolean;
}

export function UploadedImage({
  url,
  onRemove,
  canRemove = true,
}: UploadedImageProps) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border border-border-strong bg-bg-input">
      <img
        src={url}
        alt="Uploaded"
        className="h-full w-full object-cover"
      />
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-bg-card/90 backdrop-blur-sm border border-border-strong text-text-primary opacity-0 transition-opacity group-hover:opacity-100 hover:bg-bg-cardHover"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="h-4 w-4"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

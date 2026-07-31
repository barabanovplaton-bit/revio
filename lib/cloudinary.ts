export interface UploadResult {
  public_id: string;
  url: string;
  width: number;
  height: number;
  format: string;
}

/**
 * Подготовка изображения к загрузке:
 * - если файл большой или размеры превышают MAX_DIM — перекодируем через canvas
 *   (PNG с прозрачностью остаётся PNG, остальное — JPEG 0.92; это визуально незаметно)
 * - маленькие файлы возвращаются как есть, БЕЗ перекодировки
 */
const MAX_DIM = 2560;
const MAX_BYTES = 4 * 1024 * 1024;

export async function prepareImageFile(file: File): Promise<File> {
  if (file.size <= MAX_BYTES) {
    const dims = await getImageSize(file);
    if (dims && dims.width <= MAX_DIM && dims.height <= MAX_DIM) {
      return file;
    }
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const isPng = file.type === "image/png";
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(
      resolve,
      isPng ? "image/png" : "image/jpeg",
      isPng ? undefined : 0.92
    );
  });
  if (!blob) {
    throw new Error("Failed to compress image");
  }

  const ext = isPng ? "png" : "jpg";
  const name = file.name.replace(/\.[^.]+$/, "") + "." + ext;
  return new File([blob], name, {
    type: isPng ? "image/png" : "image/jpeg",
  });
}

function getImageSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Загрузка картинки через API route
 */
export async function uploadImage(
  file: File,
  _folder: string = "projects"
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Upload failed");
  }

  return res.json();
}

/**
 * Загрузка с повторными попытками (attempts раз)
 */
export async function uploadImageWithRetry(
  file: File,
  attempts: number = 3
): Promise<UploadResult> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await uploadImage(file);
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
      }
    }
  }
  throw lastError;
}

/**
 * Получение оптимизированного URL (заглушка для совместимости)
 */
export function getOptimizedUrl(url: string, _width?: number, _height?: number): string {
  return url;
}

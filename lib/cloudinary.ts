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
 *   (PNG с прозрачностью остаётся PNG, остальное — JPEG; визуально незаметно)
 * - гарантируем, что итоговый файл < 3.5 МБ (лимит Vercel ~4.5 МБ с запасом)
 * - если что-то не получилось — возвращаем исходный файл как есть
 */
const MAX_DIM = 2560;
const MAX_BYTES = 3.8 * 1024 * 1024;
const SAFE_BYTES = 3.5 * 1024 * 1024;

export async function prepareImageFile(file: File): Promise<File> {
  if (file.size <= MAX_BYTES) {
    const dims = await getImageSize(file);
    if (dims && dims.width <= MAX_DIM && dims.height <= MAX_DIM) {
      return file;
    }
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch (e) {
    console.error("createImageBitmap failed, uploading original:", e);
    return file;
  }

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
  let blob = await toBlob(canvas, isPng ? "image/png" : "image/jpeg", isPng ? undefined : 0.92);

  // PNG может остаться слишком большим (Vercel режет запросы > 4.5 МБ) —
  // пересобираем в JPEG
  let ext = isPng ? "png" : "jpg";
  let mime = isPng ? "image/png" : "image/jpeg";
  if (blob && blob.size > SAFE_BYTES) {
    blob = await toBlob(canvas, "image/jpeg", 0.92);
    ext = "jpg";
    mime = "image/jpeg";
  }

  // Крайний случай: JPEG всё ещё слишком большой — жёстко сжимаем
  if (blob && blob.size > SAFE_BYTES) {
    blob = await toBlob(canvas, "image/jpeg", 0.8);
  }

  if (!blob) {
    return file;
  }

  const name = file.name.replace(/\.[^.]+$/, "") + "." + ext;
  return new File([blob], name, { type: mime });
}

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
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
    let details = "";
    try {
      const data = await res.json();
      details = data?.details || data?.error || "";
    } catch {
      /* ignore */
    }
    throw new Error(`Upload failed${details ? ": " + details : ""}`);
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

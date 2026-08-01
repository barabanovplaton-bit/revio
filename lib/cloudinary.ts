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
 * - возвращает null, если файл невозможно подготовить — тогда он не уйдёт на сервер
 *   и не сломает загрузку (об этом будет понятная ошибка)
 */
const MAX_DIM = 2560;
const MAX_BYTES = 3.8 * 1024 * 1024;
const SAFE_BYTES = 3.5 * 1024 * 1024;

export async function prepareImageFile(file: File): Promise<File | null> {
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
    console.error("createImageBitmap failed:", e);
    // Формат не открывается браузером и файл большой — загружать бесполезно
    return file.size <= SAFE_BYTES ? file : null;
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
  let ext = isPng ? "png" : "jpg";
  let mime = isPng ? "image/png" : "image/jpeg";
  let blob = await toBlob(canvas, mime, isPng ? undefined : 0.92);

  // Жмём до тех пор, пока файл не станет меньше 3.5 МБ
  const qualities = [0.92, 0.85, 0.8, 0.7, 0.6];
  let qi = 0;
  while (blob && blob.size > SAFE_BYTES && qi < qualities.length) {
    blob = await toBlob(canvas, "image/jpeg", qualities[qi]);
    ext = "jpg";
    mime = "image/jpeg";
    qi++;
  }

  if (!blob) {
    return null;
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

  let res: Response;
  try {
    res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
  } catch (e) {
    // Сетевая ошибка — сервер не ответил, есть смысл повторить
    throw makeUploadError(
      e instanceof Error ? e.message : "Network error",
      true
    );
  }

  if (!res.ok) {
    let details = "";
    let code = "";
    try {
      const data = await res.json();
      details = data?.details || data?.error || "";
      code = data?.code || "";
    } catch {
      /* ignore */
    }
    // Ретраим только временные сбои (5xx); конфиг-ошибки и битые файлы (4xx)
    // повторять бесполезно
    const retryable = res.status >= 500 && code !== "CONFIG_MISSING";
    throw makeUploadError(
      `Upload failed${details ? ": " + details : ""}`,
      retryable
    );
  }

  return res.json();
}

export interface UploadError extends Error {
  retryable: boolean;
}

function makeUploadError(message: string, retryable: boolean): UploadError {
  const err = new Error(message) as UploadError;
  err.retryable = retryable;
  return err;
}

/**
 * Загрузка с повторными попытками (attempts раз).
 * Повторяет только временные сбои (сеть, 5xx, 429) —
 * постоянные ошибки (конфиг, битый файл) прерывают сразу.
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
      const retryable = (e as { retryable?: boolean })?.retryable !== false;
      if (retryable && i < attempts - 1) {
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

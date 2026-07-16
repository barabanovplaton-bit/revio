export interface UploadResult {
  public_id: string;
  url: string;
  width: number;
  height: number;
  format: string;
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
 * Получение оптимизированного URL (заглушка для совместимости)
 */
export function getOptimizedUrl(url: string, _width?: number, _height?: number): string {
  return url;
}

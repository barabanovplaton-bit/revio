import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";
export const maxDuration = 60;

const REQUIRED_ENV = [
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "NEXT_PUBLIC_CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

function getMissingEnv(): string[] {
  return REQUIRED_ENV.filter((key) => !process.env[key]);
}

export async function POST(req: NextRequest) {
  try {
    const missing = getMissingEnv();
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: "Upload failed",
          code: "CONFIG_MISSING",
          details:
            "Сервер Cloudinary настроен не полностью. Добавьте в Vercel -> Settings -> Environment Variables: " +
            missing.join(", "),
        },
        { status: 500 }
      );
    }

    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "projects",
            resource_type: "auto",
            transformation: [
              { quality: "auto:good" },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(buffer);
    });

    return NextResponse.json({
      public_id: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
    });
  } catch (error) {
    console.error("Upload error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Upload failed", details: message },
      { status: 500 }
    );
  }
}

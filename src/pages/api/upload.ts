import type { APIRoute } from "astro";
import { getSessionByToken } from "../../lib/db/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

// --- Image pipeline (Bun 1.4 native image API) -----------------------------
// All raster uploads are decoded, resized to a sane max and re-encoded to
// WebP with Bun's built-in image processing (`new Bun.Image(bytes)`).
// The codecs (libjpeg-turbo / libspng / libwebp) are statically linked into
// the Bun binary — no system packages (no libvips/sharp) are required, on
// Windows, mac, Linux or the Alpine docker image.
// SVG & animated GIF are passed through untouched because they cannot be
// re-encoded losslessly.

const MAX_DIMENSION = 1024; // longest edge of stored product image
const WEBP_QUALITY = 80; // 1-100

interface ProcessedImage {
  buffer: Uint8Array;
  ext: string;
  width: number;
  height: number;
}

/**
 * Process an uploaded raster image with Bun.image.
 * Returns `null` to signal "keep the original file untouched".
 */
export async function processUploadedImage(
  buffer: Uint8Array,
  fileType: string,
): Promise<ProcessedImage | null> {
  // Formats the native codec cannot re-encode without losing fidelity
  if (fileType === "image/gif" || fileType === "image/svg+xml") {
    return null;
  }

  try {
    // EXIF orientation is applied automatically (autoOrient defaults to true)
    const img = new Bun.Image(buffer);
    const meta = await img.metadata();

    if (!meta || !meta.width || !meta.height) {
      return null;
    }

    const longest = Math.max(meta.width, meta.height);

    // Already small & already webp: nothing to gain from re-encoding
    if (longest <= MAX_DIMENSION && meta.format === "webp") {
      return null;
    }

    // Fit inside the max box, preserving aspect ratio, never upscaling
    const encoded = await img
      .resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .bytes();

    // Measure the real output dimensions (transformed-image metadata may
    // still report the source size)
    let outWidth = meta.width;
    let outHeight = meta.height;
    try {
      const outMeta = await new Bun.Image(encoded).metadata();
      if (outMeta?.width && outMeta?.height) {
        outWidth = outMeta.width;
        outHeight = outMeta.height;
      }
    } catch {
      // keep source dimensions
    }

    return {
      buffer: encoded,
      ext: "webp",
      width: outWidth,
      height: outHeight,
    };
  } catch (error) {
    console.warn("Bun.image processing failed, saving original file:", error);
    return null;
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const token = cookies.get("session")?.value;

    if (!token) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const session = getSessionByToken(token) as any;

    if (!session || session.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/avif",
      "image/svg+xml",
    ];
    if (!validTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({
          error:
            "Invalid file type. Only JPEG, PNG, GIF, WebP, AVIF, and SVG are allowed.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: "File too large. Maximum size is 10MB." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Create uploads directory if it doesn't exist
    const productionUploadsDir = join(
      process.cwd(),
      "dist",
      "client",
      "uploads",
    );
    const developmentUploadsDir = join(process.cwd(), "public", "uploads");
    const envUploadsDirRaw = process.env.UPLOADS_DIR;
    const envUploadsDir =
      envUploadsDirRaw && envUploadsDirRaw.startsWith("/")
        ? envUploadsDirRaw
        : envUploadsDirRaw
          ? join(process.cwd(), envUploadsDirRaw)
          : undefined;

    const isProduction =
      import.meta.env.PROD || process.env.NODE_ENV === "production";

    const baseCandidates = isProduction
      ? [productionUploadsDir, developmentUploadsDir]
      : [developmentUploadsDir, productionUploadsDir];

    const candidateDirs = envUploadsDir
      ? [envUploadsDir, ...baseCandidates]
      : baseCandidates;

    let resolvedUploadsDir: string | undefined;

    for (const dir of candidateDirs) {
      try {
        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        }
        resolvedUploadsDir = dir;
        break;
      } catch (mkdirError) {
        console.warn("Failed to ensure uploads directory at", dir, mkdirError);
      }
    }

    if (!resolvedUploadsDir) {
      return new Response(
        JSON.stringify({ error: "Failed to prepare uploads directory" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Read the uploaded file
    const sourceBuffer = new Uint8Array(await file.arrayBuffer());

    // Process with Bun.image (raster -> resized WebP; svg/gif pass through)
    const processed = await processUploadedImage(sourceBuffer, file.type);
    const buffer = processed?.buffer ?? sourceBuffer;
    const ext = processed?.ext ?? (file.name.split(".").pop() || "jpg");

    // Generate unique filename
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const filepath = join(resolvedUploadsDir, filename);

    // Write file
    await writeFile(filepath, buffer);

    // Return the public URL
    const imageUrl = `/uploads/${filename}`;

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        processed: !!processed,
        width: processed?.width ?? undefined,
        height: processed?.height ?? undefined,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(JSON.stringify({ error: "Failed to upload image" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

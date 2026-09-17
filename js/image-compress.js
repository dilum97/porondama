/**
 * image-compress.js
 * ------------------------------------------------------------------
 * Client-side photo compression, run right before a picked photo is
 * handed to uploadPhotoToCloudinary() (see js/cloudinary.js). Any
 * photo the member selects — regardless of original size — is
 * downscaled and re-encoded as JPEG, aiming for a file close to
 * PHOTO_MAX_BYTES, so we never send a multi-MB original to Cloudinary.
 *
 * Notes / deliberate limitations:
 *  - Animated GIFs are left untouched (re-encoding via <canvas> would
 *    flatten them to a single frame and kill the animation).
 *  - Files already at/under the target size are passed through as-is
 *    (no point re-encoding and losing quality for nothing).
 *  - If the browser can't decode the image for any reason, the
 *    original file is returned so the upload can still proceed rather
 *    than silently failing.
 * ------------------------------------------------------------------
 */
const PHOTO_MAX_BYTES = 1024 * 1024;   // ~1MB target upload size
const PHOTO_MAX_DIMENSION = 1600;      // longest side we start from, in px
const PHOTO_MIN_DIMENSION = 480;       // don't shrink past this hunting for the target size
const PHOTO_QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.28, 0.22];

async function compressPhotoForUpload(file) {
  if (!file || !file.type || !file.type.startsWith("image/")) return file;
  if (file.type === "image/gif") return file;      // keep animated gifs intact
  if (file.size <= PHOTO_MAX_BYTES) return file;    // already small enough

  const source = await decodeImageFile(file);
  if (!source) return file; // couldn't decode — upload the original rather than fail

  const naturalWidth = source.naturalWidth || source.width;
  const naturalHeight = source.naturalHeight || source.height;
  let dims = scaleToFit(naturalWidth, naturalHeight, PHOTO_MAX_DIMENSION);
  let blob = null;

  // Shrink dimensions further (on top of quality steps) until we're
  // under the target size, or we hit the minimum dimension.
  while (true) {
    const canvas = document.createElement("canvas");
    canvas.width = dims.w;
    canvas.height = dims.h;
    canvas.getContext("2d").drawImage(source, 0, 0, dims.w, dims.h);

    blob = await encodeWithQualitySteps(canvas);
    if (blob && blob.size <= PHOTO_MAX_BYTES) break;
    if (Math.max(dims.w, dims.h) <= PHOTO_MIN_DIMENSION) break; // best effort, stop here
    dims = scaleToFit(dims.w, dims.h, Math.round(Math.max(dims.w, dims.h) * 0.75));
  }

  if (source.close) source.close(); // release ImageBitmap memory
  if (!blob) return file;

  const compressedName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], compressedName, { type: "image/jpeg" });
}

function scaleToFit(w, h, maxSide) {
  if (w <= maxSide && h <= maxSide) return { w, h };
  const ratio = w > h ? maxSide / w : maxSide / h;
  return { w: Math.max(1, Math.round(w * ratio)), h: Math.max(1, Math.round(h * ratio)) };
}

function encodeWithQualitySteps(canvas) {
  return new Promise((resolve) => {
    let i = 0;
    let lastBlob = null;
    const attempt = () => {
      if (i >= PHOTO_QUALITY_STEPS.length) { resolve(lastBlob); return; }
      canvas.toBlob((blob) => {
        if (blob) lastBlob = blob;
        if (blob && blob.size <= PHOTO_MAX_BYTES) {
          resolve(blob);
        } else {
          i++;
          attempt();
        }
      }, "image/jpeg", PHOTO_QUALITY_STEPS[i]);
    };
    attempt();
  });
}

async function decodeImageFile(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch (e) {
      try {
        return await createImageBitmap(file);
      } catch (e2) {
        // fall through to <img> fallback below
      }
    }
  }
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

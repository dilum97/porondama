/**
 * cloudinary.js
 * ------------------------------------------------------------------
 * Direct-from-browser unsigned upload to Cloudinary, used for
 * profile photo backup. Requires CLOUDINARY_CLOUD_NAME and
 * CLOUDINARY_UPLOAD_PRESET to be set in firebase-config.js.
 *
 * Every file is first run through compressPhotoForUpload() (see
 * js/image-compress.js) so large originals get downscaled toward
 * ~1MB in the browser before they ever leave the device.
 * ------------------------------------------------------------------
 */
async function uploadPhotoToCloudinary(file) {
  const uploadFile = await compressPhotoForUpload(file);
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const form = new FormData();
  form.append("file", uploadFile);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  form.append("folder", "kendra-match/profiles");

  const res = await fetch(url, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "ඡායාරූපය උඩුගත කිරීම අසාර්ථකයි");
  return data.secure_url;
}

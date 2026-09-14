/**
 * cloudinary.js
 * ------------------------------------------------------------------
 * Direct-from-browser unsigned upload to Cloudinary, used for
 * profile photo backup. Requires CLOUDINARY_CLOUD_NAME and
 * CLOUDINARY_UPLOAD_PRESET to be set in firebase-config.js.
 * ------------------------------------------------------------------
 */
async function uploadPhotoToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  form.append("folder", "kendra-match/profiles");

  const res = await fetch(url, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "ඡායාරූපය උඩුගත කිරීම අසාර්ථකයි");
  return data.secure_url;
}

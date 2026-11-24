export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_AVATAR_LENGTH = 256_000;
export const PHOTO_TYPES =
  "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif";

export function isAvatarPhoto(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= MAX_AVATAR_LENGTH &&
    /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
  );
}

/** Create a small, metadata-free square photo before saving it to a private profile. */
export async function prepareProfilePhoto(file: File): Promise<string> {
  if (!file.size || file.size > MAX_PHOTO_BYTES)
    throw new Error("Choose a photo smaller than 5 MB.");
  const supported =
    PHOTO_TYPES.split(",").includes(file.type.toLowerCase()) ||
    (!file.type && /\.(jpe?g|png|webp|avif|heic|heif)$/i.test(file.name));
  if (!supported)
    throw new Error("Choose a photo, such as a JPG, PNG, or WebP image.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch {
      throw new Error(
        "This photo could not be opened. Try a JPG or PNG image.",
      );
    }
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > 50_000_000
    )
      throw new Error("Choose a smaller photo.");
    const edge = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 384;
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error(
        "This browser could not prepare your photo. Please try another browser.",
      );
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 384, 384);
    context.drawImage(
      image,
      (image.naturalWidth - edge) / 2,
      (image.naturalHeight - edge) / 2,
      edge,
      edge,
      0,
      0,
      384,
      384,
    );
    const result = canvas.toDataURL("image/jpeg", 0.84);
    if (!isAvatarPhoto(result))
      throw new Error(
        "This photo is too large to save. Choose a smaller image.",
      );
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}

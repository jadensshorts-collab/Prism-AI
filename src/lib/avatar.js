// Avatar handling. Base44 file storage is unavailable on this plan, so a
// picture is inlined as a data URI on the user's own UserProfile row. Entity
// string fields cap between 16k and 24k characters, so the image is squared,
// downscaled and re-encoded on the client until it fits with room to spare —
// an unbounded upload would simply be rejected by the write.
export const AVATAR_MAX_CHARS = 14000;

export const AVATAR_PRESETS = [
  { id: "spectrum", label: "Spectrum", css: "linear-gradient(135deg, #8B5CF6, #22D3EE)" },
  { id: "ember", label: "Ember", css: "linear-gradient(135deg, #FB7185, #FBBF24)" },
  { id: "moss", label: "Moss", css: "linear-gradient(135deg, #34D399, #22D3EE)" },
  { id: "dusk", label: "Dusk", css: "linear-gradient(135deg, #60A5FA, #A78BFA)" },
  { id: "signal", label: "Signal", css: "linear-gradient(135deg, #FBBF24, #FB7185)" },
  { id: "slate", label: "Slate", css: "linear-gradient(135deg, #9B9BAD, #4B4B58)" },
];

export const presetById = (id) => AVATAR_PRESETS.find((p) => p.id === id) || null;

export function parseAvatar(value) {
  if (!value) return { kind: "initial" };
  if (value.startsWith("preset:")) {
    const preset = presetById(value.slice(7));
    return preset ? { kind: "preset", preset } : { kind: "initial" };
  }
  if (value.startsWith("data:image/")) return { kind: "image", src: value };
  return { kind: "initial" };
}

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file could not be read as an image."));
    };
    img.src = url;
  });

function encode(img, size, quality) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  // Centre-crop to a square first so nothing is stretched.
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", quality);
}

// Squares, shrinks and compresses until the encoded string fits the field.
// Returns a data URI, or throws with a message meant for a person.
export async function fileToAvatar(file) {
  if (!file) throw new Error("No file selected.");
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  // Decoding a very large image can hang a tab; refuse before touching it.
  if (file.size > 12 * 1024 * 1024) throw new Error("That image is over 12 MB. Try a smaller one.");

  const img = await loadImage(file);
  if (!img.naturalWidth || !img.naturalHeight) throw new Error("That image appears to be empty.");

  for (const [size, quality] of [
    [160, 0.78],
    [128, 0.72],
    [96, 0.68],
    [72, 0.6],
  ]) {
    const uri = encode(img, size, quality);
    if (uri.length <= AVATAR_MAX_CHARS) return uri;
  }
  throw new Error("That image is too detailed to store. Try a simpler picture.");
}

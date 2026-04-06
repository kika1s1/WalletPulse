export function receiptFileExtensionFromMime(mime?: string | null): 'jpg' | 'png' | 'webp' {
  if (!mime) {
    return 'jpg';
  }
  const m = mime.toLowerCase();
  if (m.includes('png')) {
    return 'png';
  }
  if (m.includes('webp')) {
    return 'webp';
  }
  return 'jpg';
}

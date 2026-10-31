const previews = new Map<string, string>();
export function mediaPreview(src: string) {
  return previews.get(src) ?? src;
}
export function registerPreview(id: string, file: File) {
  const url = URL.createObjectURL(file);
  previews.set(`/api/v1/admin/media/${id}/file`, url);
  previews.set(`/api/v1/public/media/${id}`, url);
}
export function clearPreviews() {
  new Set(previews.values()).forEach((url) => URL.revokeObjectURL(url));
  previews.clear();
}

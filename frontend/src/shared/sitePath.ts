const base = import.meta.env.BASE_URL;

export function sitePath(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith(base)) {
    return path;
  }
  return base + path.slice(1);
}

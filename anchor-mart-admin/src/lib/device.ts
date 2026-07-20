/**
 * Best-effort human-readable client string, e.g. "Chrome on macOS".
 *
 * Returns undefined when the browser or OS can't be identified — callers should
 * omit the field entirely rather than sending a placeholder.
 */
export function getDeviceLabel(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  const ua = navigator.userAgent;
  if (!ua) return undefined;

  const browser = detect(ua, [
    [/Edg\//, "Edge"],
    [/OPR\/|Opera/, "Opera"],
    // Chrome must come after Edge/Opera — both keep "Chrome" in their UA.
    [/Chrome\//, "Chrome"],
    [/Firefox\//, "Firefox"],
    // Safari must come last — Chrome/Edge/Opera also carry "Safari".
    [/Safari\//, "Safari"],
  ]);

  const os = detect(ua, [
    [/Windows NT/, "Windows"],
    [/Android/, "Android"],
    // iOS check precedes macOS: iPad UAs can contain "Macintosh".
    [/iPhone|iPad|iPod/, "iOS"],
    [/Mac OS X|Macintosh/, "macOS"],
    [/Linux/, "Linux"],
  ]);

  if (!browser && !os) return undefined;
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os;
}

function detect(ua: string, table: [RegExp, string][]): string | undefined {
  for (const [pattern, label] of table) {
    if (pattern.test(ua)) return label;
  }
  return undefined;
}

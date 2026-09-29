/**
 * Evidence files are uploaded to ImageKit and their URLs are shown to the
 * other party and to admins as clickable links. Only accept https URLs on
 * the configured ImageKit host, so a `javascript:` or phishing link can't be
 * submitted as "evidence".
 */
export function isAllowedEvidenceUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") {
    return false;
  }

  const endpoint = process.env.NEXT_PUBLIC_URL_ENDPOINT;
  if (!endpoint) {
    return true;
  }

  try {
    return url.host === new URL(endpoint).host;
  } catch {
    return true;
  }
}

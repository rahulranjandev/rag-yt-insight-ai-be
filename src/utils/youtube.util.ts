/* eslint-disable no-control-regex */
function extractYoutubeId(url: string): string {
  try {
    const parsed = new URL(url);

    const host = parsed.hostname.replace('www.', '');

    if (host === 'youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = parsed.searchParams.get('v');
      if (v) return v;

      const parts = parsed.pathname.split('/').filter(Boolean);
      const embedIndex = parts.indexOf('embed');
      if (embedIndex >= 0 && parts[embedIndex + 1])
        return parts[embedIndex + 1] ?? '';

      const shortsIndex = parts.indexOf('shorts');
      if (shortsIndex >= 0 && parts[shortsIndex + 1])
        return parts[shortsIndex + 1] ?? '';
    }

    return '';
  } catch {
    return '';
  }
}

function cleanDescription(description: string): string {
  return description
    .replace(/[\r\n]+/g, '\n')
    .replace(/\s+/g, ' ')
    .replace(/\u0000/g, '')
    .trim();
}

function cleanText(text: string): string {
  return text
    .replace(/[\r\n]+/g, '\n')
    .replace(/\s+/g, ' ')
    .replace(/\u0000/g, '')
    .trim();
}

export { extractYoutubeId, cleanDescription, cleanText };

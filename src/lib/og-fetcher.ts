export interface OGData {
  url: string
  title: string
  description: string
  image: string
  siteName: string
}

const URL_REGEX = /https?:\/\/[^\s"]+/g

export function extractUrls(text: string): string[] {
  return text.match(URL_REGEX) || []
}

function ogMatch(html: string, prop: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) return decodeEntities(m[1])
  }
  return null
}

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#x2F;/g, '/')
}

export async function fetchOGData(url: string): Promise<OGData | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OGPreviewBot/1.0)' },
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timeout)
    const html = await res.text()

    const title = ogMatch(html, 'og:title') || ogMatch(html, 'twitter:title') || html.match(/<title>([^<]+)<\/title>/i)?.[1] || url
    const description = ogMatch(html, 'og:description') || ogMatch(html, 'twitter:description') || ''
    const image = ogMatch(html, 'og:image') || ogMatch(html, 'twitter:image') || ''
    const siteName = ogMatch(html, 'og:site_name') || new URL(url).hostname.replace('www.', '')

    return { url, title: decodeEntities(title), description: decodeEntities(description), image, siteName }
  } catch {
    return null
  }
}

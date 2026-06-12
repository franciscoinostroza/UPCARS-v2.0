export interface OGData {
  url: string
  title: string
  description: string
  image: string
  siteName: string
}

export async function fetchOGData(url: string): Promise<OGData | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OGPreviewBot/1.0)' },
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timeout)
    if (!res.ok) return null

    const text = await res.text()
    const head = text.slice(0, 6000)

    function og(prop: string): string | null {
      const p = [
        new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'),
      ]
      for (const r of p) {
        const m = head.match(r)
        if (m) return m[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
      }
      return null
    }

    const siteName = og('og:site_name') || new URL(url).hostname.replace('www.', '')

    return {
      url,
      title: og('og:title') || og('twitter:title') || head.match(/<title>([^<]+)<\/title>/i)?.[1] || siteName,
      description: og('og:description') || og('twitter:description') || '',
      image: og('og:image') || og('twitter:image') || '',
      siteName,
    }
  } catch {
    return null
  }
}

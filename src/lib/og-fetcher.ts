export interface OGData {
  url: string
  title: string
  description: string
  image: string
  siteName: string
}

export async function fetchOGClient(url: string): Promise<OGData | null> {
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    const res = await fetch(proxyUrl)
    if (!res.ok) return null
    const html = await res.text()
    const head = html.slice(0, 10000)

    function og(prop: string): string | null {
      const p = [
        new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'),
      ]
      for (const r of p) {
        const m = head.match(r)
        if (m) return m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
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

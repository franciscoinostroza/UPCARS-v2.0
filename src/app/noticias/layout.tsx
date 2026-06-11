import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '📢 Tablón de Noticias - UPCARS',
  description: 'Noticias y comunicaciones del equipo UPCARS',
  openGraph: {
    title: '📢 Tablón de Noticias - UPCARS',
    description: 'Noticias y comunicaciones del equipo UPCARS',
  },
}

export default function NoticiasLayout({ children }: { children: React.ReactNode }) {
  return children
}

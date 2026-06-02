import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UPCARS - Dashboard Operativo',
  description: 'Panel de control del ecosistema operativo UPCARS',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('theme');
                var isDark = t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches);
                if (window.self !== window.top) isDark = true;
                if (isDark) document.documentElement.classList.add('dark');
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}

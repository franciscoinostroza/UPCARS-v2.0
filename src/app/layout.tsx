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
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}

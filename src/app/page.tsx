import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <main className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">UPCARS</h1>
        <p className="text-lg text-gray-600 mb-8">
          Ecosistema operativo del concesionario
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition"
          >
            Dashboard
          </Link>
          <a
            href="/api/health"
            className="px-6 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition"
          >
            Health Check
          </a>
        </div>
      </main>
    </div>
  )
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NexusForge — Simulación Industrial 3D con IA',
  description: 'Plataforma SaaS de simulación industrial 3D impulsada por IA. Genera, visualiza y optimiza procesos de manufactura, logística, alimentos y más.',
  keywords: 'simulación industrial, 3D, IA, manufactura, logística, AnyLogic, FlexSim, digital twin',
  authors: [{ name: 'NexusForge' }],
  openGraph: {
    title: 'NexusForge — Simulación Industrial 3D con IA',
    description: 'Genera simulaciones 3D de procesos industriales en segundos con IA.',
    type: 'website',
    siteName: 'NexusForge',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NexusForge — Simulación Industrial 3D con IA',
    description: 'Genera simulaciones 3D de procesos industriales en segundos con IA.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0, background: '#050810' }}>
        {children}
      </body>
    </html>
  )
}

import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             'Demand Signals — AI-Powered Demand Generation',
    short_name:       'Demand Signals',
    description:      'AI-powered websites, AI agent swarms, and automated marketing for local businesses in Northern California. 14+ projects shipped. Always on.',
    start_url:        '/',
    display:          'standalone',
    background_color: '#080e1f',
    theme_color:      '#68c5ad',
    orientation:      'portrait-primary',
    categories:       ['business', 'marketing', 'productivity'],
    icons: [
      { src: '/favicon.ico', sizes: '48x48',   type: 'image/x-icon' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png',  purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png',  purpose: 'any' },
    ],
  }
}

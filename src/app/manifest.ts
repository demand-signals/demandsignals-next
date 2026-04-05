import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             'Demand Signals',
    short_name:       'Demand Signals',
    description:      'AI-powered demand generation for Northern California businesses.',
    start_url:        '/',
    display:          'standalone',
    background_color: '#080e1f',
    theme_color:      '#52C9A0',
    icons: [
      { src: '/favicon.ico', sizes: '48x48',   type: 'image/x-icon' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}

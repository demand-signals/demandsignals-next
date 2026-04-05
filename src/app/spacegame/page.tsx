import type { Metadata } from 'next'
import { SpaceGame } from '@/components/sections/SpaceGame'

export const metadata: Metadata = {
  title: 'Digital Defense Squadron — Demand Signals',
  description: 'Defend the digital realm from cyber threats. A Demand Signals mini-game.',
}

export default function SpaceGamePage() {
  return <SpaceGame />
}

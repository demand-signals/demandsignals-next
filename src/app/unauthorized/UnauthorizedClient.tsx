'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Shield, AlertTriangle, Monitor, MapPin, Globe, Clock, User } from 'lucide-react'
import Link from 'next/link'

interface Fingerprint {
  email: string
  fullName: string
  avatarUrl: string | null
  ip: string
  city: string
  region: string
  country: string
  latitude: string | null
  longitude: string | null
  browser: string
  os: string
  deviceType: string
  userAgent: string
  screenResolution: string | null
  timezone: string | null
  language: string | null
  timestamp: string
}

export default function UnauthorizedClient() {
  const [data, setData] = useState<Fingerprint | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    async function logAndCollect() {
      try {
        const res = await fetch('/api/unauthorized-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
          }),
        })

        if (res.ok) {
          const fingerprint = await res.json()
          // Override with client-side values (more accurate)
          fingerprint.screenResolution = `${window.screen.width}x${window.screen.height}`
          fingerprint.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
          fingerprint.language = navigator.language
          setData(fingerprint)
        } else {
          // No session — redirect home
          window.location.href = '/'
          return
        }
      } catch {
        window.location.href = '/'
        return
      }
      setLoading(false)
    }

    logAndCollect()
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-red-500 font-mono text-sm tracking-widest uppercase animate-pulse">
            Scanning session...
          </p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const location = [data.city, data.region, data.country]
    .filter(v => v && v !== 'Unknown')
    .join(', ')

  const details = [
    { icon: User, label: 'Identity', value: data.fullName, sub: data.email },
    { icon: Globe, label: 'IP Address', value: data.ip },
    { icon: MapPin, label: 'Location', value: location || 'Unknown' },
    { icon: Monitor, label: 'Browser', value: data.browser },
    { icon: Monitor, label: 'Operating System', value: data.os },
    { icon: Monitor, label: 'Device Type', value: data.deviceType },
    { icon: Monitor, label: 'Screen Resolution', value: data.screenResolution || 'Unknown' },
    { icon: Clock, label: 'Timezone', value: data.timezone || 'Unknown' },
    { icon: Globe, label: 'Language', value: data.language || 'Unknown' },
    { icon: Clock, label: 'Timestamp', value: new Date(data.timestamp).toLocaleString() },
  ]

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Scan line effect */}
      <div
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,0,0.03) 2px, rgba(255,0,0,0.03) 4px)',
        }}
      />

      {/* Subtle grid background */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,0,0,0.05) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-20 w-full max-w-lg"
      >
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-red-500/50 bg-red-500/10 mb-4">
            <Shield className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-red-500 tracking-tight mb-2">
            ACCESS DENIED
          </h1>
          <p className="text-red-400/80 text-sm font-mono tracking-widest uppercase">
            Unauthorized access attempt detected
          </p>
        </motion.div>

        {/* Fingerprint card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="border border-red-500/30 rounded-lg bg-black/80 backdrop-blur overflow-hidden"
        >
          {/* Avatar + name header */}
          {data.avatarUrl && (
            <div className="flex items-center gap-4 p-5 border-b border-red-500/20 bg-red-500/5">
              <img
                src={data.avatarUrl}
                alt=""
                className="w-14 h-14 rounded-full border-2 border-red-500/40"
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="text-white font-semibold text-lg">{data.fullName}</p>
                <p className="text-red-400/70 text-sm font-mono">{data.email}</p>
              </div>
            </div>
          )}

          {/* Details grid */}
          <div className="p-5 space-y-0">
            {details.map((item, i) => {
              // Skip identity row if we showed avatar header
              if (item.label === 'Identity' && data.avatarUrl) return null

              return (
                <motion.div
                  key={item.label}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 + i * 0.08 }}
                  className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0"
                >
                  <item.icon className="w-4 h-4 text-red-500/60 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-white/40 text-xs font-mono uppercase tracking-wider">
                      {item.label}
                    </span>
                    <p className="text-white font-mono text-sm break-all">
                      {item.value}
                    </p>
                    {item.sub && (
                      <p className="text-white/50 font-mono text-xs break-all">{item.sub}</p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Warning footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-6 text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-2 text-red-400/60">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-xs font-mono tracking-wider uppercase">
              This attempt has been logged and reported
            </p>
          </div>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-block px-6 py-2.5 text-sm font-medium text-white/70 border border-white/20 rounded hover:bg-white/5 transition-colors font-mono"
          >
            {signingOut ? 'Redirecting...' : 'Leave'}
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}

'use client'

import { CheckCircle2, ExternalLink } from 'lucide-react'

interface Props {
  startAt: string
  meetLink: string | null
  attendeeEmail: string | null
}

function formatPt(iso: string): string {
  const d = new Date(iso)
  const day = d.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    timeZone: 'America/Los_Angeles',
  })
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: 'America/Los_Angeles',
  })
  return `${day} at ${time} PT`
}

export function MeetingConfirmedPanel({ startAt, meetLink, attendeeEmail }: Props) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 space-y-3">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-emerald-900 font-bold text-lg">Meeting confirmed</p>
          <p className="text-emerald-800 text-sm mt-0.5">{formatPt(startAt)}</p>
        </div>
      </div>
      {meetLink && (
        <a
          href={meetLink}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700 transition-colors w-full justify-center"
        >
          Join Google Meet
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
      {attendeeEmail && (
        <p className="text-xs text-emerald-700">
          Calendar invite sent to <strong>{attendeeEmail}</strong>.
        </p>
      )}
      <p className="text-xs text-emerald-700 pt-2 border-t border-emerald-200">
        Need to reschedule? Just reply in chat.
      </p>
    </div>
  )
}

# Cross-Domain Engagement Tracking — Design (Tier 3)

**Status:** DEFERRED — design only, not yet implemented
**Date:** 2026-04-29
**Trigger:** Hunter directive: "catch all traffic, all client activity on web, mobile and email"
**Predecessor commits:** Tier 1 (email engagement → activities) + Tier 2 (`/api/track/event` beacon + ClientTracker on magic-link pages) shipped same day.

---

## Goal

When a prospect interacts with ANY DSIG-controlled surface — including
client demo sites at `[client_code].demos.demandsignals.co` and
client production builds at `[client_code].staging.demandsignals.co` —
the engagement event lands in the prospect activities timeline at
demandsignals.co.

Today (Tier 1 + Tier 2): demandsignals.co's own magic-link pages (SOW,
invoice, quote share) and the public marketing pages already log to
the timeline + email_engagement.

Tier 3: extend that net to the demo/staging subdomains so a client
opening their pitch site or pre-launch staging gets logged on the
prospect timeline at demandsignals.co/admin.

---

## Why this is non-trivial

The Tier 2 beacon endpoint at `/api/track/event` already accepts
cross-origin POSTs (CORS allowlist for `*.demandsignals.co` +
demandsignals.co + localhost). So the demo sites COULD already POST
to it.

What's missing is the prospect_id resolution. The Tier 2 endpoint
expects a `surface` value in
`{ invoice | sow | quote_share | receipt | demo | staging }` and a
`surface_uuid`. Today the `demo` and `staging` cases short-circuit
because we have no table to resolve them against.

To wire demos: when a demo site is provisioned for a prospect, we
need a row that maps `[client_code]` (subdomain prefix) to a prospect_id.

---

## Schema

```sql
CREATE TABLE IF NOT EXISTS demo_sites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_code     text NOT NULL UNIQUE,           -- e.g. 'HANG', 'DOCK'
  prospect_id     uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  domain          text NOT NULL,                  -- 'hang.demos.demandsignals.co'
  kind            text NOT NULL CHECK (kind IN ('demo', 'staging')),
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz                     -- demos: 30-90d, staging: null
);
CREATE INDEX idx_demo_sites_client_code ON demo_sites (client_code);
CREATE INDEX idx_demo_sites_prospect ON demo_sites (prospect_id);
```

The Demo Factory (Stage C-D module per CLAUDE.md §18) writes a row
to this table when it spins up a new demo. Each row links the
subdomain prefix back to the originating prospect.

---

## Beacon flow on demo/staging sites

Each client demo/staging site embeds a tiny script (Hunter-controlled
template) that posts to `https://demandsignals.co/api/track/event`:

```html
<!-- DSIG engagement beacon — added by demo factory -->
<script>
  (function() {
    var clientCode = 'HANG';  // baked in by demo factory at provision time
    var endpoint = 'https://demandsignals.co/api/track/event';
    function send(event, data) {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event: event,
          surface: 'demo',
          surface_uuid: clientCode,
          doc_label: location.hostname,
          data: data || {}
        }),
        keepalive: true,
        credentials: 'omit'
      }).catch(function(){});
    }
    // Page-load
    send('session_start', {
      url: location.href,
      referrer: document.referrer || null,
      utms: extractUtms()
    });
    // Page-leave duration
    var t0 = Date.now();
    addEventListener('pagehide', function() {
      navigator.sendBeacon(
        endpoint,
        new Blob([JSON.stringify({
          event: 'page_leave',
          surface: 'demo',
          surface_uuid: clientCode,
          doc_label: location.hostname,
          data: { duration_ms: Date.now() - t0 }
        })], { type: 'application/json' })
      );
    });
    // … click delegation identical to ClientTracker.tsx
  })();
</script>
```

The endpoint extends its surface resolver to handle 'demo' / 'staging':

```ts
} else if (body.surface === 'demo' || body.surface === 'staging') {
  const { data } = await supabaseAdmin
    .from('demo_sites')
    .select('id, prospect_id')
    .eq('client_code', body.surface_uuid)
    .eq('kind', body.surface)
    .eq('active', true)
    .maybeSingle()
  prospect_id = data?.prospect_id ?? null
  resolved_doc_id = data?.id ?? null
}
```

The activity row writes with `channel='web'` and a subject like
"Visited demo site hang.demos.demandsignals.co".

---

## Why it's deferred

Demo factory itself isn't built yet (CLAUDE.md §11 lists it as a
high-priority but separate workstream). When demo factory ships:

1. It creates the `demo_sites` row at provision time.
2. It bakes the beacon script template into every generated site.
3. The Tier 2 endpoint's `demo` / `staging` branch lights up automatically.

Until demo factory ships there's no demo site to beacon FROM, so
the schema + endpoint extension sit ready but inactive.

---

## Open question — anonymous demo viewers

If a prospect's demo URL gets shared with a third party (their
business partner, spouse, internal stakeholder), the third party's
device hits the demo site and triggers the beacon. The activity
row will attribute to the original prospect's timeline.

Is that desired? Probably yes — the prospect's stakeholders engaging
with the demo is a buying signal. But worth flagging when this
ships so admin understands the attribution rule.

If undesired: add an opt-in cookie or device-fingerprint check to
filter "visits from devices that have ever visited demandsignals.co
admin or magic-link" (those are likely the prospect themselves vs
forwarded to a third party).

---

## Files that would change when this ships

- `supabase/migrations/0NN_demo_sites.sql` — new table + indexes
- `src/app/api/track/event/route.ts` — add demo + staging surface
  resolvers (already structurally ready, just need the lookup logic)
- New helper `src/lib/demo-sites.ts` — CRUD on demo_sites for the
  factory
- Demo factory plugin/template — embed the beacon script

Estimated: ~2 hours once demo factory exists. The standalone parts
(schema + endpoint extension) are ~30 minutes today if Hunter wants
the foundation in place.

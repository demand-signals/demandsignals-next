import { NextRequest, NextResponse } from 'next/server'
import { getWeeklyReport, type WeeklyReport } from '@/lib/analytics-db'
import { CONTACT_EMAIL } from '@/lib/constants'
import { sendEmail } from '@/lib/email'

/**
 * GET /api/analytics/weekly-report
 *
 * Vercel Cron job — runs every Monday at 9 AM Pacific.
 * Queries the last 7 days of pageview data and emails
 * a formatted HTML report.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret — Vercel cron sends CRON_SECRET automatically,
  // but we also accept VERCEL_ANALYTICS_CRON_SECRET for manual triggers
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.VERCEL_ANALYTICS_CRON_SECRET || process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const report = await getWeeklyReport()
    const html = buildEmailHtml(report)

    const result = await sendEmail({
      to: CONTACT_EMAIL,
      kind: 'weekly_analytics',
      subject: `📊 Weekly Analytics: ${report.period.from} — ${report.period.to} | ${report.totalPageviews} views, ${report.uniqueVisitors} visitors`,
      html,
    })

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error ?? 'Send failed' },
        { status: 502 },
      )
    }

    return NextResponse.json({
      ok: true,
      sent: true,
      summary: {
        pageviews: report.totalPageviews,
        visitors: report.uniqueVisitors,
        topPage: report.topPages[0]?.path || 'n/a',
      },
    })
  } catch (err) {
    console.error('[Weekly Report]', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/* ------------------------------------------------------------------ */
/*  Email HTML Builder                                                 */
/* ------------------------------------------------------------------ */

function trendArrow(current: number, previous: number): string {
  if (previous === 0) return '<span style="color:#52C9A0;">●</span> new'
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct > 0) return `<span style="color:#16a34a;">▲ ${pct}%</span>`
  if (pct < 0) return `<span style="color:#dc2626;">▼ ${Math.abs(pct)}%</span>`
  return '<span style="color:#6b7280;">— 0%</span>'
}

function barHtml(value: number, max: number, color: string): string {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return `<div style="background:#f1f5f9;border-radius:4px;height:8px;width:100%;"><div style="background:${color};border-radius:4px;height:8px;width:${pct}%;"></div></div>`
}

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia',
  DE: 'Germany', FR: 'France', IN: 'India', BR: 'Brazil', JP: 'Japan',
  TH: 'Thailand', SG: 'Singapore', NZ: 'New Zealand', IE: 'Ireland',
  NL: 'Netherlands', SE: 'Sweden', IT: 'Italy', ES: 'Spain', MX: 'Mexico',
  PH: 'Philippines', KR: 'South Korea', CN: 'China', RU: 'Russia',
}

function buildEmailHtml(r: WeeklyReport): string {
  const maxPageViews = r.topPages[0]?.views || 1
  const maxRefViews = r.topReferrers[0]?.views || 1

  // Daily trend mini-chart
  const maxDailyViews = Math.max(...r.dailyTrend.map(d => d.views), 1)
  const dailyBars = r.dailyTrend.map(d => {
    const h = Math.max(Math.round((d.views / maxDailyViews) * 60), 4)
    return `
      <td style="vertical-align:bottom;text-align:center;padding:0 2px;">
        <div style="background:#52C9A0;width:28px;height:${h}px;border-radius:3px 3px 0 0;margin:0 auto;"></div>
        <div style="font-size:9px;color:#94a3b8;margin-top:3px;">${d.date.split(',')[0]}</div>
        <div style="font-size:10px;color:#475569;font-weight:600;">${d.views}</div>
      </td>
    `
  }).join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:640px;margin:0 auto;background:#fff;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1d2330 0%,#2d3548 100%);padding:32px 28px;text-align:center;">
    <div style="font-size:13px;color:#52C9A0;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">Weekly Analytics Report</div>
    <div style="font-size:22px;color:#fff;font-weight:800;margin-bottom:4px;">Demand Signals</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.5);">${r.period.from} — ${r.period.to}</div>
  </div>

  <!-- Summary Cards -->
  <div style="padding:24px 28px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <td style="width:50%;padding:0 8px 16px 0;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 16px;text-align:center;">
            <div style="font-size:32px;font-weight:800;color:#1d2330;">${r.totalPageviews.toLocaleString()}</div>
            <div style="font-size:12px;color:#64748b;font-weight:600;margin:4px 0;">Pageviews</div>
            <div style="font-size:12px;">${trendArrow(r.totalPageviews, r.prevPageviews)} vs prior week</div>
          </div>
        </td>
        <td style="width:50%;padding:0 0 16px 8px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 16px;text-align:center;">
            <div style="font-size:32px;font-weight:800;color:#1d2330;">${r.uniqueVisitors.toLocaleString()}</div>
            <div style="font-size:12px;color:#64748b;font-weight:600;margin:4px 0;">Unique Visitors</div>
            <div style="font-size:12px;">${trendArrow(r.uniqueVisitors, r.prevUniqueVisitors)} vs prior week</div>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Daily Trend -->
  <div style="padding:8px 28px 24px;">
    <div style="font-size:14px;font-weight:700;color:#1d2330;margin-bottom:12px;">Daily Trend</div>
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">
      <tr>${dailyBars}</tr>
    </table>
  </div>

  <!-- Top Pages -->
  <div style="padding:0 28px 24px;">
    <div style="font-size:14px;font-weight:700;color:#1d2330;margin-bottom:12px;">Top Pages</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr style="border-bottom:2px solid #e2e8f0;">
        <td style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;padding:6px 0;">Page</td>
        <td style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;padding:6px 0;text-align:right;width:60px;">Views</td>
        <td style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;padding:6px 0;text-align:right;width:60px;">Visitors</td>
      </tr>
      ${r.topPages.slice(0, 15).map((p, i) => `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 8px 8px 0;font-size:13px;color:#334155;">
          <div style="margin-bottom:4px;">${p.path === '/' ? '/ (Homepage)' : p.path}</div>
          ${barHtml(p.views, maxPageViews, '#52C9A0')}
        </td>
        <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1d2330;text-align:right;">${p.views}</td>
        <td style="padding:8px 0;font-size:13px;color:#64748b;text-align:right;">${p.visitors}</td>
      </tr>
      `).join('')}
    </table>
  </div>

  <!-- Referrers -->
  ${r.topReferrers.length > 0 ? `
  <div style="padding:0 28px 24px;">
    <div style="font-size:14px;font-weight:700;color:#1d2330;margin-bottom:12px;">Traffic Sources</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${r.topReferrers.slice(0, 10).map(ref => `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 8px 8px 0;font-size:13px;color:#334155;">
          <div style="margin-bottom:4px;">${ref.domain}</div>
          ${barHtml(ref.views, maxRefViews, '#f28500')}
        </td>
        <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1d2330;text-align:right;width:60px;">${ref.views}</td>
      </tr>
      `).join('')}
    </table>
  </div>
  ` : ''}

  <!-- UTM Campaigns -->
  ${r.topUtmSources.length > 0 ? `
  <div style="padding:0 28px 24px;">
    <div style="font-size:14px;font-weight:700;color:#1d2330;margin-bottom:12px;">Campaign Traffic (UTM)</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr style="border-bottom:2px solid #e2e8f0;">
        <td style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;padding:6px 0;">Source</td>
        <td style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;padding:6px 0;">Medium</td>
        <td style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;padding:6px 0;text-align:right;">Views</td>
      </tr>
      ${r.topUtmSources.map(u => `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 0;font-size:13px;color:#334155;">${u.source}</td>
        <td style="padding:8px 0;font-size:13px;color:#64748b;">${u.medium}</td>
        <td style="padding:8px 0;font-size:13px;font-weight:600;text-align:right;">${u.views}</td>
      </tr>
      `).join('')}
    </table>
  </div>
  ` : ''}

  <!-- Three columns: Countries, Devices, Browsers -->
  <div style="padding:0 28px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <!-- Countries -->
        <td style="width:33%;vertical-align:top;padding-right:12px;">
          <div style="font-size:14px;font-weight:700;color:#1d2330;margin-bottom:10px;">Countries</div>
          ${r.topCountries.slice(0, 8).map(c => `
          <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;">
            <span style="color:#334155;">${COUNTRY_NAMES[c.country] || c.country}</span>
            <span style="color:#64748b;font-weight:600;">${c.views}</span>
          </div>
          `).join('')}
        </td>

        <!-- Devices -->
        <td style="width:33%;vertical-align:top;padding:0 6px;">
          <div style="font-size:14px;font-weight:700;color:#1d2330;margin-bottom:10px;">Devices</div>
          ${r.devices.map(d => `
          <div style="padding:3px 0;font-size:12px;">
            <div style="display:flex;justify-content:space-between;">
              <span style="color:#334155;text-transform:capitalize;">${d.type}</span>
              <span style="color:#64748b;font-weight:600;">${d.pct}%</span>
            </div>
          </div>
          `).join('')}
        </td>

        <!-- Browsers -->
        <td style="width:33%;vertical-align:top;padding-left:12px;">
          <div style="font-size:14px;font-weight:700;color:#1d2330;margin-bottom:10px;">Browsers</div>
          ${r.browsers.slice(0, 6).map(b => `
          <div style="padding:3px 0;font-size:12px;">
            <div style="display:flex;justify-content:space-between;">
              <span style="color:#334155;">${b.name}</span>
              <span style="color:#64748b;font-weight:600;">${b.pct}%</span>
            </div>
          </div>
          `).join('')}
        </td>
      </tr>
    </table>
  </div>

  <!-- OS -->
  <div style="padding:0 28px 24px;">
    <div style="font-size:14px;font-weight:700;color:#1d2330;margin-bottom:10px;">Operating Systems</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        ${r.osSystems.slice(0, 5).map(o => `
        <td style="text-align:center;padding:8px 4px;">
          <div style="font-size:18px;font-weight:800;color:#1d2330;">${o.pct}%</div>
          <div style="font-size:11px;color:#64748b;">${o.name}</div>
        </td>
        `).join('')}
      </tr>
    </table>
  </div>

  <!-- Bot traffic note -->
  <div style="padding:0 28px 24px;">
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;font-size:12px;color:#92400e;">
      <strong>Bot traffic filtered:</strong> ${r.botPageviews.toLocaleString()} bot pageviews excluded from this report.
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 28px;text-align:center;">
    <div style="font-size:11px;color:#94a3b8;line-height:1.6;">
      This report is generated automatically every Monday morning.<br>
      <a href="https://demandsignals.co" style="color:#52C9A0;text-decoration:none;font-weight:600;">demandsignals.co</a>
      &nbsp;&bull;&nbsp;
      Demand Signals Analytics — zero cookies, full data ownership.
    </div>
  </div>

</div>
</body>
</html>
  `.trim()
}

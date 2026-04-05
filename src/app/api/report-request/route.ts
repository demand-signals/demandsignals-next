import nodemailer from 'nodemailer';
import { NextRequest, NextResponse } from 'next/server';
import { CONTACT_EMAIL } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, business, phone, report_type, industry, question } = body;

    if (!name || !email || !business || !report_type) {
      return NextResponse.json(
        { success: false, error: 'Name, email, business, and report type are required.' },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const html = `
      <h2>Free Report Request</h2>
      <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr><td><strong>Name</strong></td><td>${name}</td></tr>
        <tr><td><strong>Email</strong></td><td><a href="mailto:${email}">${email}</a></td></tr>
        <tr><td><strong>Business</strong></td><td>${business}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${phone || '—'}</td></tr>
        <tr><td><strong>Report Type</strong></td><td>${report_type}</td></tr>
        <tr><td><strong>Industry</strong></td><td>${industry || '—'}</td></tr>
        <tr><td><strong>Marketing Challenge</strong></td><td style="white-space:pre-wrap;">${question || '—'}</td></tr>
      </table>
    `;

    await transporter.sendMail({
      from: `"Demand Signals Reports" <${process.env.SMTP_USER}>`,
      to: CONTACT_EMAIL,
      subject: `FREE REPORT REQUEST: ${report_type} — ${business}`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[report-request route] error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

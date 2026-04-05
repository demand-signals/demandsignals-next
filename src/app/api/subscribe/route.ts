import nodemailer from 'nodemailer';
import { NextRequest, NextResponse } from 'next/server';
import { CONTACT_EMAIL } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required.' }, { status: 400 });
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

    await transporter.sendMail({
      from: `"Demand Signals" <${process.env.SMTP_USER}>`,
      to: CONTACT_EMAIL,
      subject: `New Blog Subscriber: ${email}`,
      html: `
        <h2>New Newsletter Subscriber</h2>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p>This subscriber opted in via the blog/newsletter sign-up.</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[subscribe route] error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

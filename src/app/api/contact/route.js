import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  const { name, email, message } = await request.json();

  try {
    const response = await resend.emails.send({
      from: 'Contact Form <contact@physicsmonastery.earth>',
      to: 'thadroberts@mac.com',
      subject: `New message from ${name}`,
      reply_to: email,
      text: message,
    });

    return NextResponse.json({ status: 'ok', data: response });
  } catch (err) {
    console.error('❌ Error sending message:', err);
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
  }
}

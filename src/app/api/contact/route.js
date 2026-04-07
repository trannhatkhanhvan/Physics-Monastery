import { Resend } from 'resend';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const { name, email, message } = await request.json();

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const response = await resend.emails.send({
      from: 'Contact Form <contact@physicsmonastery.earth>',
      to: 'thadroberts@mac.com',
      subject: `New message from ${name}`,

      // already correct
      reply_to: email,

      // ✅ FIXED: include sender info clearly
      text: `
Name: ${name}
Email: ${email}

Message:
${message}
      `,

      // ✅ (optional but recommended)
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    });

    return NextResponse.json({ status: 'ok', data: response });
  } catch (err) {
    console.error('❌ Error sending message:', err);
    return NextResponse.json(
      { status: 'error', message: err.message },
      { status: 500 }
    );
  }
}
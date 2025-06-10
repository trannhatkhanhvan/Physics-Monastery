// /pages/api/contact.js

import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Use Apple's SMTP server
  const transporter = nodemailer.createTransport({
    host: 'smtp.mail.me.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.CONTACT_EMAIL,
      pass: process.env.CONTACT_EMAIL_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: process.env.CONTACT_EMAIL,
      subject: "New Contact Form Message",
      text: message,
    });

    res.status(200).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
}

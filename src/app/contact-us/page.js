'use client';

import { useState } from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';

export default function ContactUs() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Sending...');

    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message }),
    });

    if (res.ok) {
      setStatus('Message sent!');
      setName('');
      setEmail('');
      setMessage('');
    } else {
      setStatus('Failed to send message.');
    }
  };

  return (
    <LayoutWrapper>
      {/* ✅ Shared background overlay */}
      <div className="symbol-overlay" />

      {/* ✅ Page content */}
      <div className="partition-content">
        <div className="legend-title">contact us</div>

        <p className="equation-description">
          If you want to get involved in this project, or want to participate in a Physics Monastery event, feel free to reach out.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '30rem',
            margin: '2rem auto',
            gap: '1rem',
            color: 'white',
          }}
        >
          <label>
            Your Name:
            <input
              type="text"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: '0.3rem',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                color: 'white',
                backgroundColor: 'transparent',
              }}
            />
          </label>

          <label>
            Your Email:
            <input
              type="email"
              name="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: '0.3rem',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                color: 'white',
                backgroundColor: 'transparent',
              }}
            />
          </label>

          <label>
            Message:
            <textarea
              name="message"
              rows={5}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: '0.3rem',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                color: 'white',
                backgroundColor: 'transparent',
              }}
            />
          </label>

          <button
            type="submit"
            style={{
              padding: '0.75rem 1.5rem',
              marginTop: '1rem',
              borderRadius: '0.3rem',
              border: '1px solid white',
              backgroundColor: 'transparent',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold',
              width: 'fit-content',
              alignSelf: 'center',
              transition: 'background 0.3s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Send Message
          </button>

          {status && (
            <p style={{ textAlign: 'center', marginTop: '1rem', fontStyle: 'italic' }}>{status}</p>
          )}
        </form>
      </div>
    </LayoutWrapper>
  );
}

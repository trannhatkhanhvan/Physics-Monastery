// src/app/layout.js
import './globals.css';

export const metadata = {
  title: 'Physics Monastery',
  description: 'Exploring the constants of Nature and the geometry that shapes them.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children} {/* Wrapped pages will handle layout */}
      </body>
    </html>
  );
}

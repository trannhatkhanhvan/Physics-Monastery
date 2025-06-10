"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();

  const pageClass =
    pathname === '/' ? 'home-page' :
    pathname === '/constants-of-nature' ? 'constants-of-nature-page' :
    pathname === '/symbol-legend' ? 'symbol-legend-page' :
    pathname === '/hyperbolic-partition-eq' ? 'hyperbolic-partition-page' :
    pathname === '/binomial-constructor' ? 'binomial-constructor-page' :
    pathname === '/external-transform-space' ? 'external-transform-page' :
    pathname === '/planck-constants' ? 'planck-constants-page' :
    pathname === '/coherent-units' ? 'coherent-units-page' :
    pathname === '/simplest-manifold' ? 'simplest-manifold-page' :
    pathname === '/combinatorics' ? 'combinatorics-page' :
    pathname === '/animated-math' ? 'animated-math-page' :
    pathname === '/monastery-events' ? 'monastery-events-page' :
    pathname === '/supporters' ? 'supporters-page' :
    pathname === '/contact-us' ? 'contact-us-page' :
    '';

  return (
    <div className="layout-container">
      <div className="sidebar">
        <Link href="/" className="logo-link">
  <img src="/logo_image.png" alt="Physics Monastery Logo" className="logo" />
</Link>

        <div className="separator"></div>

        <nav className="menu">
          <a href="/constants-of-nature">Constants of Nature</a>
          <a href="/symbol-legend">Symbol Legend</a>

          <div className="separator"></div>

          <a href="/hyperbolic-partition-eq">Hyperbolic Partition Eq</a>
          <a href="/binomial-constructor">Binomial Constructor</a>
          <a href="/external-transform-space">External Transform Space</a>

          <div className="separator"></div>

          <a href="/planck-constants">Planck Constants</a>
          <a href="/coherent-units">Coherent Units</a>

          <div className="separator"></div>

          <div className="menu-youtube-links">
  <div className="tooltip-container">
    <a
      href="https://www.youtube.com/@thadroberts77"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img
  src="/Thad-logo.jpg"
  alt=""
  className="menu-icon"
  aria-label="Thad's YouTube Channel"
/>
      <span className="custom-tooltip tooltip-thad">Thad Roberts</span>
    </a>
  </div>

  <div className="tooltip-container">
    <a
      href="https://www.youtube.com/@TheMemesofDestruction"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img
        src="/Memes-logo.jpg"
        alt=""
        className="menu-icon"
        aria-label="Memes' YouTube Channel"
      />
      <span className="custom-tooltip">Memes of Destruction</span>
    </a>
  </div>
</div>


          <div className="separator"></div>

          <a href="/simplest-manifold">Simplest Manifold</a>
          <a href="/combinatorics">Combinatorics</a>
          <a href="/animated-math">Animated Math</a>

          <div className="separator"></div>

          <a href="/monastery-events">Monastery Events</a>
          <a href="/supporters">Supporters</a>
          <a href="/contact-us">Contact Us</a>
        </nav>
      </div>

      <div className="separator-line"></div>

      <div className={`main-content ${pageClass}`}>
        {children}
      </div>
    </div>
  );
}

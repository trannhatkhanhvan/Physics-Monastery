"use client";

import {
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const SIDEBAR_COLLAPSED_STORAGE_KEY =
  "physics-monastery:sidebar-collapsed";

function CrescentIcon() {
  const outerR = 11;       // size of the full moon
  const cutoutR = 11;      // size of the circle cutting into it
  const cutoutX = 11.5;      // move right/left to change crescent thickness
  const cutoutY = 12.5;      // move up/down if needed

  return (
    <svg
      className="sidebar-toggle-icon sidebar-toggle-crescent"
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <defs>
        <mask id="crescent-mask">
          <rect width="32" height="32" fill="white" />
          <circle cx={cutoutX} cy={cutoutY} r={cutoutR} fill="black" />
        </mask>
      </defs>

      <circle
        cx="16"
        cy="16"
        r={outerR}
        fill="currentColor"
        mask="url(#crescent-mask)"
      />
    </svg>
  );
}

function FullMoonIcon() {
  const moonR = 11; // match CrescentIcon outerR

  return (
    <svg
      className="sidebar-toggle-icon sidebar-toggle-full-moon"
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <circle
        cx="16"
        cy="16"
        r={moonR}
        fill="currentColor"
      />
    </svg>
  );
}

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const [
    hydratedPathname,
    setHydratedPathname,
  ] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarWidth = sidebarCollapsed ? 32 : 142;

  /*
   * Keep the server render and the browser's first render identical.
   * Next.js can report a different pathname on the client after a
   * rewrite or route resolution, so pathname-dependent classes are
   * applied only after hydration.
   */
  useEffect(() => {
    setHydratedPathname(pathname ?? '');
  }, [pathname]);

  /*
   * Restore the visitor's last left-menu state before the
   * hydrated layout is painted. This prevents the expanded
   * menu from visibly flashing before a stored collapsed
   * state is applied.
   */
  useLayoutEffect(() => {
    try {
      const stored =
        window.localStorage.getItem(
          SIDEBAR_COLLAPSED_STORAGE_KEY
        );

      if (stored === "true") {
        setSidebarCollapsed(true);
      } else if (stored === "false") {
        setSidebarCollapsed(false);
      }
    } catch {
      /*
       * If storage is unavailable, retain the normal
       * expanded default.
       */
    }
  }, []);

  const pageClass =
    hydratedPathname === '/' ? 'home-page' :
    hydratedPathname === '/constants-of-nature' ? 'constants-of-nature-page' :
    hydratedPathname === '/symbol-legend' ? 'symbol-legend-page' :
    hydratedPathname === '/288' ? 'combinatorics-page' :
    hydratedPathname === '/hyperbolic-partition-eq' ? 'hyperbolic-partition-page' :
    hydratedPathname === '/binomial-constructor' ? 'binomial-constructor-page' :
    hydratedPathname === '/transform-space' ? 'external-transform-page' :
    hydratedPathname === '/typed-boundary-calculus' ? 'external-transform-page typed-boundary-calculus-page' :
    hydratedPathname === '/planck-constants' ? 'planck-constants-page' :
    hydratedPathname === '/coherent-units' ? 'coherent-units-page' :
    hydratedPathname === '/simplest-manifold' ? 'simplest-manifold-page' :
    hydratedPathname === '/combinatorics' ? 'combinatorics-page' :
    hydratedPathname === '/number-walls' ? 'number-walls-wrapper-page' :
    hydratedPathname === '/animated-math' ? 'animated-math-page' :
    hydratedPathname === '/books' ? 'books-page' :
    hydratedPathname === '/the-logic-of-persistence' ? 'books-page' :
    hydratedPathname === '/monastery-events' ? 'monastery-events-page' :
    hydratedPathname === '/supporters' ? 'supporters-page' :
    hydratedPathname === '/contact-us' ? 'contact-us-page' :
    hydratedPathname === '/forum' ? 'forum-page' :
    '';

  return (
    <div
  className={`layout-container ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}
  style={{ "--sidebar-width": `${sidebarWidth}px` }}
>
        <div
  className={`sidebar ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
  style={{ width: `${sidebarWidth}px` }}
>
            <button
  type="button"
  className="sidebar-toggle"
  onClick={() =>
    setSidebarCollapsed((value) => {
      const nextValue = !value;

      try {
        window.localStorage.setItem(
          SIDEBAR_COLLAPSED_STORAGE_KEY,
          String(nextValue)
        );
      } catch {
        /*
         * The menu still toggles normally if browser
         * storage is unavailable.
         */
      }

      /*
       * Keep the pre-paint document state synchronized with
       * the live React state. Otherwise the CSS used during
       * reload could continue forcing an old collapsed state.
       */
      if (nextValue) {
        document.documentElement.setAttribute(
          "data-sidebar-collapsed",
          "true"
        );
      } else {
        document.documentElement.removeAttribute(
          "data-sidebar-collapsed"
        );
      }

      return nextValue;
    })
  }
  aria-label={sidebarCollapsed ? "Expand menu" : "Collapse menu"}
  title={sidebarCollapsed ? "Expand menu" : "Collapse menu"}
  style={{
    position: "fixed",
    top: "12px",
    left: "11px",
    width: "22px",
    height: "22px",
    zIndex: 3000,
  }}
>
  {sidebarCollapsed ? <FullMoonIcon /> : <CrescentIcon />}
</button>

            {!sidebarCollapsed && (
  <>
        <Link href="/" className="logo-link">
  <img src="/logo_image.png" alt="Physics Monastery Logo" className="logo" />
</Link>

        <div className="separator"></div>

        <nav className="menu">
          <a href="/constants-of-nature" className="menu-text-link">Constants of Nature</a>
          <a href="/symbol-legend" className="menu-text-link">Legend</a>
          <a href="/288" className="menu-text-link">288 Closed Forms</a>
          <a href="/code/constant-engine" className="menu-text-link">Code</a>
          <div className="tooltip-container">
  <a
    href="https://www.wolframalpha.com/"
    target="_blank"
    rel="noopener noreferrer"
  >
    <img
      src="/images/wolframalpha_icon.png"
      alt="WolframAlpha"
      className="wolframalpha-logo"
    />
  </a>
</div>

          <div className="separator"></div>

          <a href="/hyperbolic-partition-eq" className="menu-text-link">Hyperbolic Partitions</a>
          <a href="/binomial-constructor" className="menu-text-link">Binomial Constructor</a>
          <a href="/simplest-manifold" className="menu-text-link">Simplest Manifold</a>
          <a href="/transform-space" className="menu-text-link">Transform Space</a>


          <div className="separator"></div>

          <a href="/planck-constants" className="menu-text-link">Planck Constants</a>
          <a href="/coherent-units" className="menu-text-link">Coherent Units</a>

          <a href="/animated-math" className="menu-text-link">Animated Math</a>
          <a href="/combinatorics" className="menu-text-link">Combinatorics</a>
          <a href="/number-walls" className="menu-text-link">Number Walls</a>

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
    </a>
    <div className="custom-tooltip tooltip-thad">Thad</div>
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
    </a>
    <div className="custom-tooltip">Memes of Destruction</div>
  </div>

  <div className="tooltip-container">
    <a
      href="https://www.youtube.com/watch?v=aSz5BjExs9o"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img
        src="/tedx.jpg"
        alt=""
        className="menu-icon"
        aria-label="Ted Talk"
      />
    </a>
    <div className="custom-tooltip">Ted Talk</div>
  </div>
</div>


          <div className="separator"></div>

          <a href="/forum" className="menu-text-link">Forum</a>
          <a href="/monastery-events" className="menu-text-link">Events</a>
          <a href="/books" className="menu-text-link">Books</a>
          <a href="/the-logic-of-persistence" className="menu-text-link">Logic of Persistence</a>
          <a href="/supporters" className="menu-text-link">Supporters</a>
          <a href="/contact-us" className="menu-text-link">Contact Us</a>


          </nav>
      </>
    )}
      </div>

      <div className="separator-line"></div>

      <div
  className={`main-content ${pageClass}`}
  style={{ paddingLeft: `${sidebarWidth}px` }}
>
  {children}
</div>
    </div>
  );
}

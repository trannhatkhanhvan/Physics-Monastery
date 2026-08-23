import "katex/dist/katex.min.css";
// src/app/layout.js
import './globals.css';

export const metadata = {
  title: 'Physics Monastery',
  description: 'Exploring the constants of Nature and the geometry that shapes them.',
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        {/*
         * When the saved menu state is collapsed, these rules
         * make the server-rendered layout collapsed immediately,
         * before React hydration begins.
         */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html[data-sidebar-collapsed="true"]
              .layout-container {
                --sidebar-width: 32px !important;
              }

              html[data-sidebar-collapsed="true"]
              .sidebar {
                width: 32px !important;
                padding-top: 0.6rem !important;
                overflow: hidden !important;
              }

              html[data-sidebar-collapsed="true"]
              .sidebar .logo-link,
              html[data-sidebar-collapsed="true"]
              .sidebar > .separator,
              html[data-sidebar-collapsed="true"]
              .sidebar .menu {
                display: none !important;
              }

              html[data-sidebar-collapsed="true"]
              .main-content {
                padding-left: 32px !important;
              }
            `,
          }}
        />

        {/*
         * This executes before <body> is parsed. Therefore a
         * stored collapsed menu never has to appear expanded
         * for one frame first.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (
                  localStorage.getItem(
                    "physics-monastery:sidebar-collapsed"
                  ) === "true"
                ) {
                  document.documentElement.setAttribute(
                    "data-sidebar-collapsed",
                    "true"
                  );
                }
              } catch (error) {}
            `,
          }}
        />
      </head>

      <body>
        {children} {/* Wrapped pages will handle layout */}
      </body>
    </html>
  );
}

"use client";

import LayoutWrapper from "../../components/LayoutWrapper";
import GFunctionsExplorer from "./GFunctionsExplorer";
import { useEffect } from "react";

export default function GFunctionsPage() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);

  return (
    <LayoutWrapper>
      <div
        className="symbol-overlay"
        style={{
          left: 0,
          width: '100vw',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          isolation: 'isolate',
        }}
      >
        <div
          style={{
            height: '100dvh',
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehavior: 'contain',
          }}
        >
          <GFunctionsExplorer />
        </div>
      </div>
    </LayoutWrapper>
  );
}

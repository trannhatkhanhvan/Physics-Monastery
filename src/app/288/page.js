'use client';

import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';

export default function TwoEightEight() {
  // Force the viewer right-side up (since current display is upside down)
  const ROTATE_DEG = 0;

  return (
    <LayoutWrapper>
      <div
        className="combinatorics-page" // reuse the same styles
        style={{
          position: 'relative',
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
          background: 'black',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) rotate(${ROTATE_DEG}deg)`,
            transformOrigin: 'center',
            width: '100%',
            height: '100%',
          }}
        >
          <embed
  src="/pdfs/288.pdf#toolbar=1&navpanes=0&scrollbar=1&page=1&zoom=130,2165,020"
  type="application/pdf"
  style={{ width: '100%', height: '100%', border: 0 }}
/>

        </div>
      </div>
    </LayoutWrapper>
  );
}

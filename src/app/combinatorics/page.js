'use client';

import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';

export default function Combinatorics() {
  return (
    <LayoutWrapper>
      <div
        className="combinatorics-page"
        style={{
          position: 'relative',
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <embed
          src="/pdfs/combinatorics.pdf#toolbar=1&navpanes=0&scrollbar=1&view=FitH"
          type="application/pdf"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        />
      </div>
    </LayoutWrapper>
  );
}

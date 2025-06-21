'use client';

import { useState } from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';

export default function BooksPage() {
  // Toggle state for Einstein's Intuition
  const [einsteinIndex, setEinsteinIndex] = useState(0);

  const einsteinVariants = [
    {
      label: 'Hardcover',
      thumb: '/books/einstein_s_intuition_cover.jpg',
      link: 'https://www.lulu.com/shop/thad-roberts/einsteins-intuition/hardcover/product-1r8mnvrk.html?q=thad+roberts&page=1&pageSize=4',
      alt: 'Einstein’s Intuition Hardcover Cover',
    },
    {
      label: 'Softcover',
      thumb: '/books/soft_cover.jpg',
      link: 'https://www.amazon.com/Einsteins-Intuition-Visualizing-Nature-Dimensions-ebook/dp/B01MQL4807?ref_=ast_author_dp&dib=eyJ2IjoiMSJ9.4iz91WWrhFd4-2tcJpR0qt05KqNnR_kLOpPl-OnG2WAWZIrqtoQJW0sfruwpPEIei5nCtmpzX3zr_KZQPRqVlF1Su7VY26Zx0e3Fp64eSq8.ZKAirQvC6EMsqGdBbfkc_AxgBDDwsQe2rcL1DCbQffA&dib_tag=AUTHOR',
      alt: 'Einstein’s Intuition Softcover Cover',
    },
    {
      label: 'Audiobook',
      thumb: '/books/audiobook_cover.jpg',
      link: 'https://www.amazon.com/Einsteins-Intuition-Visualizing-Nature-Dimensions/dp/B016AWAIOE/?_encoding=UTF8&pd_rd_w=bQF9D&content-id=amzn1.sym.0fb2cce1-1ca4-439a-844b-8ad0b1fb77f7&pf_rd_p=0fb2cce1-1ca4-439a-844b-8ad0b1fb77f7&pf_rd_r=147-4333305-7685738&pd_rd_wg=VBuJE&pd_rd_r=a890a35d-ec0c-42b0-b7a2-a2e181bd20ee&ref_=aufs_ap_sc_dsk',
      alt: 'Einstein’s Intuition Audiobook Cover',
    },
  ];

  const bookList = [
    {
      title: 'The Logic of Persistence',
      thumb: '/books/logic_of_persistence_cover.jpg',
      full: '/books/logic.jpg',
      alt: 'The Logic of Persistence Cover',
      link: 'https://www.youtube.com/watch?v=vRPYe9ZotcM&list=PLEvMwDb3CwhQBHKmFcYzM2QkkFOlO-4Gr&t',
    },
    {
      title: '44 derangements',
      thumb: '/books/44_derangements_cover.jpg',
      full: '/books/logic.jpg',
      alt: '44 Derangements Cover',
      link: 'https://www.amazon.com/derangements-shape-persistence-Thad-Roberts-ebook/dp/B09VV9MLCV',
    },
    {
      title: 'Einstein’s Intuition',
      isEinstein: true, // 🔑 used to trigger custom rendering
    },
    {
      title: 'Passages',
      thumb: '/books/passages_cover.jpg',
      full: '/books/logic.jpg',
      alt: 'Passages Cover',
      link: 'https://www.amazon.com/Passages-Thad-Roberts-ebook/dp/B07TFDKTGC',
    },
    {
      title: 'Source Code',
      thumb: '/books/source_code_cover.jpg',
      full: '/books/logic.jpg',
      alt: 'Source Code Cover',
      link: 'https://www.amazon.com/Source-Code-persistence-Thad-Roberts-ebook/dp/B08ZCF9T99',
    },
    {
      title: 'A Perfect Universe',
      thumb: '/books/perfect_universe_cover.jpg',
      full: '/books/logic.jpg',
      alt: 'A Perfect Universe Cover',
      link: 'https://www.amazon.com/Perfect-Universe-Thad-Roberts-ebook/dp/B085B8QZMS',
    },
  ];

  return (
    <LayoutWrapper>
      <div className="symbol-overlay" />

      <div className="partition-content">
        <div className="legend-title">books</div>

        <div style={{ height: '1rem' }} />

        <p className="equation-description">
          The books below curate the major steps in my journey toward understanding the constants of Nature through geometry.
        </p>

        <div style={{ height: '2rem' }} />

        {/* ✅ Book cover gallery */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.5rem',
            justifyContent: 'center',
            padding: '1rem 0',
          }}
        >
          {bookList.map((book, index) => {
            if (book.isEinstein) {
  return (
    <div
      key={index}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        height: '300px',
      }}
    >
      {/* Floating toggle controls */}
      <div
        style={{
          position: 'absolute',
          top: '-2rem',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <button onClick={() => setEinsteinIndex((einsteinIndex + 2) % 3)}>←</button>
        <span style={{ color: 'white', fontSize: '0.9rem' }}>
          {einsteinVariants[einsteinIndex].label}
        </span>
        <button onClick={() => setEinsteinIndex((einsteinIndex + 1) % 3)}>→</button>
      </div>

      {/* Linked image */}
      <a
        href={einsteinVariants[einsteinIndex].link}
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          src={einsteinVariants[einsteinIndex].thumb}
          alt={einsteinVariants[einsteinIndex].alt}
          style={{
            height: '300px',
            width: 'auto',
            cursor: 'pointer',
            borderRadius: '0.4rem',
            boxShadow: '0 0 6px rgba(0,0,0,0.25)',
            transition: 'transform 0.2s',
          }}
        />
      </a>
    </div>
  );
}


            // Default rendering for all other books
            return (
              <a
                key={index}
                href={book.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={book.thumb}
                  alt={book.alt}
                  style={{
                    height: '300px',
                    width: 'auto',
                    cursor: 'pointer',
                    borderRadius: '0.4rem',
                    boxShadow: '0 0 6px rgba(0,0,0,0.25)',
                    transition: 'transform 0.2s',
                  }}
                />
              </a>
            );
          })}
        </div>

        <div style={{ height: '2rem' }} />



        <div style={{ height: '16rem' }} />
      </div>
    </LayoutWrapper>
  );
}

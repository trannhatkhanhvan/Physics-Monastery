'use client';

import { useState } from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';

export default function BooksPage() {
  const [einsteinIndex, setEinsteinIndex] = useState(0);

  const einsteinVariants = [
    {
      label: 'Hardcover',
      thumb: '/books/einstein_s_intuition_cover.jpg',
      link: 'https://www.lulu.com/shop/thad-roberts/einsteins-intuition/hardcover/product-1r8mnvrk.html?q=thad+roberts&page=1&pageSize=4',
      alt: 'Einstein’s Intuition Hardcover',
    },
    {
      label: 'Softcover',
      thumb: '/books/soft_cover.jpg',
      link: 'https://www.amazon.com/Einsteins-Intuition-Visualizing-Nature-Dimensions-ebook/dp/B01MQL4807?ref_=ast_author_dp&dib=eyJ2IjoiMSJ9.4iz91WWrhFd4-2tcJpR0qt05KqNnR_kLOpPl-OnG2WAWZIrqtoQJW0sfruwpPEIei5nCtmpzX3zr_KZQPRqVlF1Su7VY26Zx0e3Fp64eSq8.ZKAirQvC6EMsqGdBbfkc_AxgBDDwsQe2rcL1DCbQffA&dib_tag=AUTHOR',
      alt: 'Einstein’s Intuition Softcover',
    },
    {
      label: 'Audiobook',
      thumb: '/books/audiobook_cover.jpg',
      link: 'https://www.amazon.com/Einsteins-Intuition-Visualizing-Nature-Dimensions/dp/B016AWAIOE/?_encoding=UTF8&pd_rd_w=bQF9D&content-id=amzn1.sym.0fb2cce1-1ca4-439a-844b-8ad0b1fb77f7&pf_rd_p=0fb2cce1-1ca4-439a-844b-8ad0b1fb77f7&pf_rd_r=147-4333305-7685738&pd_rd_wg=VBuJE&pd_rd_r=a890a35d-ec0c-42b0-b7a2-a2e181bd20ee&ref_=aufs_ap_sc_dsk',
      alt: 'Einstein’s Intuition Audiobook',
    },
  ];

  const bookList = [
    { title: 'Einstein’s Intuition', isEinstein: true },

    {
      title: 'In search of the ultimate building blocks',
      thumb: '/books/in_search_of_the_ultimate_building_blocks_cover.jpg',
      alt: 'In search of the ultimate building blocks',
      link: 'https://www.amazon.com/Search-Ultimate-Building-Blocks-Hooft/dp/0521578833',
    },
    {
      title: 'The Shape Of Space',
      thumb: '/books/the_shape_of_space_cover.jpg',
      alt: 'The Shape Of Space',
      link: 'https://www.amazon.com/Shape-Space-Textbooks-Mathematics/dp/1138061212/ref=pd_lpo_d_sccl_1/147-4333305-7685738?pd_rd_w=Vsc9i&content-id=amzn1.sym.4c8c52db-06f8-4e42-8e56-912796f2ea6c&pf_rd_p=4c8c52db-06f8-4e42-8e56-912796f2ea6c&pf_rd_r=5BC2D8SFMN3199ZD0GCN&pd_rd_wg=oy4uJ&pd_rd_r=d29bbdc5-5bfc-4ab1-8ab6-bad9f199a0bf&pd_rd_i=1138061212&psc=1',
    },
    {
      title: 'The Geometry and Physics of Knots',
      thumb: '/books/the_geometry_and_physics_of_knots_cover.jpg',
      alt: 'The Geometry and Physics of Knots',
      link: 'https://www.amazon.com/Geometry-Physics-Knots-Lezioni-Lincee/dp/0521395542',
    },
    {
      title: 'A Beautiful Question',
      thumb: '/books/a_beautiful_question_cover.jpg',
      alt: 'A Beautiful Question',
      link: 'https://www.amazon.com/Beautiful-Question-Finding-Natures-Design/dp/1594205264',
    },
    {
      title: 'The Constants of Nature',
      thumb: '/books/the_constants_of_nature_cover.jpg',
      alt: 'The Constants of Nature',
      link: 'https://www.amazon.com/Constants-Nature-Numbers-Deepest-Universe/dp/1400032253/ref=pd_lpo_d_sccl_1/147-4333305-7685738?pd_rd_w=jF4dZ&content-id=amzn1.sym.4c8c52db-06f8-4e42-8e56-912796f2ea6c&pf_rd_p=4c8c52db-06f8-4e42-8e56-912796f2ea6c&pf_rd_r=RBMFYBY33WV5E5Q95TST&pd_rd_wg=gyTMG&pd_rd_r=dd594ee7-349f-4043-9905-bf7b5562b7f7&pd_rd_i=1400032253&psc=1',
    },
    {
      title: 'Reality Is Not What It Seems',
      thumb: '/books/reality_is_not_what_it_seems_cover.jpg',
      alt: 'Reality Is Not What It Seems',
      link: 'https://www.amazon.com/Reality-Not-What-Seems-Journey/dp/0735213933',
    },
    {
      title: 'Geometry, Topology and Physics',
      thumb: '/books/geometry_topology_and_physics_cover.jpg',
      alt: 'Geometry, Topology and Physics',
      link: 'https://www.amazon.com/Geometry-Topology-Physics-Graduate-Student/dp/0750306068/ref=pd_lpo_d_sccl_1/147-4333305-7685738?pd_rd_w=rNm9V&content-id=amzn1.sym.4c8c52db-06f8-4e42-8e56-912796f2ea6c&pf_rd_p=4c8c52db-06f8-4e42-8e56-912796f2ea6c&pf_rd_r=NWTA24M6FM8NKFBCMC2M&pd_rd_wg=I5hM1&pd_rd_r=d0cf8f4a-5fe4-43e9-be68-8a5d0e892d2e&pd_rd_i=0750306068&psc=1',
    },
    {
      title: 'Spacetime and Geometry',
      thumb: '/books/spacetime_and_geometry_cover.jpg',
      alt: 'Spacetime and Geometry',
      link: 'https://www.google.com/books/edition/Spacetime_and_Geometry/1XSmDwAAQBAJ?hl=en&gbpv=1&dq=spacetime+and+geometry+book+amazon&printsec=frontcover',
    },
    {
      title: 'The Road to Reality',
      thumb: '/books/the_road_to_reality_cover.jpg',
      alt: 'The Road to Reality',
      link: 'https://www.amazon.com/Road-Reality-Complete-Guide-Universe/dp/0679776311',
    },
    {
      title: '44 derangements',
      thumb: '/books/44_derangements_cover.jpg',
      alt: '44 Derangements',
      link: 'https://www.amazon.com/derangements-shape-persistence-Thad-Roberts-ebook/dp/B09VV9MLCV',
    },
    {
      title: 'Gauge Fields, Knots and Gravity',
      thumb: '/books/gauge_fields_knots_and_gravity_cover.jpg',
      alt: 'Gauge fields, Knots and Gravity',
      link: 'https://www.amazon.com/GAUGE-FIELDS-KNOTS-GRAVITY-Everything/dp/9810220340',
    },
    {
      title: 'The Geometry of Physics',
      thumb: '/books/the_geometry_of_physics_cover.jpg',
      alt: 'The Geometry of Physics',
      link: 'https://www.amazon.com/Geometry-Physics-Theodore-Frankel-ebook/dp/B009ZRNNGW',
    },
    {
      title: 'Probability Theory',
      thumb: '/books/probability_theory_cover.jpg',
      alt: 'Probability Theory',
      link: 'https://www.amazon.com/Probability-Theory-Science-T-Jaynes/dp/0521592712',
    },
    {
      title: 'Geometric Algebra for Physicists',
      thumb: '/books/geometric_algebra_for_physicists_cover.jpg',
      alt: 'Geometric Algebra for Physicists',
      link: 'https://www.amazon.com/Geometric-Algebra-Physicists-Chris-Doran/dp/0521715954',
    },
    {
      title: 'The Metaphysics Within Physics',
      thumb: '/books/the_metaphysics_within_physics_cover.jpg',
      alt: 'The Metaphysics Within Physics',
      link: 'https://www.amazon.com/Metaphysics-Within-Physics-Tim-Maudlin/dp/0199575371',
    },
    {
      title: 'A Brief History of Time',
      thumb: '/books/a_brief_history_of_time_cover.jpg',
      alt: 'A Brief History of Time',
      link: 'https://www.amazon.com/Brief-History-Time-Black-Holes/dp/055305340X',
    },
    {
      title: 'The Elegant Universe',
      thumb: '/books/the_elegant_universe_cover.jpg',
      alt: 'The Elegant Universe',
      link: 'https://www.amazon.com/Elegant-Universe-Superstrings-Dimensions-Ultimate/dp/B002D1P31U',
    },
    {
      title: 'Warped Passages',
      thumb: '/books/warped_passages_cover.jpg',
      alt: 'Warped Passages',
      link: 'https://www.amazon.com/Warped-Passages-Unraveling-Mysteries-Dimensions/dp/0060531088',
    },
    {
      title: 'Passages',
      thumb: '/books/passages_cover.jpg',
      alt: 'Passages',
      link: 'https://www.amazon.com/Passages-Thad-Roberts-ebook/dp/B07TFDKTGC',
    },
  ];

  return (
    <LayoutWrapper>
      <div
  className="symbol-overlay"
  style={{
    left: 0,
    width: "100vw",
  }}
/>

      <div
  className="partition-content"
  style={{
    width: "min(1400px, calc(100vw - 220px))",
    maxWidth: "none",
  }}
>
        <div className="legend-title"> related books</div>

        <div className="books-gallery">
          {bookList.map((book, index) => {
            if (book.isEinstein) {
              const v = einsteinVariants[einsteinIndex];

              return (
                <div key={index} className="book-slot" style={{ height: '270px' }}>
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
                    <span style={{ color: 'white', fontSize: '0.9rem' }}>{v.label}</span>
                    <button onClick={() => setEinsteinIndex((einsteinIndex + 1) % 3)}>→</button>
                  </div>

                  <a href={v.link} target="_blank" rel="noopener noreferrer">
                    <img
                      src={v.thumb}
                      alt={v.alt}
                      style={{
                        height: '270px',
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

            return (
              <div key={index} className="book-slot">
                <a href={book.link} target="_blank" rel="noopener noreferrer">
                  <img
                    src={book.thumb}
                    alt={book.alt}
                    style={{
                      height: '270px',
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
          })}
        </div>

        <div style={{ height: '2rem' }} />
        <div style={{ height: '16rem' }} />
      </div>
    </LayoutWrapper>
  );
}

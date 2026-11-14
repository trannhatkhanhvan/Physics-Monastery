import Link from 'next/link';

const font = "'Times New Roman', Times, serif";

const pages = [
  ['/closed-forms', 'Closed-Forms', 'closed'],
  ['/graphs', 'Graphs', 'geometry']
];

export default function ExplorerHeader({ title, active, settingsId }) {
  return (
    <header style={{ fontFamily: font, marginBottom: 14 }}>
      <p style={{
        color: '#98b0cc', letterSpacing: 2,
        fontSize: 12, margin: '0 0 6px'
      }}>
        MATHEMATICAL RESEARCH
      </p>

      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16, flexWrap: 'wrap'
      }}>
        <h1 style={{
          fontSize: 'clamp(23px,2.3vw,30px)',
          margin: 0
        }}>
          {title}
        </h1>

        <div style={{
          display: 'flex', alignItems: 'center',
          gap: 9, marginLeft: 'auto'
        }}>
          <nav aria-label="Explorer navigation" style={{
            display: 'flex', gap: 8, flexWrap: 'wrap'
          }}>
            {pages.map(([href, label, key]) => {
              const selected = key === active;

              return (
                <Link
                  key={key}
                  href={href}
                  aria-current={selected ? 'page' : undefined}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    width: key === 'closed' ? 145 : 95,
                    height: 42,
                    flex: key === 'closed'
                      ? '0 0 145px'
                      : '0 0 95px',
                    justifyContent: 'center',
                    padding: '8px 12px',
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                    color: '#eff4fb',
                    background: selected
                      ? 'linear-gradient(155deg, rgba(205,225,246,0.25) 0%, rgba(91,115,145,0.13) 42%, rgba(12,19,30,0.92) 100%)'
                      : selected ? '#315779' : '#0d1420',
                    border: `1px solid ${
                      selected
                        ? '#a6c8ed'
                        : selected ? '#8bb6e5' : '#54677f'
                    }`,
                    boxShadow: selected
                      ? 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(120,155,190,0.12), 0 0 7px rgba(155,195,235,0.12)'
                      : 'none',
                    borderRadius: 7,
                    textDecoration: 'none',
                    fontFamily: font,
                    fontSize: 15,
                    fontWeight: selected ? 700 : 400
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div
            id={settingsId}
            style={{
              position: 'relative',
              zIndex: 300,
              flex: '0 0 42px',
              width: 42,
              height: 42
            }}
          />
        </div>
      </div>
    </header>
  );
}

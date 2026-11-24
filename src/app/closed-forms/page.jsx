import LayoutWrapper from '@/components/LayoutWrapper';
import ExplorerHeader from '@/components/ExplorerHeader';
import Explorer from './_components/Explorer';
import { listedConstants } from '@/lib/wolfram-private';
import { CLOSED_FORM_LIBRARY } from '@/lib/closed-form-library';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Closed-Forms',
  robots: { index: true, follow: true }
};

export default async function ClosedFormExplorerPage() {
  const rows = await listedConstants();
  const enabled = new Set(
    CLOSED_FORM_LIBRARY
      .filter(entry => entry.enabled)
      .map(entry => entry.token)
  );

  const constants = rows.filter(row =>
    enabled.has(row.token)
  );

  return (
    <LayoutWrapper>
      <main style={{
        color: '#eff4fb',
        fontFamily: "'Times New Roman', Times, serif",
        backgroundColor: '#0c111b',
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.73), rgba(0,0,0,0.73)), url('/physics_monastery_background.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        minHeight: '100dvh',
        boxSizing: 'border-box',
        padding: '12px clamp(12px, 2vw, 28px)'
      }}>
        <div style={{
          width: '100%',
          maxWidth: 'none',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}>
          <ExplorerHeader title="Closed-Forms" active="closed" settingsId="closed-form-header-settings" />

          <Explorer initialConstants={constants} />
        </div>
      </main>
    </LayoutWrapper>
  );
}

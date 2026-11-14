import LayoutWrapper from '@/components/LayoutWrapper';
import ExplorerHeader from '@/components/ExplorerHeader';
import FunctionGeometryExplorer from './_components/FunctionGeometryExplorer';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Graphs',
  robots: { index: true, follow: true }
};

export default function FunctionGeometryPage() {
  return (
    <LayoutWrapper>
      <main style={{
        color: '#eff4fb',
        fontFamily: "'Times New Roman', Times, serif",
        backgroundColor: '#0c111b',
        backgroundImage: "linear-gradient(rgba(0,0,0,0.73), rgba(0,0,0,0.73)), url('/physics_monastery_background.jpg')",
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundAttachment: 'fixed', minHeight: '100dvh',
        boxSizing: 'border-box', padding: '12px clamp(12px, 2vw, 28px)'
      }}>
        <ExplorerHeader title="Graphs" active="geometry" settingsId="function-geometry-header-settings" />
        <FunctionGeometryExplorer />
      </main>
    </LayoutWrapper>
  );
}

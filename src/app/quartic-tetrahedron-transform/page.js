'use client';
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import QuarticTetrahedronTransform
  from './QuarticTetrahedronTransform';

export default function QuarticTetrahedronTransformPage() {
  return (
    <Suspense fallback={null}>
      <QuarticTetrahedronTransform />
    </Suspense>
  );
}

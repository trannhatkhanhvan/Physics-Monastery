import { NextResponse } from 'next/server';
import { listedConstants } from '@/lib/wolfram-private';
import {
  CLOSED_FORM_LIBRARY,
  CLOSED_FORM_ADDITIONS
} from '@/lib/closed-form-library';
import {
  searchMultiplicative,
  countSearchMonomials,
  maxQuickFactors,
  maxQuickDepth,
  QUICK_MONOMIAL_LIMIT
} from '@/lib/closed-form-search';
import rootActions from '@/app/closed-forms/_components/root-actions.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function reply(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  });
}

async function constants() {
  const available = [
    ...await listedConstants(),
    ...CLOSED_FORM_ADDITIONS
  ];
  const byToken = new Map(
    available.map(row => [row.token, row])
  );

  return CLOSED_FORM_LIBRARY
    .filter(entry => entry.enabled)
    .map(entry => byToken.get(entry.token))
    .filter(Boolean);
}

export async function GET() {
  try {
    return reply({ constants: await constants() });
  } catch (error) {
    return reply({ error: error.message }, 500);
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return reply({ error: 'Invalid JSON' }, 400);
  }

  const {
    center,
    oneSigma,
    sigma = 5,
    complexity = 3,
    tokens = [],
    numbers = [],
    rootAction = '',
    mode = 'quick',
    fullSearchDepth = 6,
    startMonomial = 0,
    rootIndex = null,
    batchSize = 25000
  } = body || {};

  if (
    !Array.isArray(tokens) ||
    !Array.isArray(numbers) ||
    tokens.length >
      CLOSED_FORM_LIBRARY.filter(entry => entry.enabled).length ||
    numbers.length > 28 ||
    typeof rootAction !== 'string' ||
    !['quick', 'full-batch'].includes(mode) ||
    !Number.isInteger(fullSearchDepth) ||
    (!Number.isInteger(complexity) || complexity < 1 || complexity > 6) ||
    fullSearchDepth < 1 ||
    fullSearchDepth > 6 ||
    !Number.isSafeInteger(startMonomial) ||
    startMonomial < 0 ||
    (rootIndex !== null &&
      (!Number.isInteger(rootIndex) ||
        rootIndex < 0 ||
        rootIndex >= rootActions.length)) ||
    !Number.isInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > 100000
  ) {
    return reply({ error: 'Invalid selections' }, 400);
  }

  try {
    const available = await constants();
    const byToken = new Map(
      available.map(row => [row.token, Number(row.value)])
    );
    // Accept legacy F selections from saved searches.
    if (byToken.has('F*')) {
      byToken.set('F', byToken.get('F*'));
    }

    const factors = [];
    const selected = new Set();

    // Diagnose all rejected tokens before starting the search.
    const rejected = tokens.filter(token =>
      typeof token !== 'string' || !byToken.has(token)
    );

    if (rejected.length) {
      const listed = await listedConstants();
      const listedTokens = new Set(
        listed.map(row => row.token)
      );
      const libraryEntries = new Map(
        CLOSED_FORM_LIBRARY.map(entry => [entry.token, entry])
      );

      const details = rejected.map(token => {
        const entry = libraryEntries.get(token);

        const reason =
          typeof token !== 'string'
            ? 'not a string'
            : !entry
              ? 'missing from closed-form library'
              : !entry.enabled
                ? 'disabled in closed-form library'
                : !listedTokens.has(token)
                  ? 'missing from listedConstants'
                  : 'library source mismatch';

        return `${JSON.stringify(token)}: ${reason}`;
      });

      console.error(
        '[closed-form] Rejected tokens:',
        details
      );

      return reply({
        error: `Rejected library tokens: ${details.join('; ')}`,
        rejectedTokens: details
      }, 400);
    }

    for (const token of tokens) {
      if (selected.has(token)) continue;
      selected.add(token);
      factors.push({
        label: token === 'F*' ? 'F' : token,
        value: byToken.get(token)
      });
    }

    for (const number of numbers) {
      if (
        typeof number !== 'string' ||
        !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d{1,3})?$/i.test(number) ||
        !Number.isFinite(Number(number)) ||
        Number(number) === 0 ||
        Math.abs(Number(number)) > 288
      ) {
        return reply({ error: 'Invalid custom number' }, 400);
      }

      factors.push({
        label: '(' + number + ')',
        value: Number(number)
      });
    }

    // Slider sets reported adjusted complexity.
    // Quick search independently uses its deepest
    // fully enumerable original-complexity layer.
    const factorCount = factors.length;
    const fullBatch = mode === 'full-batch';

    // Quick search remains budget-limited.
    // Full search enumerates through the selected depth, up to 7.
    if (!fullBatch) {
      const minimumDepth = Math.max(4, complexity);

      const quickLimit = maxQuickFactors(minimumDepth);

      if (factorCount > quickLimit) {
        return reply({
          error:
            `Quick search permits ${quickLimit} factors at ` +
            `complexity ${complexity}. Selected: ${factorCount}.`
        }, 400);
      }
    }

    const searchDepth = fullBatch
      ? fullSearchDepth
      : Math.max(4, complexity);

    if (
      !fullBatch &&
      countSearchMonomials(factorCount, searchDepth) >
        QUICK_MONOMIAL_LIMIT
    ) {
      throw Error('Quick search budget calculation failed');
    }

    const allRoots = rootAction === 'ALL';
    const root = allRoots || !rootAction
      ? null
      : rootActions.find(item => item.id === rootAction);

    if (rootAction && !allRoots && !root) {
      return reply({ error: 'Unknown root action' }, 400);
    }

    // All-mode Full Run: process exactly ONE root per request.
    // The client owns a separate saved cursor for every root.
    // Single-root requests use the original path below.
    if (allRoots && fullBatch) {
      if (rootIndex === null) {
        return reply({
          error: 'Missing All-mode root index'
        }, 400);
      }

      const action = rootActions[rootIndex];
      const rootFactor = Number(
        action.kind === 'imaginary'
          ? -Number(action.imagValue)
          : action.value
      );

      if (!Number.isFinite(rootFactor) || rootFactor === 0) {
        return reply({ error: 'Invalid root factor' }, 400);
      }

      const startedAt = Date.now();

      const result = searchMultiplicative({
        center,
        oneSigma,
        sigma,
        complexity: searchDepth,
        reportComplexity: complexity,
        factors,
        rootFactor,
        rootLabel: action.label || '',
        imaginaryRoot: action.kind === 'imaginary',
        batchMode: true,
        startMonomial,
        maxMonomials: batchSize
      });

      return reply({
        ...result,
        candidates: result.candidates.map(
          candidate => ({
            ...candidate,
            rootActionId: action.id
          })
        ),
        rootIndex,
        rootCount: rootActions.length,
        processingMs: Date.now() - startedAt
      });
    }

    const targets = allRoots ? rootActions : [root];
    const perRootCandidates = [];
    let firstResult = null;
    let totalMatches = 0;
    let totalInspected = 0;
    let totalMonomials = 0;

    for (const action of targets) {
      const rootFactor = action
        ? Number(action.kind === 'imaginary'
          ? -Number(action.imagValue)
          : action.value)
        : 1;

      if (!Number.isFinite(rootFactor) || rootFactor === 0) {
        return reply({ error: 'Invalid root factor' }, 400);
      }

      const result = searchMultiplicative({
        center,
        oneSigma,
        sigma,
        complexity: searchDepth,
        reportComplexity: complexity,
        factors,
        rootFactor,
        rootLabel: action?.label || '',
        imaginaryRoot: action?.kind === 'imaginary',
        batchMode: fullBatch,
        startMonomial: fullBatch ? startMonomial : 0,
        maxMonomials: fullBatch
          ? (allRoots ? Math.min(batchSize, 1000) : batchSize)
          : QUICK_MONOMIAL_LIMIT
      });

      firstResult ||= result;
      totalMatches += result.totalMatches;
      totalInspected += result.inspected;
      totalMonomials += result.monomials;

      if (allRoots && result.candidates.length) {
        perRootCandidates.push({
          ...result.candidates[0],
          rootActionId: action.id
        });
      }
    }

    return reply(allRoots ? {
      ...firstResult,
      candidates: perRootCandidates,
      totalMatches,
      inspected: totalInspected,
      monomials: totalMonomials,
      coverage:
        `${firstResult.coverage}; all ${targets.length} root actions`,
      rootsChecked: targets.length
    } : firstResult);
  } catch (error) {
    return reply({ error: error.message }, 400);
  }
}

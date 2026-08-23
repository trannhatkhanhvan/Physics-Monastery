const ASSET_ROOT =
  "/geometry/figure-eight-complement";

export const CERTIFIED_M004_SOURCE_ASSETS =
  Object.freeze({
    topology:
      `${ASSET_ROOT}/m004-certified-animation-topology.json`,
  });


function assertCertified(
  condition,
  message
) {
  if (!condition) {
    throw new Error(
      `[certified-m004-source] ${message}`
    );
  }
}


async function fetchJson(
  url,
  signal
) {
  const response =
    await fetch(
      url,
      {
        signal,
        cache: "force-cache",
      }
    );

  if (!response.ok) {
    throw new Error(
      `[certified-m004-source] ${url} returned HTTP ${response.status}`
    );
  }

  return response.json();
}


function validateCertifiedM004SourceAssets({
  topology,
}) {
  /*
   * The current viewer needs only the certified canonical topology:
   *
   *   • the two canonical m004 cells;
   *   • the exact relabelling of those cells;
   *   • reverseEvents[0], whose two local cell records carry the four
   *     exact A/B face gluings used by the canonical atlas audit.
   *
   * No edge-split lift, cusp-link replay, 2953 scaffold, or
   * compactification asset belongs to the current presentation path.
   */
  assertCertified(
    topology?.certified === true,
    "topology asset is not certified"
  );

  assertCertified(
    topology?.schema ===
      "m004-certified-animation-topology-v1",
    "unexpected topology schema"
  );

  assertCertified(
    topology?.canonicalIsoSig ===
      "cPcbbbiht",
    "canonical isoSig mismatch"
  );

  assertCertified(
    topology
      ?.counts
      ?.canonicalTetrahedra ===
      2,
    "expected 2 canonical tetrahedra"
  );

  assertCertified(
    topology
      ?.finalCellNodes
      ?.length ===
      2,
    "final canonical cell list must contain 2 cells"
  );

  assertCertified(
    topology
      ?.canonicalMap
      ?.length ===
      2,
    "canonical relabelling map must contain 2 cells"
  );

  assertCertified(
    Array.isArray(
      topology?.reverseEvents
    ) &&
      topology.reverseEvents.length > 0,
    "canonical source transition is missing"
  );

  return Object.freeze({
    canonicalIsoSig:
      topology.canonicalIsoSig,

    canonicalCellCount:
      topology.finalCellNodes.length,

    canonicalSourceTransitionCount:
      1,
  });
}


export async function loadCertifiedM004SourceSupport({
  signal,
} = {}) {
  const topology =
    await fetchJson(
      CERTIFIED_M004_SOURCE_ASSETS
        .topology,
      signal
    );

  const summary =
    validateCertifiedM004SourceAssets({
      topology,
    });

  return Object.freeze({
    ready:
      true,

    schema:
      "m004-certified-browser-source-support-v2",

    assets:
      Object.freeze({
        topology,
      }),

    summary,
  });
}

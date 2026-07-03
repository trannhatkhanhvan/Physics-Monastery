export const SECTOR_BLOCKS = Object.freeze([
  { id: "global120", label: "120", name: "global factorial completion", N: 120, family: "global", familyIndex: 1 },
  { id: "T44", label: "44", name: "Planck time sector", N: 44, family: "time", familyIndex: 1 },
  { id: "L35", label: "35", name: "Planck length sector", N: 35, family: "length", familyIndex: 1 },
  { id: "Q18a", label: "18", name: "Planck charge sector 1", N: 18, family: "charge", familyIndex: 1 },
  { id: "Q18b", label: "18", name: "Planck charge sector 2", N: 18, family: "charge", familyIndex: 2 },
  { id: "Theta32a", label: "32", name: "Planck temperature sector 1", N: 32, family: "temperature", familyIndex: 1 },
  { id: "Theta32b", label: "32", name: "Planck temperature sector 2", N: 32, family: "temperature", familyIndex: 2 },
  { id: "Theta32c", label: "32", name: "Planck temperature sector 3", N: 32, family: "temperature", familyIndex: 3 },
  { id: "M8a", label: "8", name: "Planck mass/twist sector 1", N: 8, family: "mass/twist", familyIndex: 1 },
  { id: "M8b", label: "8", name: "Planck mass/twist sector 2", N: 8, family: "mass/twist", familyIndex: 2 },
  { id: "M8c", label: "8", name: "Planck mass/twist sector 3", N: 8, family: "mass/twist", familyIndex: 3 },
  { id: "M8d", label: "8", name: "Planck mass/twist sector 4", N: 8, family: "mass/twist", familyIndex: 4 },
].map((block) => Object.freeze({ ...block, metricWeight: block.N / 4 })));

export const SECTOR_METRIC_DIAGONAL = Object.freeze(
  SECTOR_BLOCKS.map((block) => block.metricWeight)
);

export function getSectorBlock(blockId) {
  const block = SECTOR_BLOCKS.find((entry) => entry.id === blockId);

  if (!block) {
    throw new Error(`Unknown sector block: ${blockId}`);
  }

  return block;
}

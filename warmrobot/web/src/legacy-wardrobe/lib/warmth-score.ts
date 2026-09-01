/** Mirrors public.compute_warmth_score in 004_fix_schema.sql */
export function computeWarmthScore(input: {
  baseWarmth: number | null;
  thicknessMultiplier: number | null;
  coverageMultiplier: number | null;
  warmthBonus: number | null;
  weightGrams?: number | null;
}): number {
  const baseMaterial = input.baseWarmth ?? 20;
  const thicknessMul = input.thicknessMultiplier ?? 1;
  const coverageMul = input.coverageMultiplier ?? 1;
  const warmthBonus = input.warmthBonus ?? 0;

  let score = baseMaterial * thicknessMul * coverageMul + warmthBonus;

  const weight = input.weightGrams;
  if (weight != null && weight > 0) {
    score += ((weight - 500) / 100) * 2;
  }

  return Math.min(100, Math.max(0, Math.round(score * 100) / 100));
}

/** Small gap between inner arcs (pathLength units). */
export const ARC_GAP = 0.8

export type EnergyArcLengths = {
  usedPct: number
  dischargePct: number
  usedLen: number
  dischargeLen: number
  usedRotate: number
  dischargeRotate: number
  dischargeShare: number
  usedShareOfGen: number
}

/**
 * Percentages and arc geometry for the ring (pathLength = 100).
 */
export function computeEnergyArcs(
  generated: number,
  used: number,
  discharge: number,
): EnergyArcLengths {
  const gen = Number.isFinite(generated) && generated > 0 ? generated : 0
  if (gen <= 0) {
    return {
      usedPct: 0,
      dischargePct: 0,
      usedLen: 0,
      dischargeLen: 0,
      usedRotate: -90 + (ARC_GAP / 2) * 3.6,
      dischargeRotate: -90 + (ARC_GAP / 2) * 3.6,
      dischargeShare: 0,
      usedShareOfGen: 0,
    }
  }

  let usedPct = (Math.max(0, used) / gen) * 100
  let dischargePct = (Math.max(0, discharge) / gen) * 100
  if (!Number.isFinite(usedPct)) usedPct = 0
  if (!Number.isFinite(dischargePct)) dischargePct = 0

  const sum = usedPct + dischargePct
  if (sum > 100 && sum > 0) {
    const scale = 100 / sum
    usedPct *= scale
    dischargePct *= scale
  }

  usedPct = Math.min(100, Math.max(0, usedPct))
  dischargePct = Math.min(100, Math.max(0, dischargePct))

  const usedLen = Math.max(0, usedPct - (usedPct > 0 ? ARC_GAP : 0))
  const dischargeLen = Math.max(0, dischargePct - (dischargePct > 0 ? ARC_GAP : 0))

  const usedRotate = -90 + (usedPct > 0 ? (ARC_GAP / 2) * 3.6 : 0)
  const dischargeRotate = -90 + usedPct * 3.6 + (dischargePct > 0 ? (ARC_GAP / 2) * 3.6 : 0)

  return {
    usedPct,
    dischargePct,
    usedLen,
    dischargeLen,
    usedRotate,
    dischargeRotate,
    dischargeShare: dischargePct / 100,
    usedShareOfGen: usedPct / 100,
  }
}

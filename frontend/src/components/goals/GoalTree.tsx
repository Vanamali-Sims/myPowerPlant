/**
 * Growing tree for goal progress: carbon grows the tree, savings adds fruit.
 *
 * Built from parametric SVG parts driven by the step number, so every 5
 * percent of the carbon goal changes the picture: a taller, thicker trunk,
 * new branches, and one more foliage cluster in a fixed order. The text
 * beside it and the aria-label are the source of truth; the picture repeats them.
 */
import { AnimatePresence, LazyMotion, domAnimation, type Transition } from 'motion/react'
import * as m from 'motion/react-m'
import { TREE_MAX_STEP } from '../../constants/goals'
import { formatPercent } from '../../lib/goals/goalFormat'
import { fruitCount, stageForStep, treeStep } from '../../lib/goals/progress'
import { useReducedMotion } from '../../lib/useReducedMotion'

type Props = {
  carbonPercent: number
  savingsPercent: number
  /** Stage and legend text under the picture; the Goals page shows them elsewhere. */
  showCaption?: boolean
}

const CX = 120
const GROUND = 232

type Branch = { appear: number; at: number; side: 1 | -1; angle: number; length: number }
type Cluster = { appear: number; fx: number; fy: number; rf: number; tone: 'a' | 'b' | 'c' }

/** Branches, in the order they appear. `at` is the share of trunk height. */
const BRANCHES: Branch[] = [
  { appear: 6, at: 0.55, side: -1, angle: 35, length: 34 },
  { appear: 7, at: 0.62, side: 1, angle: 32, length: 36 },
  { appear: 8, at: 0.72, side: -1, angle: 42, length: 30 },
  { appear: 9, at: 0.78, side: 1, angle: 40, length: 32 },
  { appear: 11, at: 0.48, side: 1, angle: 22, length: 40 },
  { appear: 13, at: 0.45, side: -1, angle: 24, length: 40 },
  { appear: 15, at: 0.86, side: -1, angle: 55, length: 26 },
  { appear: 17, at: 0.88, side: 1, angle: 55, length: 26 },
]

/**
 * Foliage clusters, one new cluster for each step from 2 to 19 and two at 20.
 * fx is the offset across the canopy (-1 to 1), fy the height as a share of
 * the trunk, rf the size.
 */
const CLUSTERS: Cluster[] = [
  { appear: 2, fx: 0, fy: 1.08, rf: 0.8, tone: 'a' },
  { appear: 3, fx: -0.25, fy: 1.0, rf: 0.75, tone: 'b' },
  { appear: 4, fx: 0.25, fy: 1.0, rf: 0.75, tone: 'a' },
  { appear: 5, fx: 0, fy: 0.9, rf: 0.8, tone: 'c' },
  { appear: 6, fx: -0.5, fy: 0.82, rf: 0.8, tone: 'a' },
  { appear: 7, fx: 0.5, fy: 0.85, rf: 0.8, tone: 'b' },
  { appear: 8, fx: -0.35, fy: 1.05, rf: 0.85, tone: 'c' },
  { appear: 9, fx: 0.38, fy: 1.06, rf: 0.85, tone: 'a' },
  { appear: 10, fx: 0, fy: 1.18, rf: 0.9, tone: 'b' },
  { appear: 11, fx: 0.72, fy: 0.72, rf: 0.8, tone: 'c' },
  { appear: 12, fx: -0.72, fy: 0.7, rf: 0.8, tone: 'b' },
  { appear: 13, fx: -0.62, fy: 0.95, rf: 0.85, tone: 'a' },
  { appear: 14, fx: 0.64, fy: 0.97, rf: 0.85, tone: 'b' },
  { appear: 15, fx: -0.2, fy: 1.24, rf: 0.85, tone: 'a' },
  { appear: 16, fx: 0.22, fy: 1.25, rf: 0.85, tone: 'c' },
  { appear: 17, fx: -0.88, fy: 0.86, rf: 0.75, tone: 'c' },
  { appear: 18, fx: 0.9, fy: 0.86, rf: 0.75, tone: 'a' },
  { appear: 19, fx: 0, fy: 1.0, rf: 1.05, tone: 'b' },
  { appear: 20, fx: -0.42, fy: 1.32, rf: 0.8, tone: 'b' },
  { appear: 20, fx: 0.44, fy: 1.32, rf: 0.8, tone: 'a' },
]

/** Trunk height in viewBox units for a step: none at the seed, 150 at full canopy. */
function trunkHeight(step: number): number {
  return step <= 0 ? 0 : 10 + ((step - 1) * 140) / (TREE_MAX_STEP - 1)
}

function trunkWidth(step: number): number {
  return step <= 0 ? 0 : 2 + ((step - 1) * 12) / (TREE_MAX_STEP - 1)
}

function trunkPath(step: number): string {
  const h = trunkHeight(step)
  const base = trunkWidth(step) / 2
  const top = base * 0.45
  return `M ${CX - base} ${GROUND} L ${CX - top} ${GROUND - h} L ${CX + top} ${GROUND - h} L ${CX + base} ${GROUND} Z`
}

function branchLine(branch: Branch, step: number) {
  const h = trunkHeight(step)
  const grown = Math.min(1, (step - branch.appear + 1) / 4)
  const length = branch.length * grown * (h / trunkHeight(TREE_MAX_STEP)) * 1.4
  const radians = (branch.angle * Math.PI) / 180
  const x1 = CX
  const y1 = GROUND - h * branch.at
  return {
    x1,
    y1,
    x2: x1 + branch.side * length * Math.cos(radians),
    y2: y1 - length * Math.sin(radians),
    strokeWidth: Math.max(1.5, trunkWidth(step) * 0.35),
  }
}

function clusterCircle(cluster: Cluster, step: number) {
  const h = trunkHeight(step)
  const spread = 14 + h * 0.42
  return {
    cx: CX + cluster.fx * spread,
    cy: GROUND - cluster.fy * h,
    r: cluster.rf * (7 + h * 0.15),
  }
}

/** Ground spots under the tree for fruit whose cluster has not grown yet. */
function groundSpot(index: number) {
  const side = index % 2 === 0 ? -1 : 1
  const place = Math.floor(index / 2)
  return { cx: CX + side * (14 + place * 8.5), cy: GROUND + 2 + (place % 2) * 3, r: 3.6 }
}

function fruitSpot(index: number, step: number) {
  const cluster = CLUSTERS[index]
  if (!cluster || step < cluster.appear) return groundSpot(index)
  const circle = clusterCircle(cluster, step)
  return { cx: circle.cx + circle.r * 0.35, cy: circle.cy + circle.r * 0.3, r: 4.2 }
}

/**
 * GoalTree
 * @param props.carbonPercent - Real carbon progress; drives the tree's 21 steps
 * @param props.savingsPercent - Real savings progress; drives the fruit
 * @returns A labelled picture plus the stage in words
 *
 * Grows from the previous step to the new one. With reduced motion the final
 * state shows at once.
 */
export function GoalTree({ carbonPercent, savingsPercent, showCaption = true }: Props) {
  const reduced = useReducedMotion()
  const step = treeStep(carbonPercent)
  const stage = stageForStep(step)
  // Only whole fruit: one orange for each full 5 percent of the savings goal.
  const fruit = fruitCount(savingsPercent)
  const transition: Transition = reduced
    ? { duration: 0 }
    : { type: 'spring', stiffness: 90, damping: 18, mass: 0.9 }
  const label = `Your tree is at the ${stage} stage, step ${step} of ${TREE_MAX_STEP}. Carbon goal ${formatPercent(
    carbonPercent,
  )} reached. Savings goal ${formatPercent(savingsPercent)} reached.`

  return (
    <figure className="goal-tree">
      <div className={`goal-tree__art${step === TREE_MAX_STEP ? ' is-full' : ''}`} role="img" aria-label={label}>
        <LazyMotion features={domAnimation} strict>
        <svg viewBox="0 0 240 250" aria-hidden="true" focusable="false">
          <ellipse className="goal-tree__ground" cx={CX} cy={GROUND + 4} rx={100} ry={11} />

          <AnimatePresence initial={false}>
            {step <= 1 ? (
              <m.ellipse
                key="seed"
                className="goal-tree__seed"
                cx={CX}
                cy={GROUND - 3}
                initial={{ rx: 0, ry: 0 }}
                animate={{ rx: 9, ry: 6 }}
                exit={{ rx: 0, ry: 0 }}
                transition={transition}
              />
            ) : null}
          </AnimatePresence>

          {step >= 1 ? (
            <m.path
              className="goal-tree__trunk"
              initial={false}
              animate={{ d: trunkPath(step) }}
              transition={transition}
            />
          ) : null}

          <AnimatePresence initial={false}>
            {BRANCHES.filter((branch) => step >= branch.appear).map((branch) => {
              const line = branchLine(branch, step)
              return (
                <m.line
                  key={`branch-${branch.appear}`}
                  className="goal-tree__branch"
                  initial={{ x2: line.x1, y2: line.y1 }}
                  animate={line}
                  exit={{ x2: line.x1, y2: line.y1 }}
                  transition={transition}
                />
              )
            })}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {step >= 1 && step <= 5
              ? [-1, 1].map((side) => {
                  const h = trunkHeight(step)
                  return (
                    <m.ellipse
                      key={`sprout-${side}`}
                      className="goal-tree__sprout"
                      initial={{ cx: CX + side * 6, cy: GROUND - h + 1, rx: 0, ry: 0 }}
                      animate={{ cx: CX + side * 6, cy: GROUND - h + 1, rx: 6, ry: 3 }}
                      exit={{ rx: 0, ry: 0 }}
                      transition={transition}
                      transform={`rotate(${side * -25} ${CX + side * 6} ${GROUND - h + 1})`}
                    />
                  )
                })
              : null}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {CLUSTERS.map((cluster, index) => {
              if (step < cluster.appear) return null
              const circle = clusterCircle(cluster, step)
              return (
                <m.circle
                  key={`cluster-${index}`}
                  className={`goal-tree__leaves goal-tree__leaves--${cluster.tone}`}
                  initial={{ cx: circle.cx, cy: circle.cy, r: 0 }}
                  animate={circle}
                  exit={{ r: 0 }}
                  transition={transition}
                />
              )
            })}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {Array.from({ length: fruit }, (_, index) => {
              const spot = fruitSpot(index, step)
              return (
                <m.circle
                  key={`fruit-${index}`}
                  className="goal-tree__fruit"
                  initial={{ cx: spot.cx, cy: spot.cy, r: 0 }}
                  animate={spot}
                  exit={{ r: 0 }}
                  transition={transition}
                />
              )
            })}
          </AnimatePresence>
        </svg>
        </LazyMotion>
      </div>
      {showCaption ? (
        <figcaption className="goal-tree__caption">
          <span className="goal-tree__stage">Stage: {stage}</span>
          <span>
            The tree grows every 5 percent of your carbon goal. Each fruit is 5 percent of your
            savings goal.
          </span>
        </figcaption>
      ) : null}
    </figure>
  )
}

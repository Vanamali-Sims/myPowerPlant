/**
 * A titled run of fields inside a wizard step.
 *
 * The household step asks fifteen questions in one unbroken column, which is
 * the point most people decide the form is long. Grouping them into three
 * named runs removes nothing and asks the same questions — it just gives the
 * column a shape, and lets someone see that "appliances" is a section they are
 * partway through rather than an endless list.
 */
import type { ReactNode } from 'react'

type Props = {
  title: string
  /** Short line saying why this run of questions is being asked. */
  hint?: string
  children: ReactNode
}

/**
 * FieldGroup
 * @param props.title - Group heading, rendered as a real h2
 * @returns JSX.Element
 */
export function FieldGroup({ title, hint, children }: Props) {
  return (
    <section className="ui-group">
      <div className="ui-group__head">
        <h2 className="ui-group__title">{title}</h2>
        {hint ? <p className="ui-group__hint">{hint}</p> : null}
      </div>
      <div className="ui-group__fields">{children}</div>
    </section>
  )
}

/**
 * Shown on the Goals tab when the profile cannot support a suggestion yet.
 */
import { Button } from '../ui/Button'
import { AlertIcon } from '../ui/icons'

type Props = {
  hasSavedProfile: boolean
  missing: string[]
  onOpenProfile: () => void
  onStartSetup: () => void
  /** Rain journey: show missing fields but no link to setup/profile. */
  hideNavigation?: boolean
}

/**
 * ProfileIncomplete
 * @param props.missing - Labels of the profile answers still needed
 * @returns An announced message listing what is missing, with a way to fix it
 *
 * No suggestion or default goal is shown here: goals are only suggested from
 * a complete profile.
 */
export function ProfileIncomplete({
  hasSavedProfile,
  missing,
  onOpenProfile,
  onStartSetup,
  hideNavigation = false,
}: Props) {
  return (
    <section className="goals-incomplete" role="alert" aria-labelledby="goals-incomplete-title">
      <AlertIcon width={20} height={20} />
      <div>
        <h2 id="goals-incomplete-title" className="goals-incomplete__title">
          {hasSavedProfile ? 'Your profile needs a few more details' : 'Set up your profile first'}
        </h2>
        <p className="goals-incomplete__body">
          Goals are suggested from your household profile, so we need{' '}
          {hasSavedProfile ? 'these details' : 'these sections'} before we can suggest any:
        </p>
        <ul className="goals-incomplete__list">
          {missing.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {hideNavigation ? null : hasSavedProfile ? (
          <Button variant="primary" onClick={onOpenProfile}>
            Go to Profile
          </Button>
        ) : (
          <Button variant="primary" onClick={onStartSetup}>
            Set up your profile
          </Button>
        )}
      </div>
    </section>
  )
}

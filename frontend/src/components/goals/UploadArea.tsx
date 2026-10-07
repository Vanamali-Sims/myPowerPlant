/**
 * Battery file upload section of the Goals page.
 */
import { LockIcon } from '../ui/icons'

type Props = {
  locked: boolean
}

/**
 * UploadArea
 * @param props.locked - True until both goals are saved
 * @returns The upload section, or a note explaining when it unlocks
 */
export function UploadArea({ locked }: Props) {
  return (
    <section className="dashboard-card goals-upload" aria-labelledby="goals-upload-title">
      <h2 id="goals-upload-title">Upload your battery file</h2>
      {locked ? (
        <p className="goals-upload__locked">
          <LockIcon width={16} height={16} />
          <span>Upload unlocks after both goals are saved.</span>
        </p>
      ) : (
        <p className="dashboard-card__lede">
          You can now add your monthly battery activity file. It is read on this device only.
        </p>
      )}
    </section>
  )
}

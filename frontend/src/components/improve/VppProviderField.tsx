/**
 * VPP brand question for the improve journey — asked on What if where export
 * payments are shown, not on the bill upload step.
 */
import { useId } from 'react'
import { VPP_NOT_LISTED, vppProviderOptions } from '../../lib/improveProfile'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import type { ProfileData } from '../../types/profile'
import { SearchSelect } from '../ui/SearchSelect'
import { TextField } from '../ui/TextField'

type Props = {
  profile: ProfileData
  bundle: MethodologyBundle | null
  error?: string
  onChange: (vppProvider: string) => void
}

export function VppProviderField({ profile, bundle, error, onChange }: Props) {
  const id = useId()
  const options = vppProviderOptions(bundle)

  if (options.length) {
    return (
      <SearchSelect
        label="Which VPP have you joined?"
        hint="Select your VPP from the list."
        placeholder="Search VPP providers"
        heading="VPP providers"
        options={options}
        extraOptions={[VPP_NOT_LISTED]}
        value={profile.vppProvider}
        onChange={onChange}
        error={error}
        info="The company that runs your virtual power plant. If yours is missing, choose Not listed."
      />
    )
  }

  return (
    <TextField
      id={`${id}-vpp`}
      label="Which VPP have you joined?"
      placeholder="e.g. Tesla Energy Plan"
      autoComplete="off"
      maxLength={60}
      value={profile.vppProvider}
      onChange={(event) => onChange(event.target.value)}
      error={error}
      info="The company that runs your virtual power plant. It may be different from your electricity retailer."
    />
  )
}

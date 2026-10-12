/**
 * Field-by-field checking as people move through a form.
 *
 * Each field someone changes is remembered. Whenever focus leaves a field,
 * the step is checked again and the messages for those fields are shown or
 * cleared. Fields nobody has filled in stay quiet until Continue or Save, so
 * tabbing past an empty question does not raise an error.
 */
import { useRef, type Dispatch, type SetStateAction } from 'react'
import type { FieldErrors } from './validateProfile'

type FieldKey = keyof FieldErrors

/**
 * mergeBlurErrors
 * @param current - Messages on screen now (some may be from Continue)
 * @param fresh - The step checked again
 * @param touched - Fields the person has changed
 * @returns Current messages, with each changed field's message updated or cleared
 */
export function mergeBlurErrors(
  current: FieldErrors,
  fresh: FieldErrors,
  touched: Iterable<FieldKey>,
): FieldErrors {
  const next: FieldErrors = { ...current }
  for (const field of touched) {
    const message = fresh[field]
    if (message) next[field] = message
    else delete next[field]
  }
  return next
}

/**
 * useBlurValidation
 * @param validate - Checks the current step with the latest answers
 * @param setErrors - The form's error state setter
 * @returns touch (call on change), reset (on step change), and onBlur (on the fields' container)
 */
export function useBlurValidation(
  validate: () => FieldErrors,
  setErrors: Dispatch<SetStateAction<FieldErrors>>,
) {
  const touched = useRef(new Set<FieldKey>())

  return {
    touch(...fields: FieldKey[]) {
      for (const field of fields) touched.current.add(field)
    },
    reset() {
      touched.current.clear()
    },
    onBlur() {
      if (touched.current.size === 0) return
      const fresh = validate()
      const fields = [...touched.current]
      setErrors((current) => mergeBlurErrors(current, fresh, fields))
    },
  }
}

/**
 * Id convention shared by Field and its controls for aria-describedby.
 */

/**
 * fieldMessageIds
 * @param inputId - The control's id
 * @returns Ids Field gives the error and hint paragraphs for that control
 */
export function fieldMessageIds(inputId: string) {
  return { error: `${inputId}-error`, hint: `${inputId}-hint` }
}

/**
 * Contact-form POST helper for /api/submit.
 *
 * Unused by the household wizard; kept so the starter submit route still has
 * a typed client.
 */
import { API_BASE_URL, API_PATHS } from './constants/api'

export type SubmissionPayload = {
  name: string
  email: string
  message: string
}

export type SubmissionResponse = SubmissionPayload & {
  id: number
  created_at: string
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

function errorMessage(status: number, body: unknown): string {
  if (
    typeof body === 'object' &&
    body !== null &&
    'detail' in body
  ) {
    const detail = (body as { detail: unknown }).detail
    if (typeof detail === 'string') {
      return detail
    }
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === 'object' && item !== null && 'msg' in item) {
            return String((item as { msg: unknown }).msg)
          }
          return String(item)
        })
        .join(' ')
    }
  }
  return `Request failed (${status})`
}

/**
 * submitForm
 * @param payload - Name, email, and message for the contact form
 * @returns Typed success payload, or a user-facing error string
 *
 * Posts JSON to the FastAPI submit route.
 * Missing VITE_API_BASE_URL is reported instead of calling localhost.
 */
export async function submitForm(
  payload: SubmissionPayload,
): Promise<ApiResult<SubmissionResponse>> {
  if (!API_BASE_URL) {
    return {
      ok: false,
      error: 'VITE_API_BASE_URL is not set. Copy frontend/.env.example to frontend/.env.',
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${API_PATHS.submit}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const body: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      return { ok: false, error: errorMessage(response.status, body) }
    }

    return { ok: true, data: body as SubmissionResponse }
  } catch {
    return {
      ok: false,
      error: 'Could not reach the API. Is the backend running?',
    }
  }
}

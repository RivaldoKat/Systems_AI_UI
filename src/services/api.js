const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'https://lms-au9k.onrender.com/api'
).replace(/\/$/, '')

export async function apiRequest(path, { method = 'GET', body, params, token } = {}) {
  const url = new URL(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const headers = new Headers({ Accept: 'application/json' })
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !isFormData) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    })
  } catch (cause) {
    const error = new Error(
      `Could not connect to the LMS API at ${API_BASE_URL}. Make sure the backend is running and the frontend API URL is correct.`,
    )
    error.cause = cause
    throw error
  }

  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null
        ? payload.message || payload.error || `Request failed (${response.status})`
        : payload || `Request failed (${response.status})`
    const error = new Error(message)
    error.status = response.status
    throw error
  }
  return payload
}

export async function downloadFile(path, { token } = {}) {
  const apiOrigin = new URL(API_BASE_URL).origin
  const url = new URL(path, `${apiOrigin}/`)
  if (url.origin !== apiOrigin) throw new Error('Invalid attachment URL.')

  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response
  try {
    response = await fetch(url, { headers })
  } catch (cause) {
    const error = new Error(
      `Could not connect to the LMS API at ${API_BASE_URL}. Make sure the backend is running and the frontend API URL is correct.`,
    )
    error.cause = cause
    throw error
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || ''
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text()
    const message =
      typeof payload === 'object' && payload !== null
        ? payload.message || payload.error || `Request failed (${response.status})`
        : payload || `Request failed (${response.status})`
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return response.blob()
}

export function pageable(page, size = 10, sort) {
  return { page: page - 1, size, ...(sort ? { sort } : {}) }
}

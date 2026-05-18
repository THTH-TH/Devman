const PRODUCTION_API_ORIGIN = 'https://devman-liart.vercel.app'

export function googleWorkspaceApiOrigin() {
  if (typeof window === 'undefined') return ''
  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') return PRODUCTION_API_ORIGIN
  return ''
}

export async function invokeGoogleWorkspace(action, payload = {}) {
  const response = await fetch(`${googleWorkspaceApiOrigin()}/api/google-workspace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : {}
  if (!response.ok) throw new Error(data?.error || 'Google Workspace request failed')
  if (data?.error) throw new Error(data.error)
  return data
}

export function googleWorkspaceCallbackOrigin() {
  return googleWorkspaceApiOrigin() || window.location.origin
}

import { createClient } from '@supabase/supabase-js'

const CONNECTION_ID = 'default'
const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/gmail.readonly',
]

const ARCHISPACE_DRIVE_ROOT_ID = '0ANrUzbkL3mQAUk9PVA'
const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder'
const DRIVE_FILE_FIELDS = [
  'id',
  'name',
  'mimeType',
  'webViewLink',
  'webContentLink',
  'iconLink',
  'thumbnailLink',
  'modifiedTime',
  'createdTime',
  'size',
  'parents',
  'shared',
  'owners(displayName,emailAddress)',
  'lastModifyingUser(displayName,emailAddress)',
].join(',')

const STAGE_FOLDERS = [
  'Feasibility',
  'Acquisition',
  'Funding & Legal',
  'Resource Consent',
  'Building Consent',
  'Engineering Plan Approvals',
  'Sales & Marketing',
  'Pricing',
  'Construction',
  'Settlement & Handover',
]

function supabaseAdmin() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
}

function json(res, status, body) {
  return res.status(status).json(body)
}

function setCors(req, res) {
  const origin = req.headers.origin || ''
  const allowed =
    !origin ||
    /^https:\/\/devman-liart\.vercel\.app$/.test(origin) ||
    /^https:\/\/[a-z0-9-]+-thth-ths-projects\.vercel\.app$/.test(origin) ||
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)

  if (allowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function escapeDriveQuery(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function normalizeDriveFile(file) {
  const isFolder = file.mimeType === DRIVE_FOLDER_MIME
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    type: isFolder ? 'folder' : 'file',
    url: file.webViewLink || '',
    webViewLink: file.webViewLink || '',
    webContentLink: file.webContentLink || '',
    iconLink: file.iconLink || '',
    thumbnailLink: file.thumbnailLink || '',
    modifiedTime: file.modifiedTime || '',
    createdTime: file.createdTime || '',
    size: file.size || '',
    parents: file.parents || [],
    shared: Boolean(file.shared),
    owner: file.owners?.[0]?.displayName || file.owners?.[0]?.emailAddress || '',
    modifiedBy: file.lastModifyingUser?.displayName || file.lastModifyingUser?.emailAddress || '',
    previewUrl: isFolder ? '' : drivePreviewUrl(file),
  }
}

function drivePreviewUrl(file) {
  if (!file?.id) return ''
  if (file.mimeType === 'application/vnd.google-apps.document') return `https://docs.google.com/document/d/${file.id}/preview`
  if (file.mimeType === 'application/vnd.google-apps.spreadsheet') return `https://docs.google.com/spreadsheets/d/${file.id}/preview`
  if (file.mimeType === 'application/vnd.google-apps.presentation') return `https://docs.google.com/presentation/d/${file.id}/preview`
  return `https://drive.google.com/file/d/${file.id}/preview`
}

async function getConnection(supabase) {
  const { data, error } = await supabase
    .from('google_workspace_connections')
    .select('*')
    .eq('id', CONNECTION_ID)
    .maybeSingle()
  if (error) throw error
  return data
}

async function refreshTokenIfNeeded(connection, supabase) {
  if (!connection) throw new Error('Google Workspace is not connected.')
  if (new Date(connection.token_expires_at).getTime() > Date.now() + 60_000) {
    return connection.access_token
  }
  if (!connection.refresh_token) throw new Error('Google refresh token missing. Reconnect Google Workspace.')

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error_description || data.error || 'Could not refresh Google token.')

  const expiresAt = new Date(Date.now() + Number(data.expires_in || 3600) * 1000).toISOString()
  await supabase
    .from('google_workspace_connections')
    .update({
      access_token: data.access_token,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', CONNECTION_ID)
  return data.access_token
}

async function createDriveFolder(accessToken, name, parentId) {
  const metadata = { name, mimeType: 'application/vnd.google-apps.folder' }
  if (parentId) metadata.parents = [parentId]

  const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || 'Could not create Drive folder.')
  return data
}

async function driveGetFile(accessToken, fileId) {
  const params = new URLSearchParams({
    fields: DRIVE_FILE_FIELDS,
    supportsAllDrives: 'true',
  })
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || 'Could not read Drive item.')
  return normalizeDriveFile(data)
}

async function driveListFolder(accessToken, folderId, pageToken) {
  const safeFolderId = escapeDriveQuery(folderId || ARCHISPACE_DRIVE_ROOT_ID)
  const params = new URLSearchParams({
    q: `'${safeFolderId}' in parents and trashed = false`,
    pageSize: '100',
    orderBy: 'folder,name',
    fields: `nextPageToken,files(${DRIVE_FILE_FIELDS})`,
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
    corpora: 'allDrives',
  })
  if (pageToken) params.set('pageToken', pageToken)

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || 'Could not list Drive folder.')

  let folder = { id: folderId || ARCHISPACE_DRIVE_ROOT_ID, name: 'Archispace Drive', type: 'folder' }
  try {
    folder = await driveGetFile(accessToken, folderId || ARCHISPACE_DRIVE_ROOT_ID)
  } catch {
    // Shared drive roots can be awkward to read directly; listing the children is what matters.
  }

  return {
    folder,
    files: (data.files || []).map(normalizeDriveFile),
    nextPageToken: data.nextPageToken || '',
  }
}

async function driveSearch(accessToken, query, pageToken) {
  const cleanQuery = escapeDriveQuery(String(query || '').trim())
  if (!cleanQuery) return { files: [], nextPageToken: '' }

  const params = new URLSearchParams({
    q: `trashed = false and (name contains '${cleanQuery}' or fullText contains '${cleanQuery}')`,
    pageSize: '50',
    fields: `nextPageToken,files(${DRIVE_FILE_FIELDS})`,
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
    corpora: 'allDrives',
  })
  if (pageToken) params.set('pageToken', pageToken)

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || 'Drive search failed.')
  return {
    files: (data.files || []).map(normalizeDriveFile),
    nextPageToken: data.nextPageToken || '',
  }
}

async function driveShare(accessToken, fileId, email, role) {
  if (!fileId) throw new Error('file_id is required.')
  if (!email) throw new Error('email is required.')
  const safeRole = ['reader', 'commenter', 'writer'].includes(role) ? role : 'reader'
  const params = new URLSearchParams({
    sendNotificationEmail: 'true',
    supportsAllDrives: 'true',
    fields: 'id,type,role,emailAddress,displayName',
  })
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?${params}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'user',
      role: safeRole,
      emailAddress: email,
    }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || 'Could not share Drive item.')
  return data
}

async function gmailSearch(accessToken, query, maxResults) {
  const params = new URLSearchParams({
    q: query || 'newer_than:30d',
    maxResults: String(Math.min(Math.max(Number(maxResults) || 10, 1), 20)),
  })
  const searchResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const searchData = await searchResponse.json()
  if (!searchResponse.ok) throw new Error(searchData.error?.message || 'Gmail search failed.')

  const messages = await Promise.all((searchData.messages || []).map(async message => {
    const detailParams = new URLSearchParams({ format: 'metadata', metadataHeaders: 'Subject' })
    detailParams.append('metadataHeaders', 'From')
    detailParams.append('metadataHeaders', 'Date')
    const detailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?${detailParams}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const detail = await detailResponse.json()
    if (!detailResponse.ok) return null
    const headers = new Map((detail.payload?.headers || []).map(header => [String(header.name).toLowerCase(), header.value]))
    return {
      id: detail.id,
      threadId: detail.threadId,
      subject: headers.get('subject') || '(No subject)',
      from: headers.get('from') || '',
      date: headers.get('date') || '',
      snippet: detail.snippet || '',
      url: `https://mail.google.com/mail/u/0/#all/${detail.id}`,
    }
  }))
  return messages.filter(Boolean)
}

export default async function handler(req, res) {
  setCors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  try {
    const { action, ...body } = req.body || {}
    const supabase = supabaseAdmin()

    if (action === 'auth_url') {
      const redirectUri = `${body.origin || 'https://devman-liart.vercel.app'}/api/google-callback`
      const state = Buffer.from(JSON.stringify({
        redirect_url: body.redirect_url || 'https://devman-liart.vercel.app/documents',
      })).toString('base64url')
      const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPES.join(' '),
        access_type: 'offline',
        prompt: 'consent',
        state,
      })
      return json(res, 200, { auth_url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` })
    }

    const connection = await getConnection(supabase)
    if (action === 'status') {
      const scopes = connection?.scopes || []
      return json(res, 200, {
        connected: Boolean(connection?.access_token || connection?.refresh_token),
        email: connection?.provider_account_email || '',
        scopes,
        hasDriveMirrorAccess: scopes.includes('https://www.googleapis.com/auth/drive') ||
          scopes.includes('https://www.googleapis.com/auth/drive.readonly') ||
          scopes.includes('https://www.googleapis.com/auth/drive.metadata.readonly'),
      })
    }

    const accessToken = await refreshTokenIfNeeded(connection, supabase)

    if (action === 'create_project_folders') {
      const { project_id } = body
      if (!project_id) return json(res, 400, { error: 'project_id is required' })
      const { data: project, error } = await supabase.from('projects').select('id,name,address').eq('id', project_id).single()
      if (error) throw error

      const rootFolder = await createDriveFolder(accessToken, `${project.name}${project.address ? ` - ${project.address}` : ''}`)
      const subfolders = []
      for (const folderName of STAGE_FOLDERS) {
        subfolders.push(await createDriveFolder(accessToken, folderName, rootFolder.id))
      }

      await supabase
        .from('projects')
        .update({
          drive_folder_url: rootFolder.webViewLink,
          drive_root_folder_id: rootFolder.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', project_id)

      return json(res, 200, {
        success: true,
        root_folder_id: rootFolder.id,
        root_folder_url: rootFolder.webViewLink,
        subfolders,
      })
    }

    if (action === 'gmail_search') {
      const messages = await gmailSearch(accessToken, body.query, body.max_results)
      return json(res, 200, { messages })
    }

    if (action === 'drive_list') {
      const data = await driveListFolder(accessToken, body.folder_id || ARCHISPACE_DRIVE_ROOT_ID, body.page_token)
      return json(res, 200, data)
    }

    if (action === 'drive_search') {
      const data = await driveSearch(accessToken, body.query, body.page_token)
      return json(res, 200, data)
    }

    if (action === 'drive_share') {
      const permission = await driveShare(accessToken, body.file_id, body.email, body.role)
      return json(res, 200, { success: true, permission })
    }

    if (action === 'drive_metadata') {
      if (!body.file_id) return json(res, 400, { error: 'file_id is required' })
      const file = await driveGetFile(accessToken, body.file_id)
      return json(res, 200, { file })
    }

    return json(res, 400, { error: 'Unknown action' })
  } catch (err) {
    console.error('google-workspace error:', err)
    return json(res, 500, { error: err.message || 'Internal server error' })
  }
}

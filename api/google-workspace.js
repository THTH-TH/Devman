import { createClient } from '@supabase/supabase-js'

const CONNECTION_ID = 'default'
const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/gmail.readonly',
]

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
      return json(res, 200, {
        connected: Boolean(connection?.access_token || connection?.refresh_token),
        email: connection?.provider_account_email || '',
        scopes: connection?.scopes || [],
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

    return json(res, 400, { error: 'Unknown action' })
  } catch (err) {
    console.error('google-workspace error:', err)
    return json(res, 500, { error: err.message || 'Internal server error' })
  }
}

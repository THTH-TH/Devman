import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = () => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const client = supabaseAdmin()
  if (!client) {
    return res.status(501).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' })
  }

  const { projectId, documentIds = [], documentSnapshot = [], title = '', expiresAt = null, createdBy = '' } = req.body || {}
  if (!projectId || !documentIds.length) {
    return res.status(400).json({ error: 'projectId and documentIds are required' })
  }

  const token = crypto.randomUUID().replaceAll('-', '')
  const row = {
    id: crypto.randomUUID(),
    token,
    project_id: projectId,
    document_ids: documentIds,
    document_snapshot: documentSnapshot,
    title,
    expires_at: expiresAt,
    created_by: createdBy,
  }

  const { data, error } = await client.from('document_shares').insert(row).select('*').single()
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ share: data })
}

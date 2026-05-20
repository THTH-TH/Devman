import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = () => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = req.query.token
  const client = supabaseAdmin()
  if (!client) {
    return res.status(501).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' })
  }

  const { data: share, error: shareError } = await client
    .from('document_shares')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (shareError) return res.status(500).json({ error: shareError.message })
  if (!share) return res.status(404).json({ error: 'Share link not found' })
  if (share.revoked_at) return res.status(410).json({ error: 'Share link has been revoked' })
  if (share.expires_at && new Date(share.expires_at) < new Date()) return res.status(410).json({ error: 'Share link has expired' })

  const documentIds = Array.isArray(share.document_ids) ? share.document_ids : []
  const { data: docs, error: docsError } = documentIds.length
    ? await client.from('documents').select('*').in('id', documentIds)
    : { data: [], error: null }
  if (docsError) return res.status(500).json({ error: docsError.message })

  const documents = await Promise.all((docs || []).map(async doc => {
    let signedUrl = ''
    if (doc.storage_path) {
      const { data } = await client.storage.from('documents').createSignedUrl(doc.storage_path, 60 * 60)
      signedUrl = data?.signedUrl || ''
    }
    return {
      id: doc.id,
      name: doc.name || doc.file_name || 'Document',
      url: signedUrl || doc.url || doc.drive_url || '',
      source: doc.source || '',
      category: doc.category || '',
      stageId: doc.stage_id || '',
      revision: doc.revision || '',
      drawingNumber: doc.drawing_number || '',
      discipline: doc.discipline || '',
      issuedFor: doc.issued_for || '',
      documentStatus: doc.document_status || '',
      notes: doc.notes || '',
    }
  }))

  await client
    .from('document_shares')
    .update({
      access_count: Number(share.access_count || 0) + 1,
      last_accessed_at: new Date().toISOString(),
    })
    .eq('id', share.id)

  return res.status(200).json({
    share: {
      id: share.id,
      title: share.title,
      expiresAt: share.expires_at,
      createdAt: share.created_at,
      createdBy: share.created_by,
    },
    documents,
  })
}

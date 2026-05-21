import crypto from 'node:crypto'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

const FIELD_ALIASES = {
  leadId: ['lead id', 'id', 'submission id', 'response id'],
  fullName: ['name', 'full name', 'lead name', 'contact name', 'buyer name'],
  firstName: ['first name', 'firstname', 'first'],
  lastName: ['last name', 'lastname', 'surname'],
  email: ['email', 'email address', 'e-mail'],
  phone: ['phone', 'phone number', 'mobile', 'mobile number', 'contact number'],
  source: ['source', 'lead source', 'enquiry source', 'channel'],
  projectInterest: ['project', 'project interest', 'development', 'property', 'listing'],
  buyerType: ['buyer type', 'type', 'buyer profile'],
  financeStatus: ['finance', 'finance status', 'pre approval', 'pre-approval'],
  budgetRange: ['budget', 'budget range', 'price range'],
  depositCapacity: ['deposit', 'deposit capacity'],
  preferredUnits: ['preferred unit', 'preferred units', 'unit', 'unit interest'],
  message: ['message', 'notes', 'enquiry', 'comments', 'question'],
  createdAt: ['created', 'created at', 'date', 'timestamp', 'submitted at', 'submission date'],
  nextAction: ['next action', 'follow up', 'follow-up'],
  nextActionDate: ['next action date', 'follow up date', 'follow-up date'],
  temperature: ['temperature', 'lead temperature', 'hot warm cold'],
}

const WORKFLOW_DEFAULTS = {
  buyerType: 'Unknown',
  financeStatus: 'Unknown',
  assignedTo: 'Unassigned',
  temperature: 'Warm',
  pipelineStage: 'New Inquiry',
}

function supabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Supabase service role is not configured')
  return createClient(url, serviceKey)
}

async function requireInternalUser(req, client) {
  const cronSecret = process.env.SALES_SYNC_CRON_SECRET
  if (cronSecret && req.headers['x-sales-sync-secret'] === cronSecret) return { id: 'sales-sync-cron', email: 'cron' }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) throw Object.assign(new Error('Not authenticated'), { status: 401 })
  const { data, error } = await client.auth.getUser(token)
  if (error || !data?.user) throw Object.assign(new Error('Not authenticated'), { status: 401 })
  return data.user
}

function parseSpreadsheetId(value = '') {
  if (/^[a-zA-Z0-9-_]{20,}$/.test(value)) return value
  const match = String(value).match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match?.[1] || ''
}

function escapeSheetName(name = '') {
  return `'${String(name).replaceAll("'", "''")}'`
}

function getServiceAccountCredentials() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
    return {
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    }
  }
  return {
    clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }
}

function sheetsClient() {
  const { clientEmail, privateKey } = getServiceAccountCredentials()
  if (!clientEmail || !privateKey) {
    throw Object.assign(new Error('Google service account is not configured'), { status: 501 })
  }
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES,
  })
  return {
    serviceAccountEmail: clientEmail,
    sheets: google.sheets({ version: 'v4', auth }),
  }
}

function normalise(value = '') {
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ')
}

function cleanPhone(value = '') {
  return String(value).replace(/[^\d+]/g, '')
}

function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function autoMap(headers) {
  const normalised = headers.map(header => normalise(header))
  const map = {}
  Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
    const index = normalised.findIndex(header => aliases.includes(header))
    if (index !== -1) map[field] = headers[index]
  })
  return map
}

function rowsToObjects(values, headerRow = 1) {
  const headerIndex = Math.max(0, Number(headerRow || 1) - 1)
  const headers = (values[headerIndex] || []).map((header, index) => String(header || `Column ${index + 1}`).trim())
  const rows = values.slice(headerIndex + 1).map((cells, index) => ({
    rowNumber: headerIndex + index + 2,
    values: Object.fromEntries(headers.map((header, columnIndex) => [header, cells[columnIndex] ?? ''])),
  }))
  return { headers, rows }
}

function getMapped(row, fieldMap, field) {
  const header = fieldMap?.[field]
  return header ? row[header] || '' : ''
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { firstName: parts[0] || '', lastName: '' }
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1) }
}

function asArray(value) {
  if (Array.isArray(value)) return value
  return String(value || '').split(/[,;\n]/).map(item => item.trim()).filter(Boolean)
}

function normaliseBuyerType(value) {
  const text = normalise(value)
  if (!text) return 'Unknown'
  if (text.includes('fhb') || text.includes('first')) return 'First-home buyer'
  if (text.includes('inv') || text.includes('invest')) return 'Investor'
  if (text.includes('ds') || text.includes('down')) return 'Downsizer'
  if (text.includes('agent')) return 'Agent'
  if (text.includes('family')) return 'Family buyer'
  if (text.includes('chp')) return 'CHP / organisation'
  return value
}

function normaliseTemperature(value, fallback = 'Warm') {
  const text = normalise(value)
  if (!text) return fallback
  if (text.includes('hot')) return 'Hot'
  if (text.includes('warm')) return 'Warm'
  if (text.includes('cold')) return 'Cold'
  if (text.includes('not')) return 'Not Now'
  return fallback
}

function parseDate(value) {
  if (!value) return ''
  const text = String(value).trim()
  const direct = new Date(text)
  if (!Number.isNaN(direct.getTime())) return direct.toISOString()
  const nz = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/)
  if (!nz) return ''
  const [, day, month, year] = nz
  const fullYear = Number(year) < 100 ? 2000 + Number(year) : Number(year)
  const parsed = new Date(Date.UTC(fullYear, Number(month) - 1, Number(day)))
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString()
}

function buildLeadFromRow({ raw, fieldMap, defaults, connection, rowNumber }) {
  const explicitFullName = getMapped(raw, fieldMap, 'fullName')
  const firstName = getMapped(raw, fieldMap, 'firstName')
  const lastName = getMapped(raw, fieldMap, 'lastName')
  const split = splitName(explicitFullName)
  const fullName = explicitFullName || [firstName, lastName].filter(Boolean).join(' ')
  const email = String(getMapped(raw, fieldMap, 'email')).trim()
  const phone = String(getMapped(raw, fieldMap, 'phone')).trim()
  const message = getMapped(raw, fieldMap, 'message')
  const projectInterest = getMapped(raw, fieldMap, 'projectInterest') || defaults.projectInterest || connection.project_hint || ''
  const source = getMapped(raw, fieldMap, 'source') || defaults.source || connection.source_hint || 'Other'
  const leadId = getMapped(raw, fieldMap, 'leadId')
  const createdAt = getMapped(raw, fieldMap, 'createdAt')
  const preferredUnits = asArray(getMapped(raw, fieldMap, 'preferredUnits'))
  const sourceRowKey = leadId
    ? `lead:${leadId}`
    : email
      ? `email:${normalise(email)}`
      : phone
        ? `phone:${cleanPhone(phone)}`
        : `fallback:${hash({ fullName, source, createdAt, message, rowNumber }).slice(0, 24)}`

  const inbound = {
    first_name: firstName || split.firstName,
    last_name: lastName || split.lastName,
    full_name: fullName || [firstName || split.firstName, lastName || split.lastName].filter(Boolean).join(' ') || email || phone || `Sheet row ${rowNumber}`,
    email,
    phone,
    source,
    project_interest: projectInterest,
    budget_range: getMapped(raw, fieldMap, 'budgetRange') || '',
    deposit_capacity: getMapped(raw, fieldMap, 'depositCapacity') || '',
    preferred_units: preferredUnits,
    next_action: getMapped(raw, fieldMap, 'nextAction') || '',
    next_action_date: getMapped(raw, fieldMap, 'nextActionDate') || '',
    buyer_type: normaliseBuyerType(getMapped(raw, fieldMap, 'buyerType') || defaults.buyerType || WORKFLOW_DEFAULTS.buyerType),
    finance_status: getMapped(raw, fieldMap, 'financeStatus') || defaults.financeStatus || WORKFLOW_DEFAULTS.financeStatus,
    temperature: normaliseTemperature(getMapped(raw, fieldMap, 'temperature'), defaults.temperature || WORKFLOW_DEFAULTS.temperature),
  }

  return {
    sourceRowKey,
    sourceRowHash: hash({ raw, inbound }),
    message,
    createdAt,
    inbound,
  }
}

async function readSheet({ spreadsheetId, sheetName, rangeA1, headerRow = 1 }) {
  const { serviceAccountEmail, sheets } = sheetsClient()
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'properties.title,sheets.properties.title',
  })
  const sheetTitles = meta.data.sheets?.map(sheet => sheet.properties?.title).filter(Boolean) || []
  const selectedSheet = sheetName || sheetTitles[0]
  if (!selectedSheet) throw new Error('No sheets were found in this spreadsheet')
  const range = rangeA1 || `${escapeSheetName(selectedSheet)}!A1:Z1000`
  const valuesResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: 'FORMATTED_VALUE',
  })
  const values = valuesResponse.data.values || []
  const parsed = rowsToObjects(values, headerRow)
  return {
    serviceAccountEmail,
    spreadsheetTitle: meta.data.properties?.title || '',
    sheetTitles,
    sheetName: selectedSheet,
    range,
    ...parsed,
  }
}

async function preview(body) {
  const spreadsheetId = parseSpreadsheetId(body.spreadsheetId || body.spreadsheetUrl)
  if (!spreadsheetId) throw Object.assign(new Error('Spreadsheet URL or ID is required'), { status: 400 })
  const data = await readSheet({
    spreadsheetId,
    sheetName: body.sheetName,
    rangeA1: body.rangeA1,
    headerRow: body.headerRow || 1,
  })
  return {
    ...data,
    spreadsheetId,
    suggestedFieldMap: autoMap(data.headers),
    rows: data.rows.slice(0, 12),
  }
}

async function createSyncRun(client, connectionId) {
  const row = {
    id: crypto.randomUUID(),
    connection_id: connectionId,
    status: 'running',
    started_at: new Date().toISOString(),
    errors: [],
  }
  await client.from('sales_sync_runs').insert(row)
  return row
}

async function finishSyncRun(client, id, updates) {
  await client.from('sales_sync_runs').update({
    ...updates,
    finished_at: new Date().toISOString(),
  }).eq('id', id)
}

async function syncConnection(client, connectionId) {
  const { data: connection, error: connectionError } = await client
    .from('sales_sheet_connections')
    .select('*')
    .eq('id', connectionId)
    .single()
  if (connectionError) throw connectionError

  const { data: mapping } = await client
    .from('sales_sheet_mappings')
    .select('*')
    .eq('connection_id', connectionId)
    .maybeSingle()

  const run = await createSyncRun(client, connectionId)
  const errors = []
  let rowsRead = 0
  let rowsCreated = 0
  let rowsUpdated = 0
  let rowsSkipped = 0

  try {
    const sheet = await readSheet({
      spreadsheetId: connection.spreadsheet_id,
      sheetName: connection.sheet_name,
      rangeA1: connection.range_a1,
      headerRow: mapping?.header_row || 1,
    })
    const fieldMap = Object.keys(mapping?.field_map || {}).length ? mapping.field_map : autoMap(sheet.headers)
    const defaults = mapping?.defaults || {}
    const { data: existingRows, error: existingError } = await client
      .from('sales_leads')
      .select('id,email,phone,notes,source_row_key,source_row_hash')
    if (existingError) throw existingError

    const byKey = new Map()
    const byEmail = new Map()
    const byPhone = new Map()
    existingRows.forEach(lead => {
      if (lead.source_row_key) byKey.set(lead.source_row_key, lead)
      if (lead.email) byEmail.set(normalise(lead.email), lead)
      if (lead.phone) byPhone.set(cleanPhone(lead.phone), lead)
    })

    for (const { rowNumber, values } of sheet.rows) {
      const parsed = buildLeadFromRow({ raw: values, fieldMap, defaults, connection, rowNumber })
      if (!parsed.inbound.email && !parsed.inbound.phone && !parsed.inbound.full_name) {
        rowsSkipped += 1
        continue
      }

      rowsRead += 1
      const existing = byKey.get(parsed.sourceRowKey)
        || (parsed.inbound.email ? byEmail.get(normalise(parsed.inbound.email)) : null)
        || (parsed.inbound.phone ? byPhone.get(cleanPhone(parsed.inbound.phone)) : null)

      const metadata = {
        sheet_connection_id: connectionId,
        source_row_number: rowNumber,
        source_row_key: parsed.sourceRowKey,
        source_row_hash: parsed.sourceRowHash,
        source_sheet_name: connection.sheet_name || sheet.sheetName,
        last_sheet_sync_at: new Date().toISOString(),
        sync_status: 'Synced',
        raw_sheet_row: values,
      }

      if (existing) {
        if (existing.source_row_hash === parsed.sourceRowHash) {
          rowsSkipped += 1
          continue
        }
        const updates = {
          first_name: parsed.inbound.first_name,
          last_name: parsed.inbound.last_name,
          full_name: parsed.inbound.full_name,
          email: parsed.inbound.email,
          phone: parsed.inbound.phone,
          source: parsed.inbound.source,
          project_interest: parsed.inbound.project_interest,
          budget_range: parsed.inbound.budget_range,
          deposit_capacity: parsed.inbound.deposit_capacity,
          ...metadata,
          updated_at: new Date().toISOString(),
        }
        const { error } = await client.from('sales_leads').update(updates).eq('id', existing.id)
        if (error) {
          errors.push({ rowNumber, error: error.message })
        } else {
          rowsUpdated += 1
          byKey.set(parsed.sourceRowKey, { ...existing, ...updates })
        }
        continue
      }

      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const insert = {
        id,
        ...parsed.inbound,
        notes: parsed.message || '',
        assigned_to: defaults.assignedTo || WORKFLOW_DEFAULTS.assignedTo,
        temperature: parsed.inbound.temperature,
        pipeline_stage: WORKFLOW_DEFAULTS.pipelineStage,
        has_finance_approval: false,
        needs_broker_intro: parsed.inbound.finance_status === 'Needs broker',
        documents_sent: {},
        tags: ['sheet-sync'],
        probability: 10,
        archived: false,
        ...metadata,
        created_at: parseDate(parsed.createdAt) || now,
        updated_at: now,
      }
      const { error } = await client.from('sales_leads').insert(insert)
      if (error) {
        errors.push({ rowNumber, error: error.message })
      } else {
        rowsCreated += 1
        byKey.set(parsed.sourceRowKey, insert)
        if (insert.email) byEmail.set(normalise(insert.email), insert)
        if (insert.phone) byPhone.set(cleanPhone(insert.phone), insert)
        await client.from('sales_activities').insert({
          id: crypto.randomUUID(),
          lead_id: id,
          type: 'Note',
          title: 'Synced from Google Sheets',
          description: `${connection.name || 'Lead sheet'} row ${rowNumber}`,
          created_by: 'Sheet Sync',
        })
      }
    }

    const status = errors.length ? 'Completed with errors' : 'Synced'
    const message = `${rowsCreated} created, ${rowsUpdated} updated, ${rowsSkipped} skipped`
    await client.from('sales_sheet_connections').update({
      last_synced_at: new Date().toISOString(),
      last_sync_status: status,
      last_sync_message: message,
      updated_at: new Date().toISOString(),
    }).eq('id', connectionId)
    await finishSyncRun(client, run.id, {
      status,
      rows_read: rowsRead,
      rows_created: rowsCreated,
      rows_updated: rowsUpdated,
      rows_skipped: rowsSkipped,
      errors,
    })
    return { connectionId, status, rowsRead, rowsCreated, rowsUpdated, rowsSkipped, errors }
  } catch (error) {
    await client.from('sales_sheet_connections').update({
      last_sync_status: 'Failed',
      last_sync_message: error.message,
      updated_at: new Date().toISOString(),
    }).eq('id', connectionId)
    await finishSyncRun(client, run.id, {
      status: 'Failed',
      rows_read: rowsRead,
      rows_created: rowsCreated,
      rows_updated: rowsUpdated,
      rows_skipped: rowsSkipped,
      errors: [{ error: error.message }],
    })
    throw error
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const client = supabaseAdmin()
    await requireInternalUser(req, client)
    const body = req.body || {}

    if (body.action === 'preview') {
      const result = await preview(body)
      return res.status(200).json(result)
    }

    if (body.action === 'syncConnection') {
      if (!body.connectionId) return res.status(400).json({ error: 'connectionId is required' })
      const result = await syncConnection(client, body.connectionId)
      return res.status(200).json(result)
    }

    if (body.action === 'syncAll') {
      const { data: connections, error } = await client.from('sales_sheet_connections').select('id').eq('active', true)
      if (error) throw error
      const results = []
      for (const connection of connections) {
        results.push(await syncConnection(client, connection.id))
      }
      return res.status(200).json({ results })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (error) {
    const status = error.status || 500
    return res.status(status).json({ error: error.message || 'Sales sheet sync failed' })
  }
}

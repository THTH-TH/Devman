import crypto from 'node:crypto'
import { google } from 'googleapis'
import Papa from 'papaparse'
import { createClient } from '@supabase/supabase-js'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

const FIELD_ALIASES = {
  leadId: ['lead id', 'lead_id', 'id', 'submission id', 'response id', 'entry id', 'form id'],
  fullName: ['name', 'full name', 'lead name', 'contact name', 'buyer name', 'customer name', 'client name', 'your name', 'enquirer name', 'enquiry name'],
  firstName: ['first name', 'firstname', 'first', 'given name'],
  lastName: ['last name', 'lastname', 'surname', 'family name'],
  email: ['email', 'email address', 'e-mail', 'e mail', 'your email', 'contact email'],
  phone: ['phone', 'phone number', 'mobile', 'mobile number', 'contact number', 'telephone', 'tel', 'cell', 'cellphone', 'best phone'],
  source: ['source', 'lead source', 'enquiry source', 'inquiry source', 'channel', 'platform', 'origin', 'record source', 'utm source', 'how did you hear', 'where did you hear'],
  projectInterest: ['project', 'project interest', 'development', 'property', 'listing', 'listing name', 'property interest', 'interested project', 'which project', 'project name'],
  buyerType: ['buyer type', 'type', 'buyer profile'],
  financeStatus: ['finance', 'finance status', 'pre approval', 'pre-approval'],
  budgetRange: ['budget', 'budget range', 'price range', 'max budget', 'purchase budget'],
  depositCapacity: ['deposit', 'deposit capacity'],
  preferredUnits: ['preferred unit', 'preferred units', 'unit', 'unit interest'],
  message: ['message', 'notes', 'enquiry', 'inquiry', 'comments', 'question', 'description', 'body', 'lead message', 'form message'],
  createdAt: ['created', 'created at', 'created date', 'date', 'date received', 'date recieved', 'received', 'received at', 'timestamp', 'submitted', 'submitted at', 'submitted on', 'submission date', 'enquiry date', 'inquiry date', 'enquiry received', 'time submitted', 'date time', 'datetime'],
  nextAction: ['next action', 'follow up', 'follow-up'],
  nextActionDate: ['next action date', 'follow up date', 'follow-up date'],
  temperature: ['temperature', 'lead temperature', 'hot warm cold'],
  emailSent: ['email sent', 'sent email', 'info sent', 'auto email sent', 'automatic email sent', 'brochure sent', 'pack sent', 'response sent', 'reply sent', 'information sent'],
}

const CORE_MAPPING_LABELS = {
  fullName: 'Name',
  projectInterest: 'Project',
  email: 'Email',
  phone: 'Phone',
  source: 'Lead source',
  createdAt: 'Enquiry date',
  emailSent: 'Email sent',
}

const SOURCE_WORDS = ['meta', 'facebook', 'instagram', 'website', 'web', 'trade me', 'trademe', 'email', 'phone', 'agent', 'referral', 'walk in', 'walk-in', 'hubspot', 'google']
const PROJECT_WORDS = ['beachwaters', 'drift', 'longstead', 'toorea', 'dickson']

const WORKFLOW_DEFAULTS = {
  buyerType: 'Unknown',
  financeStatus: 'Unknown',
  assignedTo: 'Unassigned',
  temperature: 'Warm',
  pipelineStage: 'New Enquiry',
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

function hasServiceAccountConfig() {
  const { clientEmail, privateKey } = getServiceAccountCredentials()
  return Boolean(clientEmail && privateKey)
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

function parseSheetGid(value = '') {
  const match = String(value).match(/[?&]gid=(\d+)/)
  return match?.[1] || '0'
}

function normalise(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[_\-:/\\()[\]{}?.,]+/g, ' ')
    .replace(/[^a-z0-9+@ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanPhone(value = '') {
  return String(value).replace(/[^\d+]/g, '')
}

function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function includesPhrase(text, phrase) {
  const cleanText = ` ${normalise(text)} `
  const cleanPhrase = ` ${normalise(phrase)} `
  return cleanText.includes(cleanPhrase)
}

function sampleValues(rows = [], header) {
  return rows
    .slice(0, 40)
    .map(row => String(row.values?.[header] || '').trim())
    .filter(Boolean)
}

function ratio(values, predicate) {
  if (!values.length) return 0
  return values.filter(predicate).length / values.length
}

function looksLikeEmail(value) {
  return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(String(value || '').trim())
}

function looksLikePhone(value) {
  const text = String(value || '').trim()
  const digits = text.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 16) return false
  if (looksLikeEmail(text)) return false
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(text)) return false
  return /(^\+?\d|0\d)/.test(text.replace(/\s+/g, ''))
}

function looksLikeName(value) {
  const text = String(value || '').trim()
  if (!text || looksLikeEmail(text) || looksLikePhone(text)) return false
  if (/\d/.test(text)) return false
  const parts = text.split(/\s+/).filter(Boolean)
  return parts.length >= 1 && parts.length <= 5 && /[a-zA-Z]/.test(text)
}

function looksLikeDate(value) {
  const text = String(value || '').trim()
  if (!text || looksLikePhone(text)) return false
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}(\s+\d{1,2}:\d{2})?/.test(text)) return true
  if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}/.test(text)) return true
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text) && /\d{1,2}/.test(text)) return true
  if (/\d{1,2}:\d{2}/.test(text) && /\d{4}/.test(text)) return true
  return false
}

function looksLikeBooleanSent(value) {
  const text = normalise(value)
  return ['yes', 'y', 'true', 'sent', 'done', '1', 'no', 'n', 'false', 'not sent', 'unsent', '0'].includes(text) || looksLikeDate(value)
}

function containsKnownValue(value, knownValues) {
  const text = normalise(value)
  return knownValues.some(known => includesPhrase(text, known))
}

function headerScore(header, field) {
  const text = normalise(header)
  const aliases = FIELD_ALIASES[field] || []
  const normalisedAliases = aliases.map(alias => normalise(alias))
  let score = normalisedAliases.includes(text) ? 100 : 0
  if (!score && aliases.some(alias => includesPhrase(text, alias))) score = 72
  if (!score && aliases.some(alias => normalise(alias).split(' ').every(token => token && text.includes(token)))) score = 58

  if (field === 'fullName' && /\b(email|mail|phone|mobile|number|source|date|created|sent|message|comment|unit|project|budget|finance)\b/.test(text)) score -= 80
  if (field === 'phone' && /\b(email|mail|date|created|sent|source)\b/.test(text)) score -= 60
  if (field === 'email' && /\b(sent|date|source|phone|mobile)\b/.test(text)) score -= 60
  if (field === 'createdAt' && /\b(phone|mobile|email sent|sent email|source)\b/.test(text)) score -= 55
  if (field === 'source' && /\b(utm medium|campaign|name|email|phone)\b/.test(text)) score -= 25
  return score
}

function valueScore(values, field) {
  if (!values.length) return 0
  if (field === 'email') return ratio(values, looksLikeEmail) * 95
  if (field === 'phone') return ratio(values, looksLikePhone) * 90
  if (field === 'createdAt') return ratio(values, looksLikeDate) * 80
  if (field === 'fullName') return ratio(values, looksLikeName) * 45
  if (field === 'source') return ratio(values, value => containsKnownValue(value, SOURCE_WORDS)) * 75
  if (field === 'projectInterest') return ratio(values, value => containsKnownValue(value, PROJECT_WORDS)) * 80
  if (field === 'emailSent') return ratio(values, looksLikeBooleanSent) * 60
  if (field === 'message') return ratio(values, value => String(value || '').trim().length > 20) * 45
  return 0
}

function fieldScore(header, field, values) {
  return headerScore(header, field) + valueScore(values, field)
}

function autoMap(headers, rows = []) {
  const map = {}
  const usedHeaders = new Set()
  const fieldOrder = [
    'leadId',
    'email',
    'phone',
    'createdAt',
    'emailSent',
    'source',
    'projectInterest',
    'firstName',
    'lastName',
    'fullName',
    'buyerType',
    'financeStatus',
    'budgetRange',
    'depositCapacity',
    'preferredUnits',
    'message',
    'temperature',
    'nextAction',
    'nextActionDate',
  ]
  const thresholds = {
    leadId: 82,
    email: 55,
    phone: 50,
    createdAt: 52,
    fullName: 45,
    firstName: 65,
    lastName: 65,
    source: 50,
    projectInterest: 50,
    emailSent: 54,
  }

  fieldOrder.forEach(field => {
    let best = null
    headers.forEach(header => {
      if (!header || usedHeaders.has(header)) return
      const values = sampleValues(rows, header)
      const score = fieldScore(header, field, values)
      if (!best || score > best.score) best = { header, score }
    })
    const threshold = thresholds[field] ?? 58
    if (best && best.score >= threshold) {
      map[field] = best.header
      usedHeaders.add(best.header)
    }
  })

  if (!map.fullName && map.firstName && map.lastName) return map
  if (map.fullName) {
    delete map.firstName
    delete map.lastName
  }
  return map
}

function mappingDiagnostics(headers, rows, fieldMap) {
  return Object.entries(CORE_MAPPING_LABELS).map(([field, label]) => {
    const header = fieldMap[field] || ''
    const values = header ? sampleValues(rows, header) : []
    const confidence = header ? Math.min(100, Math.round(fieldScore(header, field, values))) : 0
    return {
      field,
      label,
      header,
      confidence,
      status: header ? 'detected' : 'missing',
    }
  })
}

function validatedStoredMap(storedMap = {}, headers = [], rows = []) {
  const headerSet = new Set(headers)
  const minimumScores = {
    fullName: 20,
    projectInterest: 20,
    email: 38,
    phone: 34,
    source: 20,
    createdAt: 34,
    emailSent: 24,
  }
  return Object.fromEntries(Object.entries(storedMap).filter(([field, header]) => {
    if (!headerSet.has(header)) return false
    if (!Object.prototype.hasOwnProperty.call(minimumScores, field)) return true
    return fieldScore(header, field, sampleValues(rows, header)) >= minimumScores[field]
  }))
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

function cleanName(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.includes('@')) return ''
  if (/^sheet row\b/i.test(text)) return ''
  return text
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

function normaliseProjectInterest(value, fallback = '') {
  const text = normalise(value)
  if (!text) return fallback
  const matched = []
  if (text.includes('beachwaters')) matched.push('Beachwaters')
  if (text.includes('drift') || text.includes('dickson')) matched.push('Drift')
  if (text.includes('longstead')) matched.push('Longstead')
  return matched.length ? [...new Set(matched)].join(' and ') : String(value || fallback).trim()
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

function parseBoolean(value) {
  const text = normalise(value)
  if (!text) return false
  if (['no', 'n', 'false', '0', 'not sent', 'unsent'].includes(text)) return false
  return true
}

function buildLeadFromRow({ raw, fieldMap, defaults, connection, rowNumber }) {
  const explicitFullName = cleanName(getMapped(raw, fieldMap, 'fullName'))
  const firstName = getMapped(raw, fieldMap, 'firstName')
  const lastName = getMapped(raw, fieldMap, 'lastName')
  const split = splitName(explicitFullName)
  const fullName = cleanName(explicitFullName || [firstName, lastName].filter(Boolean).join(' '))
  const email = String(getMapped(raw, fieldMap, 'email')).trim()
  const phone = String(getMapped(raw, fieldMap, 'phone')).trim()
  const message = getMapped(raw, fieldMap, 'message')
  const projectInterest = normaliseProjectInterest(getMapped(raw, fieldMap, 'projectInterest'), defaults.projectInterest || connection.project_hint || '')
  const source = getMapped(raw, fieldMap, 'source') || defaults.source || connection.source_hint || 'Other'
  const leadId = getMapped(raw, fieldMap, 'leadId')
  const createdAt = getMapped(raw, fieldMap, 'createdAt')
  const emailSentHeader = fieldMap?.emailSent
  const emailSent = emailSentHeader ? parseBoolean(getMapped(raw, fieldMap, 'emailSent')) : null
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
    full_name: cleanName(fullName || [firstName || split.firstName, lastName || split.lastName].filter(Boolean).join(' ')),
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
  const documentsSent = emailSentHeader
    ? { emailSent, brochure: emailSent, plans: emailSent, priceList: emailSent }
    : null

  return {
    sourceRowKey,
    sourceRowHash: hash({ raw, inbound, documentsSent }),
    message,
    createdAt,
    inbound,
    documentsSent,
  }
}

async function readPublicSheet({ spreadsheetId, spreadsheetUrl, headerRow = 1 }) {
  const gid = parseSheetGid(spreadsheetUrl)
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`
  const response = await fetch(url, { redirect: 'follow' })
  const text = await response.text()
  const looksLikeHtml = /<html|<!doctype/i.test(text.slice(0, 500))
  if (!response.ok || looksLikeHtml) {
    throw new Error('The Google Sheet is not viewable from its link')
  }
  const parsedCsv = Papa.parse(text, { skipEmptyLines: false })
  if (parsedCsv.errors?.length) {
    throw new Error(parsedCsv.errors[0].message || 'Could not parse the Google Sheet CSV export')
  }
  const values = parsedCsv.data.map(row => Array.isArray(row) ? row : [])
  return {
    serviceAccountEmail: '',
    spreadsheetTitle: 'Google Sheet',
    sheetTitles: [],
    sheetName: `gid ${gid}`,
    range: url,
    accessMode: 'public-link',
    ...rowsToObjects(values, headerRow),
  }
}

async function readSheet({ spreadsheetId, spreadsheetUrl, sheetName, rangeA1, headerRow = 1 }) {
  let serviceError = null
  if (!hasServiceAccountConfig()) {
    serviceError = new Error('Google service account is not configured')
  } else {
    try {
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
        accessMode: 'service-account',
        ...parsed,
      }
    } catch (error) {
      serviceError = error
    }
  }

  try {
    return await readPublicSheet({ spreadsheetId, spreadsheetUrl, headerRow })
  } catch (publicError) {
    const message = [
      'Google Sheet could not be read.',
      'Share it with the DevMan service account, or set the sheet to "Anyone with the link can view".',
      serviceError?.message,
      publicError.message,
    ].filter(Boolean).join(' ')
    throw Object.assign(new Error(message), { status: serviceError?.status || 400 })
  }
}

async function preview(body) {
  const spreadsheetId = parseSpreadsheetId(body.spreadsheetId || body.spreadsheetUrl)
  if (!spreadsheetId) throw Object.assign(new Error('Spreadsheet URL or ID is required'), { status: 400 })
  const data = await readSheet({
    spreadsheetId,
    spreadsheetUrl: body.spreadsheetUrl,
    sheetName: body.sheetName,
    rangeA1: body.rangeA1,
    headerRow: body.headerRow || 1,
  })
  const suggestedFieldMap = autoMap(data.headers, data.rows)
  return {
    ...data,
    spreadsheetId,
    suggestedFieldMap,
    mappingDiagnostics: mappingDiagnostics(data.headers, data.rows, suggestedFieldMap),
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
      spreadsheetUrl: connection.spreadsheet_url,
      sheetName: connection.sheet_name,
      rangeA1: connection.range_a1,
      headerRow: mapping?.header_row || 1,
    })
    const fieldMap = {
      ...autoMap(sheet.headers, sheet.rows),
      ...validatedStoredMap(mapping?.field_map || {}, sheet.headers, sheet.rows),
    }
    const defaults = mapping?.defaults || {}
    const { data: existingRows, error: existingError } = await client
      .from('sales_leads')
      .select('id,email,phone,notes,source_row_key,source_row_hash,created_at')
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
        const parsedCreatedAt = parseDate(parsed.createdAt)
        if (parsedCreatedAt) updates.created_at = parsedCreatedAt
        if (parsed.documentsSent) updates.documents_sent = parsed.documentsSent
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
        documents_sent: parsed.documentsSent || {},
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

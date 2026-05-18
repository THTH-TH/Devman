export const ARCHISPACE_DRIVE_ROOT = {
  id: '0ANrUzbkL3mQAUk9PVA',
  name: 'Archispace Drive',
  url: 'https://drive.google.com/drive/folders/0ANrUzbkL3mQAUk9PVA',
}

export const PROJECT_FILES_ROOT = {
  name: '01 - Projects',
  url: 'https://drive.google.com/drive/folders/15OnNW9kzbwPY-Pcb2zCDh1pPrT3Rde8Q',
}

export const PROJECT_TEMPLATE_FOLDER = {
  name: 'TEMPLATE --- {JOB NUMBER} - {ADDRESS} - {CLIENT}',
  url: 'https://drive.google.com/drive/folders/1snElzGYlJ39gxY-qV2DEf0idkPlW_u6j',
}

export const ARCHISPACE_PROJECT_FOLDERS = [
  {
    code: 'ASC10011',
    name: 'Kent Street',
    client: '',
    url: 'https://drive.google.com/drive/folders/1Z5eCBjApKpgadp0R0NJgsSzXkb81RTkv',
    keywords: ['Kent Street'],
  },
  {
    code: 'ASC1009',
    name: '61 Blake Blvd',
    client: 'ASC',
    url: 'https://drive.google.com/drive/folders/1NNrleUQz4yrd94vJR_ohxCjkcm8GWIjf',
    keywords: ['61 Blake', 'Blake Blvd'],
  },
  {
    code: 'ASC1002',
    name: '23 Dickson',
    client: 'ASC',
    url: 'https://drive.google.com/drive/folders/1G-i8oAhMViMYiuKZwsUd9MXQxxCiFG9r',
    keywords: ['23 Dickson', 'Dickson'],
  },
  {
    code: 'ASC10010',
    name: 'Levers Road',
    client: 'J Skelton',
    url: 'https://drive.google.com/drive/folders/1r5xSL0x1fDwReVYtO35HClzwxZECF4zt',
    keywords: ['Levers Road', 'Levers'],
  },
  {
    code: 'ASC1006-ASC1008',
    name: 'George Street Development',
    client: 'ASC',
    url: 'https://drive.google.com/drive/folders/19NX6AcnZdaKe5GRp3dasZYdjgcf1BrJ9',
    keywords: ['George Street'],
  },
  {
    code: 'ASC1003',
    name: '9 Beachwater Drive',
    client: 'ASC',
    url: 'https://drive.google.com/drive/folders/1qpqN_EJ9tVPlQNTqxyxeJRCo_M1M1kfI',
    keywords: ['Beachwater', 'Beachwaters', '9 Beachwater'],
  },
  {
    code: 'ASC0001',
    name: 'Henderson',
    client: 'AP',
    url: 'https://drive.google.com/drive/folders/1Br6A81wKxcvsY_pj4jF351KEX5T4EPeN',
    keywords: ['Henderson'],
  },
  {
    code: 'ASC1005',
    name: 'Longstead',
    client: 'ASC',
    url: 'https://drive.google.com/drive/folders/1DIWMk0xcGO88WOjYFXCnI-O3qOXWYcHU',
    keywords: ['Longstead'],
  },
]

export const ARCHISPACE_LIBRARY = [
  {
    name: '01 - Projects Files',
    url: 'https://drive.google.com/drive/folders/1LpCAn8Okg4Z07fbeDuZwv8YgU5C8zHoJ',
    children: [
      PROJECT_FILES_ROOT,
      { name: '02 - Prospective Projects', url: 'https://drive.google.com/drive/folders/1gi6rv9QcZItfaQhRTRBWVhZGUvfHzE9K' },
      { name: '03 - Templates', url: 'https://drive.google.com/drive/folders/1Z5gj1UUVBXlyjtLSXkFUuUzauHZYkxO2' },
      { name: '04 - Interiors', url: 'https://drive.google.com/drive/folders/1-hWLrIIC_zcv5qDH9CQazwNINSPmcpaa' },
      { name: '05 - Meetings', url: 'https://drive.google.com/drive/folders/1IPv9JqzYbkxWvzAhZ9ib5buEqQFPLSOy' },
      PROJECT_TEMPLATE_FOLDER,
    ],
  },
  {
    name: 'Checklists',
    url: 'https://drive.google.com/drive/folders/1K4ZDJ3CXzegwf0ph4Obeva8lUkasbaoM',
    children: [
      { name: 'Projects', url: 'https://drive.google.com/drive/folders/1IHFZzdvUY1SF8rzzr7iRnm421gFZIv4E' },
      { name: 'Archived', url: 'https://drive.google.com/drive/folders/1ql3hfXGUuRn3IA4d4dd7coDQ5EYUtFfB' },
      { name: 'Development Checklist - Template', url: 'https://docs.google.com/spreadsheets/d/1Sn-27yM05w1cqomP4Z34XN2VjltLtEM4Rr3BBy-euTY/edit' },
      { name: 'Sales & Marketing Checklist - Template', url: 'https://docs.google.com/spreadsheets/d/1BC31oXJNLeUFoMbNBrpCO7R-lAblrGCGZYaof9F5niE/edit' },
      { name: 'Financial/Funding/Legal Checklist - Template', url: 'https://docs.google.com/spreadsheets/d/1Hfn0jhgVucfYm3iVMWqq_gCfLV3EmF4yUSzrI6Bbt-8/edit' },
    ],
  },
  {
    name: 'Contracts',
    url: 'https://drive.google.com/drive/folders/14kc3XaG3w9JGpFBJ858mLkmZCLJ53cfD',
    children: [
      { name: 'Consultant Contracts', url: 'https://drive.google.com/drive/folders/12uhsnVRRA7GqWGRZW8uz2VNgdQLcAc91' },
      { name: 'Construction Contracts', url: 'https://drive.google.com/drive/folders/1FtvM0ds6QOxR_FqG7XRPZpJtTCOtpbGm' },
    ],
  },
  {
    name: 'Develop & Manage',
    url: 'https://drive.google.com/drive/folders/14DFrczq8pHQ5fwkiKPrwvjQmo5NOw5Na',
    children: [
      { name: 'Projects', url: 'https://drive.google.com/drive/folders/1Vu4qzx_5YVMXEn1tkFJti1LBFAm1uMyY' },
      { name: 'Templates', url: 'https://drive.google.com/drive/folders/106IwMV-zea6bHzRpHne3uhLTx05o3cHO' },
    ],
  },
  {
    name: 'Build Only',
    url: 'https://drive.google.com/drive/folders/1gVq-MYwm_jhhg3h8VuEuLPbf0JiXWHC5',
    children: [
      { name: 'Titus', url: 'https://drive.google.com/drive/folders/1zMlz-RgfbCzaDuLD7E6_dL0da8nqwyqv' },
    ],
  },
  {
    name: 'Pricing',
    url: 'https://drive.google.com/drive/folders/1lHv3X7077zRMImwEZy0RwZNqye7jz7se',
    children: [
      { name: 'Beachwaters', url: 'https://drive.google.com/drive/folders/19umvqCZrQpFTuKJG0xMTBanVmCp25ZSI' },
      { name: 'Dickson', url: 'https://drive.google.com/drive/folders/1i9lTNAxuJpMhXnfhfJUo21Trna48ZPoe' },
      { name: 'George Street', url: 'https://drive.google.com/drive/folders/1f0Mg-kKmRK6AhQvC7JJC9UOIDAjlPSVs' },
      { name: 'Longstead', url: 'https://drive.google.com/drive/folders/1XJJo2Tx_AgALvpcl3H6bIYtki_NJOGxA' },
      { name: 'Pricing Templates', url: 'https://drive.google.com/drive/folders/1YT1ojDD3ZfROZWbmG4eZKZ5zYX-b-T7A' },
    ],
  },
  {
    name: 'Sales',
    url: 'https://drive.google.com/drive/folders/1E4pdBCCARdA7DZZhoOPbqmK5TkveKXv4',
    children: [
      { name: 'Lead Sheets', url: 'https://drive.google.com/drive/folders/1ch2zGqDlkv3ffc1zcCVjI-3lbr_BGOdF' },
      { name: 'Process', url: 'https://drive.google.com/drive/folders/1vwTAuF_antSopwXOZgtWVPP186D_tIzW' },
      { name: 'Project', url: 'https://drive.google.com/drive/folders/1OcSvD2KJPeYjk6jYILDLwOBa1yB7UhvM' },
    ],
  },
  {
    name: 'Project Management',
    url: 'https://drive.google.com/drive/folders/1XxKWQRxFyw_sRUNlvqElawbQpg1w-v2t',
    children: [
      { name: 'PM - Projects', url: 'https://drive.google.com/drive/folders/1RXUBKmF0UR7tzAoEhQ4_PpW7SbHFdO60' },
      { name: 'Project Log Books', url: 'https://drive.google.com/drive/folders/1dDGHEJwY8FPjPLv1e8poJeEcuL2xwlG4' },
    ],
  },
  {
    name: 'Workflow',
    url: 'https://drive.google.com/drive/folders/13kQ7g_priRMGhiaIxNmpAGBjUngCkbvI',
    children: [
      { name: 'Development - Management - Process', url: 'https://docs.google.com/document/d/1pOfF9j1OGbVn7UGwnaADXaJIiwyyETUs/edit' },
      { name: 'Monthly Payments Workflow - Developments', url: 'https://docs.google.com/document/d/1grbxlDcGegJCU9lWE8-peL18eqqBjf_Rpx0E_iHa3uo/edit' },
      { name: 'Acquiring Finance - Workflow', url: 'https://docs.google.com/document/d/1fXfLX5RV9JZDsoDaINOZrD7YsMy1ISg-P4h6rRytmbU/edit' },
    ],
  },
  {
    name: 'Handover',
    url: 'https://drive.google.com/drive/folders/1yTyxPhKVGz8qyCz_mrMc-SK6KZCD3WFZ',
    children: [
      { name: 'Handover - Checklist', url: 'https://docs.google.com/document/d/1wDSgnAbal2W6o1LmNBTHFVtNCQv5PV9SPjGLNri3Bl8/edit' },
      { name: 'Archispace - TCHT Handover Checklist', url: 'https://docs.google.com/document/d/13FQSJgTAOsPfSg3ld_ykmWMoGonCCWTWr5nieCIiUDc/edit' },
    ],
  },
  { name: 'Health & Safety', url: 'https://drive.google.com/drive/folders/1Fz8lAb5CD8Koxtcw-3pFHwCXkJxNcDNZ', children: [] },
  { name: 'Meetings & Minutes', url: 'https://drive.google.com/drive/folders/1U8Uy0AcWuJO3AAE34aaB1SIiBGTMg07-', children: [] },
  { name: 'Site Photos', url: 'https://drive.google.com/drive/folders/1jm-lObSM4rLwl3N_dBT-ZcbTa-OMYIWi', children: [] },
  { name: 'Selections', url: 'https://drive.google.com/drive/folders/1-KRMpYcTILny2Ocm0xWZTwdfk-XU4beh', children: [] },
  { name: 'Insurances', url: 'https://drive.google.com/drive/folders/1aAYkoicxOrNZSPjfWivPpcSPw4wBzfVs', children: [] },
  { name: 'Prospects', url: 'https://drive.google.com/drive/folders/18f5yEoZwmu8BqhZenjRzqwbRXsHmbkLG', children: [] },
  { name: 'Relocatables', url: 'https://drive.google.com/drive/folders/1QRlCccBEWbIr0rhcJQxKbG1c6113fQ0V', children: [] },
  { name: 'Defects', url: 'https://drive.google.com/drive/folders/1OlhIhsgTlIiR3y6BGNH2VziPuWRWBig9', children: [] },
  { name: 'Creditors', url: 'https://drive.google.com/drive/folders/1lcULJRaboU7N0yp3KUA_W1WWbGNqj4MI', children: [] },
  { name: 'Logos', url: 'https://drive.google.com/drive/folders/1RU0gPimxyvU7bn8BBA5yzy0JsbcCxSr0', children: [] },
]

const normalize = value =>
  (value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()

export function findProjectDriveFolder(project) {
  const haystack = normalize(`${project?.name || ''} ${project?.address || ''}`)
  if (!haystack) return null

  return ARCHISPACE_PROJECT_FOLDERS.find(folder =>
    folder.keywords.some(keyword => haystack.includes(normalize(keyword)))
  ) || null
}

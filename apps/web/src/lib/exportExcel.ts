import ExcelJS from 'exceljs'
import { api } from './api'
import { COLUMN_MAP } from './criteriaMap'
import type { ShortlistRow, CriterionDef, CriteriaSettings, Filing } from './types'

// ── helpers ───────────────────────────────────────────────────────────────────

function colLetter(idx: number): string {
  let s = ''
  let n = idx + 1
  while (n > 0) {
    s = String.fromCharCode(64 + (n % 26 || 26)) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function getNotesText(userId: string, ticker: string): string {
  try {
    const raw = localStorage.getItem(`alphascreen_notes_${userId}_${ticker}`)
    if (!raw) return ''
    const notes = JSON.parse(raw) as { title: string; content: string }[]
    return notes.map((n, i) => `[${i + 1}] ${n.title || 'Untitled'}\n${n.content}`).join('\n\n')
  } catch {
    return ''
  }
}

function strategyLabel(row: ShortlistRow): string {
  const g = row.growth_passed
  const v = row.value_passed
  if (g && v) return 'Growth + Value'
  if (g)      return 'Growth'
  if (v)      return 'Value'
  return '—'
}

// ── main export ───────────────────────────────────────────────────────────────

export interface ExportParams {
  rows: ShortlistRow[]
  defs: CriterionDef[]
  settings: CriteriaSettings
  userId: string
  pageLabel: 'Shortlist' | 'Watchlist'
  filters: { market: string; strategy: string; sector: string }
  filename: string
}

export async function exportShortlistExcel(params: ExportParams): Promise<void> {
  const { rows, defs, settings, userId, filename } = params

  // Enabled criteria in canonical order — use all defs, not just dashboard cols
  const enabledIds = defs
    .map(d => d.id)
    .filter(id => settings.criteria[id]?.enabled === true)

  // Growth / value split for pass columns
  const enabledGrowthIds = enabledIds.filter(id => defs.find(d => d.id === id)?.preset === 'growth')
  const enabledValueIds  = enabledIds.filter(id => defs.find(d => d.id === id)?.preset === 'value')

  // Fetch filings concurrently
  const filingsMap: Record<string, Filing[]> = {}
  const detailResults = await Promise.allSettled(rows.map(r => api.companies.detail(r.ticker)))
  detailResults.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      filingsMap[rows[i].ticker] = (result.value.filings ?? []).slice(0, 3)
    }
  })

  // Split rows
  const qualifying = rows.filter(r => r.growth_passed || r.value_passed)
  const failing    = rows.filter(r => !r.growth_passed && !r.value_passed)

  // criterion id → Sheet 1 row number (starting at row 6)
  const criterionRowMap: Record<string, number> = {}
  enabledIds.forEach((id, i) => { criterionRowMap[id] = 6 + i })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'SLIST'
  wb.created = new Date()

  buildConfigSheet(wb, enabledIds, defs, settings, criterionRowMap,
    enabledGrowthIds.length, enabledValueIds.length)
  buildDataSheet(wb, 'Qualifying', 'FF22C55E', qualifying, enabledIds,
    enabledGrowthIds, enabledValueIds, defs, settings, criterionRowMap, filingsMap, userId)
  buildDataSheet(wb, 'Failing', 'FFEF4444', failing, enabledIds,
    enabledGrowthIds, enabledValueIds, defs, settings, criterionRowMap, filingsMap, userId)

  const buffer = await wb.xlsx.writeBuffer()
  const blob   = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ── Sheet 1: Screening Config ─────────────────────────────────────────────────

function buildConfigSheet(
  wb: ExcelJS.Workbook,
  enabledIds: string[],
  defs: CriterionDef[],
  settings: CriteriaSettings,
  criterionRowMap: Record<string, number>,
  growthCount: number,
  valueCount: number,
) {
  const ws = wb.addWorksheet('Screening Config', {
    properties: { tabColor: { argb: 'FF3B82F6' } },
  })

  ws.columns = [
    { key: 'criterion', width: 32 },
    { key: 'group',     width: 10 },
    { key: 'direction', width: 12 },
    { key: 'threshold', width: 16 },
    { key: 'unit',      width: 10 },
  ]

  ws.mergeCells('A1:E1')
  const titleCell = ws.getCell('A1')
  titleCell.value = 'SLIST — Screening Config'
  titleCell.font  = { bold: true, size: 13 }

  ws.addRow([])

  ws.mergeCells('A3:E3')
  const noteCell = ws.getCell('A3')
  noteCell.value = 'Edit threshold values in column D. Colors in Qualifying and Failing sheets update automatically.'
  noteCell.font  = { italic: true, color: { argb: 'FF666666' } }

  ws.addRow([])

  const headerRow = ws.addRow(['Criterion', 'Group', 'Direction', 'Threshold', 'Unit'])
  headerRow.font = { bold: true }
  headerRow.eachCell(cell => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } }
  })

  for (const id of enabledIds) {
    const def = defs.find(d => d.id === id)
    if (!def) continue
    const userThreshold = settings.criteria[id]?.threshold ?? def.default_threshold
    const rowNum = criterionRowMap[id]
    const cfg = COLUMN_MAP[id]

    let thresholdValue: string | number
    let unitLabel: string

    thresholdValue = Number(userThreshold ?? def.default_threshold ?? 0)
    unitLabel = cfg?.format === 'pct' ? '%' : cfg?.format === 'times' ? '×' : 'ratio'

    const row = ws.getRow(rowNum)
    row.getCell(1).value = def.label   // full name
    row.getCell(2).value = def.preset === 'growth' ? 'Growth' : 'Value'
    row.getCell(3).value = def.direction
    row.getCell(4).value = thresholdValue
    if (typeof thresholdValue === 'number') {
      row.getCell(4).numFmt = cfg?.format === 'pct' ? '0.00%' : '0.00'
    }
    row.getCell(5).value = unitLabel
    row.commit()
  }

  const summaryStart = (criterionRowMap[enabledIds[enabledIds.length - 1]] ?? 5) + 2
  ws.getRow(summaryStart).getCell(1).value =
    `Growth: qualify with ${settings.growth_pass_threshold} of ${growthCount} enabled criteria`
  ws.getRow(summaryStart).getCell(1).font = { italic: true, color: { argb: 'FF444444' } }
  ws.getRow(summaryStart + 1).getCell(1).value =
    `Value: qualify with ${settings.value_pass_threshold} of ${valueCount} enabled criteria`
  ws.getRow(summaryStart + 1).getCell(1).font = { italic: true, color: { argb: 'FF444444' } }
}

// ── Sheet 2 & 3 ───────────────────────────────────────────────────────────────

function buildDataSheet(
  wb: ExcelJS.Workbook,
  sheetName: string,
  tabArgb: string,
  rows: ShortlistRow[],
  _enabledIds: string[],
  enabledGrowthIds: string[],
  enabledValueIds: string[],
  defs: CriterionDef[],
  settings: CriteriaSettings,
  criterionRowMap: Record<string, number>,
  filingsMap: Record<string, Filing[]>,
  userId: string,
) {
  const ws = wb.addWorksheet(sheetName, {
    properties: { tabColor: { argb: tabArgb } },
  })

  const colDefs: Partial<ExcelJS.Column>[] = [
    { key: 'rank',         width: 5  },
    { key: 'ticker',       width: 10 },
    { key: 'name',         width: 28 },
    { key: 'market',       width: 8  },
    { key: 'sector',       width: 20 },
    { key: 'strategy',     width: 18 },
    { key: 'sep1',         width: 4  },  // G sep
    { key: 'growth_pass',  width: 14 },  // H Growth Pass
  ]

  enabledGrowthIds.forEach(id => colDefs.push({ key: id, width: 14 }))

  colDefs.push({ key: 'sep2',       width: 8  })  // major divider between growth / value
  colDefs.push({ key: 'value_pass', width: 14 })

  enabledValueIds.forEach(id => colDefs.push({ key: id, width: 14 }))

  colDefs.push({ key: 'sep3',  width: 5  })
  colDefs.push({ key: 'notes', width: 32 })
  colDefs.push({ key: 'sep4',  width: 4  })

  // 3 filings × 3 cols (Type, Filed, URL — Period removed per point 2)
  for (let i = 1; i <= 3; i++) {
    colDefs.push({ key: `rep${i}_type`,  width: 8  })
    colDefs.push({ key: `rep${i}_filed`, width: 12 })
    colDefs.push({ key: `rep${i}_url`,   width: 40 })
  }

  ws.columns = colDefs

  // Index of Growth Pass column (0-based = 7 → col H)
  const growthPassColIdx = 7
  // Index of first growth criterion
  const growthCriteriaStart = growthPassColIdx + 1
  // Index of Value Pass column
  const valuePassColIdx = growthCriteriaStart + enabledGrowthIds.length + 1  // +1 for sep2
  // Index of first value criterion
  const valueCriteriaStart = valuePassColIdx + 1

  // Header row
  const headerValues: (string | null)[] = [
    '#', 'Ticker', 'Company', 'Market', 'Sector', 'Strategy', null,
    'Growth Pass',
  ]
  enabledGrowthIds.forEach(id => {
    const def = defs.find(d => d.id === id)
    headerValues.push(def?.label ?? COLUMN_MAP[id]?.label ?? id)  // full name (point 6)
  })
  headerValues.push(null, 'Value Pass')
  enabledValueIds.forEach(id => {
    const def = defs.find(d => d.id === id)
    headerValues.push(def?.label ?? COLUMN_MAP[id]?.label ?? id)  // full name (point 6)
  })
  headerValues.push(null, 'Notes', null)
  for (let i = 1; i <= 3; i++) {
    headerValues.push(`Filing ${i} — Form`, `Filing ${i} — Date`, `Filing ${i} — Link`)
  }

  const headerRow = ws.addRow(headerValues)
  headerRow.font = { bold: true }
  headerRow.eachCell(cell => {
    if (cell.value) {
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } }
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } }
    }
  })

  const sepFill: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
  ;[7, valuePassColIdx - 1 + 1, valueCriteriaStart + enabledValueIds.length + 1].forEach(ci => {
    ws.getColumn(ci + 1).eachCell(cell => { cell.fill = sepFill })
  })

  // Data rows
  rows.forEach((row, idx) => {
    const filings = filingsMap[row.ticker] ?? []
    const notes   = getNotesText(userId, row.ticker)
    const rowNum  = idx + 2  // Excel row number (row 1 = header)

    const values: (string | number | null)[] = [
      idx + 1, row.ticker, row.name, row.market, row.sector ?? '',
      strategyLabel(row), null,
      null,  // Growth Pass — formula set below
    ]

    enabledGrowthIds.forEach(id => {
      const cfg = COLUMN_MAP[id]
      const val = cfg ? (row[cfg.field] as number | null) : null
      values.push(val ?? '')
    })

    values.push(null, null)  // sep2, Value Pass — formula set below

    enabledValueIds.forEach(id => {
      const cfg = COLUMN_MAP[id]
      const val = cfg ? (row[cfg.field] as number | null) : null
      values.push(val ?? '')
    })

    values.push(null, notes || '', null)

    for (let i = 0; i < 3; i++) {
      const f = filings[i]
      if (f) {
        values.push(f.type, f.filed_date, f.url ?? '')
      } else {
        values.push('', '', '')
      }
    }

    const dataRow = ws.addRow(values)

    // Static cell fills — green if passes threshold, red if fails
    const GREEN_ARGB = 'FFC6EFCE'
    const RED_ARGB   = 'FFFFC7CE'
    const allCriteriaColsRow = [
      ...enabledGrowthIds.map((id, i) => ({ id, colIdx: growthCriteriaStart + i })),
      ...enabledValueIds.map((id, i)  => ({ id, colIdx: valueCriteriaStart  + i })),
    ]
    allCriteriaColsRow.forEach(({ id, colIdx }) => {
      const def = defs.find(d => d.id === id)
      const cfg = COLUMN_MAP[id]
      if (!def || !cfg) return
      const cell   = dataRow.getCell(colIdx + 1)
      const rawVal = cell.value
      if (rawVal === '' || rawVal === null || rawVal === undefined) return
      const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal))
      if (isNaN(numVal)) return
      const threshold = settings.criteria[id]?.threshold ?? def.default_threshold
      if (threshold === null || threshold === undefined) return
      const passes = def.direction === '>' ? numVal > threshold : numVal < threshold
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: passes ? GREEN_ARGB : RED_ARGB } }
    })

    // Growth Pass — ISNUMBER() guards against empty-string cells (text > number = TRUE in Excel)
    if (enabledGrowthIds.length > 0) {
      const terms = enabledGrowthIds.map((id, i) => {
        const def = defs.find(d => d.id === id)
        const colStr = colLetter(growthCriteriaStart + i)
        const configR = criterionRowMap[id]
        return def?.direction === '>'
          ? `ISNUMBER(${colStr}${rowNum})*(${colStr}${rowNum}>'Screening Config'!$D$${configR})`
          : `ISNUMBER(${colStr}${rowNum})*(${colStr}${rowNum}<'Screening Config'!$D$${configR})`
      })
      dataRow.getCell(growthPassColIdx + 1).value = {
        formula: `(${terms.join('+')})&"/"&${enabledGrowthIds.length}`,
      }
    }

    // Value Pass — same ISNUMBER guard
    if (enabledValueIds.length > 0) {
      const terms = enabledValueIds.map((id, i) => {
        const def = defs.find(d => d.id === id)
        const colStr = colLetter(valueCriteriaStart + i)
        const configR = criterionRowMap[id]
        return def?.direction === '>'
          ? `ISNUMBER(${colStr}${rowNum})*(${colStr}${rowNum}>'Screening Config'!$D$${configR})`
          : `ISNUMBER(${colStr}${rowNum})*(${colStr}${rowNum}<'Screening Config'!$D$${configR})`
      })
      dataRow.getCell(valuePassColIdx + 1).value = {
        formula: `(${terms.join('+')})&"/"&${enabledValueIds.length}`,
      }
    }

    // numFmt for growth criteria columns
    enabledGrowthIds.forEach((id, i) => {
      const cellIdx = growthCriteriaStart + i + 1
      const cfg = COLUMN_MAP[id]
      dataRow.getCell(cellIdx).numFmt = cfg?.format === 'pct' ? '0.00%' : '0.00'
    })
    // numFmt for value criteria columns
    enabledValueIds.forEach((id, i) => {
      const cellIdx = valueCriteriaStart + i + 1
      const cfg = COLUMN_MAP[id]
      dataRow.getCell(cellIdx).numFmt = cfg?.format === 'pct' ? '0.00%' : '0.00'
    })
  })

  const lastDataRow = 1 + rows.length

  const allCriteriaCols: Array<{ id: string; colIdx: number }> = [
    ...enabledGrowthIds.map((id, i) => ({ id, colIdx: growthCriteriaStart + i })),
    ...enabledValueIds.map((id, i)  => ({ id, colIdx: valueCriteriaStart  + i })),
  ]

  // ── Conditional formatting — dynamic colors when user edits Sheet 1 thresholds ─
  // bgColor (not fgColor) is required for solid fills in Excel CF rules
  if (lastDataRow >= 2) {
    allCriteriaCols.forEach(({ id, colIdx }) => {
      const def = defs.find(d => d.id === id)
      if (!def) return
      const colStr    = colLetter(colIdx)
      const ref       = `${colStr}2:${colStr}${lastDataRow}`
      const configR   = criterionRowMap[id]
      const threshRef = `'Screening Config'!$D$${configR}`

      const [greenFormula, redFormula] = def.direction === '>'
        ? [
            `AND(ISNUMBER(${colStr}2),${colStr}2>${threshRef})`,
            `AND(ISNUMBER(${colStr}2),${colStr}2<=${threshRef})`,
          ]
        : [
            `AND(ISNUMBER(${colStr}2),${colStr}2<${threshRef})`,
            `AND(ISNUMBER(${colStr}2),${colStr}2>=${threshRef})`,
          ]

      ws.addConditionalFormatting({
        ref,
        rules: [
          {
            priority: 1,
            type: 'expression',
            formulae: [greenFormula],
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFC6EFCE' } } },
          },
          {
            priority: 2,
            type: 'expression',
            formulae: [redFormula],
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFC7CE' } } },
          },
        ],
      })
    })
  }

  // ── Summary row ──────────────────────────────────────────────────────────────
  if (rows.length === 0) return

  const summaryRowNum = lastDataRow + 1
  const summaryRow    = ws.getRow(summaryRowNum)
  summaryRow.getCell(3).value = 'Companies passing →'
  summaryRow.getCell(3).font  = { bold: true, italic: true }

  allCriteriaCols.forEach(({ id, colIdx }) => {
    const def = defs.find(d => d.id === id)
    if (!def) return
    const colStr   = colLetter(colIdx)
    const configR  = criterionRowMap[id]
    const dataRange = `${colStr}2:${colStr}${lastDataRow}`

    const formula = def.direction === '>'
      ? `COUNTIF(${dataRange},">"&'Screening Config'!$D$${configR})`
      : `COUNTIF(${dataRange},"<"&'Screening Config'!$D$${configR})`

    summaryRow.getCell(colIdx + 1).value = { formula }
  })
}

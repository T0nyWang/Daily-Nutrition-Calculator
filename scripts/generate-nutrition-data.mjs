import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import XLSX from 'xlsx'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const sourcePath = path.join(projectRoot, 'src', 'assets', '食品營養成分資料庫2025版.xlsx')
const outputDir = path.join(projectRoot, 'public', 'data')
const outputPath = path.join(outputDir, 'nutrition-database.json')

const CALORIE_COLUMNS = ['修正熱量(kcal)', '熱量(kcal)']

function toNumber(value) {
  if (value === undefined || value === null || value === '') {
    return 0
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function firstFiniteValue(row, columns) {
  for (const column of columns) {
    const rawValue = row[column]

    if (rawValue === undefined || rawValue === null || rawValue === '') {
      continue
    }

    const parsed = Number(rawValue)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

function buildSearchText(record) {
  return [record.name, record.alias, record.description, record.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

async function main() {
  const workbook = XLSX.readFile(sourcePath)
  const [firstSheetName] = workbook.SheetNames
  const sheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    range: 1,
  })

  const foods = rows
    .map((row) => {
      const id = String(row['整合編號'] ?? '').trim()
      const name = String(row['樣品名稱'] ?? '').trim()

      if (!id || !name) {
        return null
      }

      const record = {
        id,
        source: 'database',
        name,
        category: String(row['食品分類'] ?? '').trim() || undefined,
        description: String(row['內容物描述'] ?? '').trim() || undefined,
        alias: String(row['俗名'] ?? '').trim() || undefined,
        per100g: {
          calories: firstFiniteValue(row, CALORIE_COLUMNS),
          protein: toNumber(row['粗蛋白(g)']),
          carb: toNumber(row['總碳水化合物(g)']),
          fat: toNumber(row['粗脂肪(g)']),
        },
      }

      return {
        ...record,
        searchText: buildSearchText(record),
      }
    })
    .filter(Boolean)

  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(outputPath, JSON.stringify(foods, null, 2), 'utf8')

  console.log(`Generated ${foods.length} foods -> ${path.relative(projectRoot, outputPath)}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

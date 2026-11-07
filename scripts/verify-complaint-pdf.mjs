import assert from 'node:assert/strict'
import fs from 'node:fs'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { officialLayouts } from '../shared/officialLayout.mjs'
import { checklistQuestions, typeQuestions, evidenceQuestions, punishmentQuestion } from '../shared/formQuestions.mjs'

const loadingTask = getDocument({ data: new Uint8Array(fs.readFileSync('public/forms/police-simplified-complaint.pdf')), useSystemFonts: true })
const pdf = await loadingTask.promise
for (const [type, layout] of Object.entries(officialLayouts)) {
  let count = 0
  for (const [index, number] of layout.pages.entries()) {
    const page = await pdf.getPage(number), { width, height } = page.getViewport({ scale: 1 })
    const items = (await page.getTextContent()).items
    const boxes = items.filter((item) => item.str.includes('□'))
    const options = layout.choices.filter((item) => item.page === index && !layout.checklistRows[item.field])
    assert.equal(boxes.length, options.length, `${type} PDF ${number}쪽의 체크박스 누락`)
    for (const box of boxes) {
      const x = box.transform[4] / width * 100, y = (height - box.transform[5]) / height * 100
      assert.equal(options.filter((item) => Math.abs(item.x - (x + .15)) < .02 && Math.abs(item.y - (y - 1.18)) < .02).length, 1, `${number}쪽 ${x},${y} 체크박스 위치 오류`)
    }
    for (const item of [...layout.texts[index], ...options]) {
      assert.ok(item.x >= 0 && item.y >= 0 && item.x + item.w <= 100 && item.y + item.h <= 100, `${type}: 페이지 밖 필드 ${item.field}`)
    }
    count += boxes.length
  }
  assert.deepEqual(Object.keys(layout.checklistRows).sort(), checklistQuestions[type].map((item) => item.id).sort())
  for (const item of [...typeQuestions[type], evidenceQuestions[type], punishmentQuestion]) {
    for (const option of item.options) {
      if (option === '모름' && ['civilCase', 'assaultHospital', 'defamationPublicity'].includes(item.id) || option === '미정' || item.id === 'assaultType' && option === '기타') continue // These values are preserved in the full-text attachment.
      assert.ok(layout.choices.some((position) => position.field === item.id && position.option === option), `${type} 선택지 미연결: ${item.id} ${option}`)
    }
  }
  console.log(`${type}: 원본 체크박스 ${count}개, 체크리스트 ${checklistQuestions[type].length}개 및 페이지 경계 검증 통과`)
}
await loadingTask.destroy()

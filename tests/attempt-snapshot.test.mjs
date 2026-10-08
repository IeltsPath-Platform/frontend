import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { createServer } from 'vite'

let server
let parseAttemptStructure
let mapAttemptStructure

before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  ;({ parseAttemptStructure } = await server.ssrLoadModule('/src/features/learning-path/lib/attemptSnapshot.ts'))
  ;({ mapAttemptStructure } = await server.ssrLoadModule('/src/features/learning-path/api/learningAdapters.ts'))
})
after(async () => { await server?.close() })

/** Wire shape from Gateway: questionSnapshot is a JSON string with stem/optionKey, no number. */
const BE_STRUCTURE = {
  sections: [{
    id: 'sec-1',
    contentSectionId: 'csec-1',
    sortOrder: 1,
    snapshot: {
      title: 'Street trees',
      skill: 'READING',
      instructions: 'Answer the questions',
      passage: { title: 'Street trees', paragraphs: [{ label: null, text: 'Trees line the road.' }] },
    },
    items: [
      {
        id: 'item-1',
        questionVersionId: 'qv-1',
        sortOrder: 1,
        questionSnapshot: JSON.stringify({
          stem: 'What lines the road?',
          options: [
            { optionKey: 'A', content: 'Cars', sortOrder: 1 },
            { optionKey: 'B', content: 'Trees', sortOrder: 2 },
            { optionKey: 'C', content: 'Shops', sortOrder: 3 },
          ],
        }),
      },
      {
        id: 'item-2',
        questionVersionId: 'qv-2',
        sortOrder: 2,
        questionSnapshot: JSON.stringify({
          stem: 'Complete: Trees line the ______.',
          options: null,
        }),
      },
    ],
  }],
}

describe('assessment structure snapshots from Gateway', () => {
  test('mapAttemptStructure parses string snapshots and maps optionKey → value', () => {
    const mapped = mapAttemptStructure(BE_STRUCTURE)
    const q1 = JSON.parse(mapped.sections[0].items[0].questionSnapshot)
    assert.equal(q1.prompt, 'What lines the road?')
    assert.equal(q1.number, 1)
    assert.equal(q1.options[0].value, 'A')
    assert.equal(q1.options[0].label, 'Cars')
    const q2 = JSON.parse(mapped.sections[0].items[1].questionSnapshot)
    assert.equal(q2.prompt, 'Complete: Trees line the ______.')
    assert.equal(q2.number, 2)
    assert.equal(q2.options, null)
  })

  test('parseAttemptStructure renders all items (not 0/0)', () => {
    const mapped = mapAttemptStructure(BE_STRUCTURE)
    const sections = parseAttemptStructure(mapped)
    assert.equal(sections.length, 1)
    assert.equal(sections[0].snapshot?.title, 'Street trees')
    const questions = sections[0].items.map((item) => item.question)
    assert.equal(questions.filter(Boolean).length, 2)
    assert.equal(questions[0].number, 1)
    assert.equal(questions[0].options[1].value, 'B')
    assert.equal(questions[1].options, null)
  })
})

test('a plain-text passage from the assessment snapshot keeps its lettered paragraphs', () => {
  const [section] = parseAttemptStructure(mapAttemptStructure({
    sections: [{
      id: 'sec-p', contentSectionId: 'csec-p', sortOrder: 1,
      snapshot: { title: 'Reading: tools', skill: 'READING', passage: 'A. First paragraph.\n\nB. Second\nline.' },
      items: [],
    }],
  }))
  assert.deepEqual(section.snapshot.passage.paragraphs, [
    { label: 'A', text: 'First paragraph.' },
    { label: 'B', text: 'Second\nline.' },
  ])
})

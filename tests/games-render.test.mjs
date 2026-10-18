import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createServer } from 'vite'
let server
before(async () => { server = await createServer({ envDir: false, server: { middlewareMode: true }, appType: 'custom' }) })
after(async () => { await server?.close() })
test('Wordly renders the server dimensions, history colors and current draft without an answer', async () => {
  const { WordlyBoard } = await server.ssrLoadModule('/src/features/games/components/WordlyBoard.tsx')
  for (const n of [3, 4, 5, 6]) {
    const word = { columns: n, maxAttempts: n+1, attemptsUsed: 1, guesses: [{ attemptNumber: 1, guess: 'A'.repeat(n), letters: Array(n).fill('PRESENT') }] }
    const html = renderToString(createElement(WordlyBoard, { word, draft: 'B' }))
    assert.equal((html.match(/class="wordly-row"/g) ?? []).length,n+1)
    assert.equal((html.match(/class="wordly-cell /g) ?? []).length,n*(n+1))
    assert.equal((html.match(/sai vị trí/g) ?? []).length,n)
    assert.match(html,/aria-label="B"/)
  }
})
test('Editing settings keeps mode fixed and offers timer only for solo', async () => {
  const { GameSettingsForm } = await server.ssrLoadModule('/src/features/games/components/GameSettingsForm.tsx')
  for (const playerMode of ['SOLO','MULTIPLAYER']) {
    const html = renderToString(createElement(GameSettingsForm,{ value:{playerMode,initialLives:4,playMode:'FINITE',wordLimit:5,timeEnabled:true},onChange:()=>{},editing:true }))
    assert.match(html,/Số từ/)
    assert.doesNotMatch(html,/Số từ trong lượt chơi/)
    if(playerMode==='SOLO')assert.match(html,/Không giới hạn/)
    else {assert.doesNotMatch(html,/Không giới hạn/);assert.match(html,/180 giây/)}
  }
})
test('Multiplayer ranking preserves server ranks and forfeited players without revealing boards', async () => {
  const { GameRanking } = await server.ssrLoadModule('/src/features/games/components/GameRanking.tsx')
  const players = [
    { userId:'left',displayName:'Người đã rời',rank:1,status:'FORFEITED',totalScore:400,livesRemaining:0,wordsSolved:3,wordsProcessed:4,totalSolveTimeMs:12000 },
    { userId:'me',displayName:'Người còn mạng',rank:2,status:'ACTIVE',totalScore:100,livesRemaining:3,wordsSolved:1,wordsProcessed:1,totalSolveTimeMs:25000 },
  ]
  for (const isFinal of [false,true]) {
    const html = renderToString(createElement(GameRanking,{ranking:{players:[...players].reverse(),isFinal},ownUserId:'me'}))
    assert.match(html,/Đã rời trận/)
    assert.match(html,/Người còn mạng<!-- --> \(Bạn\)/)
    assert.ok(html.indexOf('Người đã rời') < html.indexOf('Người còn mạng'))
    assert.match(html,isFinal ? /Xếp hạng cuối trận/ : /Xếp hạng trực tiếp/)
    assert.match(html,/12\.0<!-- --> giây/)
    assert.doesNotMatch(html,/wordly-cell|playerWordId|sourceGuess/)
    if (isFinal) {
      assert.doesNotMatch(html, /<th scope="col">Mạng<\/th>|data-label="Mạng"/)
    } else {
      assert.match(html, /<th scope="col">Mạng<\/th>/)
    }
  }
})

const assert = require('node:assert/strict')
const test = require('node:test')
const deepmerge = require('deepmerge')

test('does not let a nested __proto__ key poison a merged result', () => {
  const source = JSON.parse('{"session":{"__proto__":{"isAdmin":true}}}')
  const result = deepmerge({ session: null }, source)

  assert.equal(Object.getPrototypeOf(result.session), Object.prototype)
  assert.equal(result.session.isAdmin, undefined)
  assert.equal(Object.hasOwn(result.session, '__proto__'), true)
  assert.equal(({}).isAdmin, undefined)
})

test('copies an own __proto__ key without changing the result prototype', () => {
  const target = JSON.parse('{"__proto__":{"isAdmin":true}}')
  const result = deepmerge(target, {})

  assert.equal(Object.getPrototypeOf(result), Object.prototype)
  assert.equal(Object.hasOwn(result, '__proto__'), true)
  assert.equal(result.isAdmin, undefined)
  assert.equal(({}).isAdmin, undefined)
})

test('preserves ordinary deep merge behavior', () => {
  const result = deepmerge(
    { settings: { theme: 'light' }, items: [1] },
    { settings: { language: 'pt' }, items: [2] }
  )

  assert.deepEqual(result, {
    settings: { theme: 'light', language: 'pt' },
    items: [1, 2]
  })
})

import { describe, expect, it } from 'vitest'
import adminCss from './admin.css?raw'

/** The z-index of a rule, and where in the file it is written. */
function rule(selector: string) {
  const at = adminCss.indexOf(`${selector} {`)
  if (at < 0) return null
  const body = adminCss.slice(at, adminCss.indexOf('}', at))
  const z = /z-index:\s*(\d+)/.exec(body)
  return { at, z: z ? Number(z[1]) : null }
}

/**
 * A layer that is both `stacked` and `top` carries both classes, and the rule written later wins. So each `top` rule
 * must be written after the `stacked` rule it overrides, with a higher z-index; the other way round the popup stays under
 * the drawer it was opened from (the knowledge point picker once did). jsdom does not apply stylesheets, so this reads
 * the stylesheet itself.
 */
describe('admin layers', () => {
  const pairs = [
    ['popup overlay', '.adm-layer__overlay--stacked', '.adm-layer__overlay--top'],
    ['popup', '.adm-modal--stacked', '.adm-modal--top'],
    ['drawer overlay', '.adm-layer__overlay--drawer-stacked', '.adm-layer__overlay--drawer-top'],
    ['drawer', '.adm-drawer--stacked', '.adm-drawer--top'],
  ] as const

  it.each(pairs)('writes the top rule of a %s after its stacked rule, and above it', (_name, stacked, top) => {
    const low = rule(stacked)
    const high = rule(top)
    expect(low, `${stacked} is missing`).not.toBeNull()
    expect(high, `${top} is missing`).not.toBeNull()
    expect(high!.at).toBeGreaterThan(low!.at)
    expect(high!.z).toBeGreaterThan(low!.z!)
  })

  it('keeps a question above every drawer and popup, and a popup above a stacked drawer', () => {
    const confirm = rule('.adm-confirm')!.z!
    expect(confirm).toBeGreaterThan(rule('.adm-drawer--top')!.z!)
    expect(rule('.adm-modal--top')!.z!).toBeGreaterThan(rule('.adm-drawer--stacked')!.z!)
    expect(rule('.adm-drawer--top')!.z!).toBeGreaterThan(rule('.adm-modal--top')!.z!)
  })
})

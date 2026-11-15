import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('loadGoogleIdentityScript', () => {
  beforeEach(() => {
    vi.resetModules()
    document.head.innerHTML = ''
    window.google = undefined
  })

  it('shares one load promise and retries after a rejected script load', async () => {
    const { loadGoogleIdentityScript } = await import('./googleIdentity')
    const failedLoad = loadGoogleIdentityScript()
    const failure = expect(failedLoad).rejects.toThrow('Không tải được Google Identity Services.')
    const sharedLoad = loadGoogleIdentityScript()
    expect(sharedLoad).toBe(failedLoad)
    const script = document.querySelector<HTMLScriptElement>('script[data-google-identity]')!
    await act(async () => { script.dispatchEvent(new Event('error')) })
    await failure

    const retry = loadGoogleIdentityScript()
    expect(document.querySelectorAll('script[data-google-identity]')).toHaveLength(1)
    window.google = { accounts: { id: {
      initialize: vi.fn(),
      renderButton: vi.fn(),
      cancel: vi.fn(),
    } } }
    await act(async () => { script.dispatchEvent(new Event('load')) })
    await expect(retry).resolves.toBeUndefined()
  })
})

import { act, render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GoogleCredentialResponse } from '../lib/googleIdentity'

const clientId = vi.hoisted(() => ({ value: '' }))
const loader = vi.hoisted(() => ({ promise: Promise.resolve() as Promise<void>, resolve: (() => undefined) as () => void }))
const nonces = vi.hoisted(() => ({ googleNonce: vi.fn() }))
vi.mock('@/lib/env', () => ({ get GOOGLE_CLIENT_ID() { return clientId.value } }))
vi.mock('../lib/googleIdentity', () => ({ loadGoogleIdentityScript: () => loader.promise }))
vi.mock('../api/authApi', () => ({ authApi: { googleNonce: nonces.googleNonce } }))

import { GoogleSignInButton } from './GoogleSignInButton'

describe('GoogleSignInButton', () => {
  let callback: ((response: GoogleCredentialResponse) => void) | undefined
  let initialize: ReturnType<typeof vi.fn>
  let renderButton: ReturnType<typeof vi.fn>
  let cancel: ReturnType<typeof vi.fn>

  beforeEach(() => {
    document.head.innerHTML = ''
    clientId.value = 'web-client-id'
    callback = undefined
    initialize = vi.fn((options: { callback: (response: GoogleCredentialResponse) => void }) => {
      callback = options.callback
    })
    renderButton = vi.fn()
    cancel = vi.fn()
    window.google = undefined
    loader.promise = Promise.resolve()
    loader.resolve = () => undefined
    nonces.googleNonce.mockReset()
    nonces.googleNonce.mockResolvedValue({ nonce: 'nonce-1', expiresInSeconds: 300 })
  })

  it('passes the server nonce to GIS and asks for a fresh one after each credential', async () => {
    nonces.googleNonce.mockResolvedValueOnce({ nonce: 'nonce-1', expiresInSeconds: 300 })
      .mockResolvedValueOnce({ nonce: 'nonce-2', expiresInSeconds: 300 })
    const onCredential = vi.fn()
    render(<GoogleSignInButton onCredential={onCredential} onError={vi.fn()} />)
    window.google = { accounts: { id: { initialize, renderButton, cancel } } } as unknown as NonNullable<Window['google']>

    await waitFor(() => expect(initialize).toHaveBeenLastCalledWith(expect.objectContaining({ nonce: 'nonce-1' })))
    act(() => callback?.({ credential: 'first-token' }))

    await waitFor(() => expect(initialize).toHaveBeenLastCalledWith(expect.objectContaining({ nonce: 'nonce-2' })))
    expect(onCredential).toHaveBeenCalledWith('first-token')
    expect(nonces.googleNonce).toHaveBeenCalledTimes(2)
  })

  it('still initializes GIS without a nonce when the server cannot issue one', async () => {
    nonces.googleNonce.mockRejectedValue(new Error('unavailable'))
    render(<GoogleSignInButton onCredential={vi.fn()} onError={vi.fn()} />)
    window.google = { accounts: { id: { initialize, renderButton, cancel } } } as unknown as NonNullable<Window['google']>

    await waitFor(() => expect(renderButton).toHaveBeenCalled())
    expect(initialize.mock.calls[0][0].nonce).toBeUndefined()
  })

  it('does not render or load GIS when no client ID is configured', () => {
    clientId.value = ''
    const { container } = render(<GoogleSignInButton onCredential={vi.fn()} onError={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
    expect(document.querySelector('script[data-google-identity]')).toBeNull()
  })

  it('initializes GIS and forwards the credential without logging it', async () => {
    const onCredential = vi.fn()
    const { container } = render(<GoogleSignInButton onCredential={onCredential} onError={vi.fn()} />)
    window.google = { accounts: { id: { initialize, renderButton, cancel } } } as unknown as NonNullable<Window['google']>
    await waitFor(() => expect(renderButton).toHaveBeenCalled())
    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: 'web-client-id' }))

    act(() => callback?.({ credential: 'opaque-id-token' }))
    expect(onCredential).toHaveBeenCalledWith('opaque-id-token')
    expect(container.textContent).not.toContain('opaque-id-token')
  })

  it('does not render GIS after unmount while the script is still loading', async () => {
    const onError = vi.fn()
    loader.promise = new Promise<void>((resolve) => { loader.resolve = resolve })
    window.google = { accounts: { id: { initialize, renderButton, cancel } } } as unknown as NonNullable<Window['google']>
    const view = render(<GoogleSignInButton onCredential={vi.fn()} onError={onError} />)
    view.unmount()
    await act(async () => { loader.resolve() })
    expect(initialize).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(cancel).toHaveBeenCalled()
  })

  it('covers the Google iframe while authentication is in progress', () => {
    const { container } = render(<GoogleSignInButton onCredential={vi.fn()} onError={vi.fn()} disabled />)
    expect(container.querySelector('.cursor-wait')).toBeInTheDocument()
  })
})

import { useCallback, useMemo, useState } from 'react'
import { useAuthSession } from '@/features/auth/authSession'
import { API_BASE_URL } from '@/lib/env'
import { getAccessToken } from '@/lib/httpClient'
import { createAccessClient } from '@/features/home/accessApi'
import type { AccessClient, ActivationResult } from '@/features/home/accessApi'

/** The learner's Points balance, which pays for an AI grade, with a way to add points by activating a key. */
export function useWritingWallet() {
  const { isLoggedIn } = useAuthSession()
  const [balance, setBalance] = useState<number | null>(null)
  const [error, setError] = useState('')
  const client = useMemo<AccessClient | undefined>(() => {
    const token = getAccessToken()
    return isLoggedIn && token ? createAccessClient({ baseUrl: API_BASE_URL, accessToken: token }) : undefined
  }, [isLoggedIn])

  /** Reads the balance now; null when it cannot be read (the grader checks it again when the essay is sent). */
  const check = useCallback(async (): Promise<number | null> => {
    if (!client) return null
    try {
      const wallet = await client.getWallet()
      setBalance(wallet.balance)
      setError('')
      return wallet.balance
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được số dư Points.')
      return null
    }
  }, [client])

  const onActivated = useCallback((result: ActivationResult) => {
    if (result.newBalance !== null) setBalance(result.newBalance)
    else void check()
  }, [check])

  return { client, isLoggedIn, balance, error, check, onActivated }
}

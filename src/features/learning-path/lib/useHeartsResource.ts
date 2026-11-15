import { useEffect } from 'react'
import { subscribeHeartsChanged } from '@/components/owl-events'
import { learningApi } from '../api'
import { useApiResource } from './useApiResource'

/** The learner's hearts, read again whenever they are refilled somewhere else, such as in the owl's popup. */
export function useHeartsResource() {
  const hearts = useApiResource('hearts', () => learningApi.getHearts())
  const { reload } = hearts
  useEffect(() => subscribeHeartsChanged(reload), [reload])
  return hearts
}

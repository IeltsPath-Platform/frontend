import { USE_MOCK_ROCKET } from '@/lib/env'
import { createHttpRocketApi } from './httpRocketApi'
import { createMockRocketApi, MOCK_WORD_BANK } from './mockRocketApi'

export const isMockRocket = USE_MOCK_ROCKET

export const rocketApi = USE_MOCK_ROCKET ? createMockRocketApi() : createHttpRocketApi()

/** Word counts offered on the solo setup screen. The mock bank holds ten words. */
export const ROCKET_WORD_COUNTS = [3, 5, 6, 8, 10].filter((count) => !USE_MOCK_ROCKET || count <= MOCK_WORD_BANK.length)

export const ROCKET_DEFAULT_WORD_COUNT = 6

import axios, { AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import { CURRENT_STUDENT } from "@/lib/mock/users"
import { TEST_BANK } from "@/lib/mock/exams"
import { RECENT_SUBMISSIONS } from "@/lib/mock/dashboard"

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true" || !import.meta.env.VITE_API_BASE_URL

function getMockPayload(url = "", method = "get"): unknown | undefined {
  const normalizedMethod = method.toLowerCase()

  if (normalizedMethod === "get" && (url.endsWith("/auth/me") || url.endsWith("/api/users/me"))) {
    return { user: CURRENT_STUDENT }
  }

  if (normalizedMethod === "post" && url.endsWith("/auth/refresh")) {
    return { refreshed: true }
  }

  if (normalizedMethod === "get" && url.includes("/exams")) {
    return { exams: TEST_BANK }
  }

  if (normalizedMethod === "get" && url.includes("/dashboard")) {
    return { submissions: RECENT_SUBMISSIONS }
  }
}

function createMockResponse(config: InternalAxiosRequestConfig): AxiosResponse {
  return {
    config,
    data: getMockPayload(config.url, config.method),
    headers: new AxiosHeaders(),
    request: undefined,
    status: 200,
    statusText: "OK",
  }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 12_000,
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  if (USE_MOCK) {
    config.adapter = async () => createMockResponse(config)
  }

  return config
})

let refreshPromise: Promise<unknown> | null = null

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error)
    }

    const requestConfig = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const mockPayload = getMockPayload(requestConfig.url, requestConfig.method)

    if (mockPayload !== undefined) {
      return createMockResponse(requestConfig)
    }

    const isRefreshRequest = requestConfig.url?.endsWith("/auth/refresh")
    if (error.response?.status !== 401 || requestConfig._retry || isRefreshRequest) {
      return Promise.reject(error)
    }

    requestConfig._retry = true
    refreshPromise ??= apiClient.post("/auth/refresh").finally(() => {
      refreshPromise = null
    })

    await refreshPromise
    return apiClient(requestConfig)
  },
)

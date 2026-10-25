import { URLS } from '@config/urls.config'
import type { APIRequestContext } from '@playwright/test'

export interface LoginResponse {
  accessToken: string
  user: {
    id: string
    email: string
  }
}

export class ApiHelper {
  constructor(private readonly request: APIRequestContext) {}

  /**
   * Login via API and get token
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request.post(URLS.API_ENDPOINTS.LOGIN, {
      data: { email, password },
    })

    if (!response.ok()) {
      throw new Error(`Login failed: ${response.status()} ${await response.text()}`)
    }

    return response.json()
  }

  /**
   * Register new user via API
   */
  async register(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request.post(URLS.API_ENDPOINTS.REGISTER, {
      data: { email, password },
    })

    if (!response.ok()) {
      throw new Error(`Registration failed: ${response.status()} ${await response.text()}`)
    }

    return response.json()
  }

  /**
   * Check API health
   */
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    const response = await this.request.get(URLS.API_ENDPOINTS.HEALTH)

    if (!response.ok()) {
      throw new Error(`Health check failed: ${response.status()}`)
    }

    return response.json()
  }
}

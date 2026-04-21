export interface IHttpClient {
  get(url: string, init?: RequestInit): Promise<Response>
}

export class FetchHttpClient implements IHttpClient {
  async get(url: string, init?: RequestInit): Promise<Response> {
    return fetch(url, { ...init, method: 'GET' })
  }
}

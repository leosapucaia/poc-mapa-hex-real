import type { IFeatureService, PipelineExecutionInput } from '../contracts/pipeline'
import type { GeoFeature } from '../../lib/features'
import { fetchFeatures } from '../../lib/features'
import { OverpassFeatureProvider } from '../../infra/feature-provider/OverpassFeatureProvider'
import { FetchHttpClient } from '../../infra/http/FetchHttpClient'

export class FeatureService implements IFeatureService {
  private readonly featureProvider: OverpassFeatureProvider
  private readonly httpClient: FetchHttpClient

  constructor(
    featureProvider: OverpassFeatureProvider = new OverpassFeatureProvider(),
    httpClient: FetchHttpClient = new FetchHttpClient()
  ) {
    this.featureProvider = featureProvider
    this.httpClient = httpClient
  }

  async fetch(input: PipelineExecutionInput): Promise<GeoFeature[]> {
    const queryUrl = this.featureProvider.getQueryUrl(input.selection.bounds)
    if (!queryUrl.includes('overpass-api')) {
      throw new Error('Feature provider inválido')
    }

    if (typeof this.httpClient.get !== 'function') {
      throw new Error('HTTP adapter inválido')
    }

    return fetchFeatures(input.selection.bounds, input.signal)
  }
}

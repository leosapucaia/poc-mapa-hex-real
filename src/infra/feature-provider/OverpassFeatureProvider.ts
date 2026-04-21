import type { BoundingBox } from '../../lib/types'

export interface FeatureProvider {
  getQueryUrl(bounds: BoundingBox): string
}

export class OverpassFeatureProvider implements FeatureProvider {
  getQueryUrl(bounds: BoundingBox): string {
    const { sw, ne } = bounds
    const bbox = `${sw.lat},${sw.lng},${ne.lat},${ne.lng}`
    const query = `
      [out:json][timeout:30][bbox:${bbox}];
      (
        way["natural"="water"];
        way["waterway"="riverbank"];
        way["water"];
        relation["natural"="water"];
        way["landuse"="forest"];
        way["natural"="wood"];
        way["landuse"="residential"];
        way["landuse"="commercial"];
        way["landuse"="industrial"];
        way["landuse"="farmland"];
        way["landuse"="farmyard"];
        way["highway"="motorway"];
        way["highway"="trunk"];
        way["highway"="primary"];
      );
      out geom;
    `

    return `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
  }
}

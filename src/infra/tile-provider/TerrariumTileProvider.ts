export interface TileProvider {
  getTileUrl(x: number, y: number, z: number): string
}

export class TerrariumTileProvider implements TileProvider {
  getTileUrl(x: number, y: number, z: number): string {
    return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`
  }
}

export interface BoundingBox {
  /** Southwest corner */
  sw: { lat: number; lng: number }
  /** Northeast corner */
  ne: { lat: number; lng: number }
}

export interface RegionSelection {
  bounds: BoundingBox
  center: { lat: number; lng: number }
  /** Approximate width/height in km */
  sizeKm: { width: number; height: number }
}

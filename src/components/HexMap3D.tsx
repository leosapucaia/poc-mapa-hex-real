import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { HexGrid } from '../lib/hex-grid'
import {
  terrainVertexShader,
  terrainFragmentShader,
  waterVertexShader,
  waterFragmentShader,
} from '../shaders/terrain'

interface HexMap3DProps {
  grid: HexGrid
  simplifyTolerance?: number
  max3DCells?: number
  logPerformance?: boolean
}

const MIN_HEIGHT = 0.15 // Minimum prism height (visual minimum)
const DEFAULT_SIMPLIFY_TOLERANCE = 0.08
const MAX_3D_CELLS_DEFAULT = 8000
const MAX_3D_CELLS_HARD_LIMIT = 20000

interface GeometryStats {
  cellCount: number
  vertices: number
  sourceBoundaryPoints: number
  simplifiedBoundaryPoints: number
}

function simplifyPoints(points: THREE.Vector2[], tolerance: number): THREE.Vector2[] {
  if (points.length <= 3 || tolerance <= 0) return points

  const sqTolerance = tolerance * tolerance

  const getSqSegmentDistance = (p: THREE.Vector2, p1: THREE.Vector2, p2: THREE.Vector2): number => {
    let x = p1.x
    let y = p1.y
    let dx = p2.x - x
    let dy = p2.y - y

    if (dx !== 0 || dy !== 0) {
      const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy)
      if (t > 1) {
        x = p2.x
        y = p2.y
      } else if (t > 0) {
        x += dx * t
        y += dy * t
      }
    }

    dx = p.x - x
    dy = p.y - y

    return dx * dx + dy * dy
  }

  const simplifyDPStep = (
    pts: THREE.Vector2[],
    first: number,
    last: number,
    sqTol: number,
    simplified: THREE.Vector2[]
  ) => {
    let maxSqDist = sqTol
    let index = -1

    for (let i = first + 1; i < last; i++) {
      const sqDist = getSqSegmentDistance(pts[i], pts[first], pts[last])
      if (sqDist > maxSqDist) {
        index = i
        maxSqDist = sqDist
      }
    }

    if (index !== -1) {
      if (index - first > 1) simplifyDPStep(pts, first, index, sqTol, simplified)
      simplified.push(pts[index])
      if (last - index > 1) simplifyDPStep(pts, index, last, sqTol, simplified)
    }
  }

  const simplified = [points[0]]
  simplifyDPStep(points, 0, points.length - 1, sqTolerance, simplified)
  simplified.push(points[points.length - 1])

  return simplified.length >= 3 ? simplified : points
}

function createHexPrismGeometry(
  boundary: { lat: number; lng: number }[],
  center: { lat: number; lng: number },
  elevation: number,
  minElev: number,
  maxElev: number,
  simplifyTolerance: number
): { geometry: THREE.BufferGeometry; sourcePointCount: number; simplifiedPointCount: number } {
  const height = Math.max(
    MIN_HEIGHT,
    ((elevation - minElev) / Math.max(maxElev - minElev, 1)) * 10 + MIN_HEIGHT
  )

  const scale = 100
  const points = boundary.map((b) => {
    const x = (b.lng - center.lng) * scale * Math.cos((center.lat * Math.PI) / 180)
    const y = (b.lat - center.lat) * scale
    return new THREE.Vector2(x, y)
  })

  const simplifiedPoints = simplifyPoints(points, simplifyTolerance)
  const shape = new THREE.Shape(simplifiedPoints)

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
  })

  geometry.rotateX(-Math.PI / 2)
  geometry.computeVertexNormals()

  return {
    geometry,
    sourcePointCount: points.length,
    simplifiedPointCount: simplifiedPoints.length,
  }
}

function TerrainCells({
  grid,
  simplifyTolerance,
  logPerformance,
}: {
  grid: HexGrid
  simplifyTolerance: number
  logPerformance: boolean
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const { minElev, maxElev, mergedGeo, stats } = useMemo(() => {
    const terrainCells = grid.cells.filter((c) => !c.isWater)
    if (terrainCells.length === 0) {
      return {
        minElev: 0,
        maxElev: 100,
        mergedGeo: new THREE.BufferGeometry(),
        stats: {
          cellCount: 0,
          vertices: 0,
          sourceBoundaryPoints: 0,
          simplifiedBoundaryPoints: 0,
        } satisfies GeometryStats,
      }
    }

    const elevations = terrainCells.map((c) => c.elevation)
    const minElev = Math.min(...elevations)
    const maxElev = Math.max(...elevations)

    const gridCenter = {
      lat: (grid.bounds.sw.lat + grid.bounds.ne.lat) / 2,
      lng: (grid.bounds.sw.lng + grid.bounds.ne.lng) / 2,
    }

    const prismResults = terrainCells.map((cell) =>
      createHexPrismGeometry(
        cell.boundary,
        gridCenter,
        cell.elevation,
        minElev,
        maxElev,
        simplifyTolerance
      )
    )

    const sourceBoundaryPoints = prismResults.reduce((sum, p) => sum + p.sourcePointCount, 0)
    const simplifiedBoundaryPoints = prismResults.reduce((sum, p) => sum + p.simplifiedPointCount, 0)

    const geometries = prismResults.map((p) => p.geometry)
    const merged = mergeGeometries(geometries)
    geometries.forEach((g) => g.dispose())

    return {
      minElev,
      maxElev,
      mergedGeo: merged,
      stats: {
        cellCount: terrainCells.length,
        vertices: merged.attributes.position?.count ?? 0,
        sourceBoundaryPoints,
        simplifiedBoundaryPoints,
      } satisfies GeometryStats,
    }
  }, [grid, simplifyTolerance])

  useEffect(() => {
    if (!logPerformance) return

    const start = performance.now()
    const frameId = requestAnimationFrame(() => {
      const renderReadyMs = performance.now() - start
      console.info('[HexMap3D] Terrain stats', {
        cells: stats.cellCount,
        vertices: stats.vertices,
        boundaryPointsBefore: stats.sourceBoundaryPoints,
        boundaryPointsAfter: stats.simplifiedBoundaryPoints,
        simplificationRatio:
          stats.sourceBoundaryPoints > 0
            ? Number((stats.simplifiedBoundaryPoints / stats.sourceBoundaryPoints).toFixed(3))
            : 1,
        renderReadyMs: Number(renderReadyMs.toFixed(2)),
      })
    })

    return () => cancelAnimationFrame(frameId)
  }, [logPerformance, stats])

  useEffect(() => {
    const material = materialRef.current
    return () => {
      mergedGeo.dispose()
      material?.dispose()
    }
  }, [mergedGeo])

  const uniforms = useMemo(
    () => ({
      uMinElevation: { value: minElev },
      uMaxElevation: { value: maxElev },
      uLightDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
    }),
    [minElev, maxElev]
  )

  return (
    <mesh geometry={mergedGeo}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={terrainVertexShader}
        fragmentShader={terrainFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}

function WaterCells({
  grid,
  simplifyTolerance,
  logPerformance,
}: {
  grid: HexGrid
  simplifyTolerance: number
  logPerformance: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const timeRef = useRef(0)

  useFrame((state) => {
    timeRef.current = state.clock.elapsedTime
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial
      if (mat.uniforms?.uTime) {
        mat.uniforms.uTime.value = timeRef.current
      }
    }
  })

  const { mergedGeo, stats } = useMemo(() => {
    const waterCells = grid.cells.filter((c) => c.isWater)
    if (waterCells.length === 0) {
      return {
        mergedGeo: new THREE.BufferGeometry(),
        stats: {
          cellCount: 0,
          vertices: 0,
          sourceBoundaryPoints: 0,
          simplifiedBoundaryPoints: 0,
        } satisfies GeometryStats,
      }
    }

    const gridCenter = {
      lat: (grid.bounds.sw.lat + grid.bounds.ne.lat) / 2,
      lng: (grid.bounds.sw.lng + grid.bounds.ne.lng) / 2,
    }

    const prismResults = waterCells.map((cell) =>
      createHexPrismGeometry(cell.boundary, gridCenter, -1, -1, 100, simplifyTolerance)
    )

    const sourceBoundaryPoints = prismResults.reduce((sum, p) => sum + p.sourcePointCount, 0)
    const simplifiedBoundaryPoints = prismResults.reduce((sum, p) => sum + p.simplifiedPointCount, 0)

    const geometries = prismResults.map((p) => p.geometry)
    const merged = mergeGeometries(geometries)
    geometries.forEach((g) => g.dispose())

    return {
      mergedGeo: merged,
      stats: {
        cellCount: waterCells.length,
        vertices: merged.attributes.position?.count ?? 0,
        sourceBoundaryPoints,
        simplifiedBoundaryPoints,
      } satisfies GeometryStats,
    }
  }, [grid, simplifyTolerance])

  useEffect(() => {
    if (!logPerformance) return

    const start = performance.now()
    const frameId = requestAnimationFrame(() => {
      const renderReadyMs = performance.now() - start
      console.info('[HexMap3D] Water stats', {
        cells: stats.cellCount,
        vertices: stats.vertices,
        boundaryPointsBefore: stats.sourceBoundaryPoints,
        boundaryPointsAfter: stats.simplifiedBoundaryPoints,
        simplificationRatio:
          stats.sourceBoundaryPoints > 0
            ? Number((stats.simplifiedBoundaryPoints / stats.sourceBoundaryPoints).toFixed(3))
            : 1,
        renderReadyMs: Number(renderReadyMs.toFixed(2)),
      })
    })

    return () => cancelAnimationFrame(frameId)
  }, [logPerformance, stats])

  useEffect(() => {
    const material = materialRef.current
    return () => {
      mergedGeo.dispose()
      material?.dispose()
    }
  }, [mergedGeo])

  return (
    <mesh ref={meshRef} geometry={mergedGeo}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        uniforms={{ uTime: { value: 0 } }}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export function HexMap3D({
  grid,
  simplifyTolerance = DEFAULT_SIMPLIFY_TOLERANCE,
  max3DCells = MAX_3D_CELLS_DEFAULT,
  logPerformance = true,
}: HexMap3DProps) {
  const safeMax3DCells = Math.min(Math.max(max3DCells, 1), MAX_3D_CELLS_HARD_LIMIT)

  const safeGrid = useMemo(() => {
    if (grid.cells.length <= safeMax3DCells) return grid

    console.warn(
      `[HexMap3D] Grid excede o limite seguro de ${safeMax3DCells} células 3D (recebidas: ${grid.cells.length}). Limitando renderização.`
    )

    return {
      ...grid,
      cells: grid.cells.slice(0, safeMax3DCells),
    }
  }, [grid, safeMax3DCells])

  const hasWater = safeGrid.cells.some((c) => c.isWater)
  const hasTerrain = safeGrid.cells.some((c) => !c.isWater)

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[50, 80, 30]} intensity={0.8} castShadow />

      {hasTerrain && (
        <TerrainCells
          grid={safeGrid}
          simplifyTolerance={simplifyTolerance}
          logPerformance={logPerformance}
        />
      )}
      {hasWater && (
        <WaterCells grid={safeGrid} simplifyTolerance={simplifyTolerance} logPerformance={logPerformance} />
      )}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={200}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  )
}

function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geometries.length === 0) return new THREE.BufferGeometry()
  if (geometries.length === 1) return geometries[0]

  let totalVertices = 0
  let totalIndices = 0

  for (const geo of geometries) {
    totalVertices += geo.attributes.position.count
    if (geo.index) {
      totalIndices += geo.index.count
    } else {
      totalIndices += geo.attributes.position.count
    }
  }

  const positions = new Float32Array(totalVertices * 3)
  const normals = new Float32Array(totalVertices * 3)
  const indices = new Uint32Array(totalIndices)

  let vertexOffset = 0
  let indexOffset = 0

  for (const geo of geometries) {
    const pos = geo.attributes.position
    const norm = geo.attributes.normal

    for (let i = 0; i < pos.count; i++) {
      positions[(vertexOffset + i) * 3] = pos.getX(i)
      positions[(vertexOffset + i) * 3 + 1] = pos.getY(i)
      positions[(vertexOffset + i) * 3 + 2] = pos.getZ(i)

      if (norm) {
        normals[(vertexOffset + i) * 3] = norm.getX(i)
        normals[(vertexOffset + i) * 3 + 1] = norm.getY(i)
        normals[(vertexOffset + i) * 3 + 2] = norm.getZ(i)
      }
    }

    if (geo.index) {
      for (let i = 0; i < geo.index.count; i++) {
        indices[indexOffset + i] = geo.index.array[i] + vertexOffset
      }
      indexOffset += geo.index.count
    } else {
      for (let i = 0; i < pos.count; i++) {
        indices[indexOffset + i] = vertexOffset + i
      }
      indexOffset += pos.count
    }

    vertexOffset += pos.count
  }

  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  merged.setIndex(new THREE.BufferAttribute(indices, 1))
  merged.computeVertexNormals()

  return merged
}

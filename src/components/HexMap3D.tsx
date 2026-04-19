import { useMemo, useRef } from 'react'
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
}

const MIN_HEIGHT = 0.15 // Minimum prism height (visual minimum)

/**
 * Create a single hexagonal prism geometry.
 */
function createHexPrismGeometry(
  boundary: { lat: number; lng: number }[],
  center: { lat: number; lng: number },
  elevation: number,
  minElev: number,
  maxElev: number
): THREE.BufferGeometry {
  const height = Math.max(
    MIN_HEIGHT,
    ((elevation - minElev) / Math.max(maxElev - minElev, 1)) * 10 + MIN_HEIGHT
  )

  // Convert lat/lng to local XY (relative to grid center)
  const scale = 100 // arbitrary scale factor
  const points = boundary.map((b) => {
    const x = (b.lng - center.lng) * scale * Math.cos((center.lat * Math.PI) / 180)
    const y = (b.lat - center.lat) * scale
    return new THREE.Vector2(x, y)
  })

  const shape = new THREE.Shape(points)

  // Extrude to create prism
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
  })

  // Rotate so Z is up
  geometry.rotateX(-Math.PI / 2)
  geometry.computeVertexNormals()

  return geometry
}

/**
 * Terrain hex cells — merged by batch, colored by elevation shader.
 */
function TerrainCells({ grid }: { grid: HexGrid }) {
  const { minElev, maxElev, mergedGeo } = useMemo(() => {
    const terrainCells = grid.cells.filter((c) => !c.isWater)
    if (terrainCells.length === 0) {
      return { minElev: 0, maxElev: 100, mergedGeo: new THREE.BufferGeometry() }
    }

    const elevations = terrainCells.map((c) => c.elevation)
    const minElev = Math.min(...elevations)
    const maxElev = Math.max(...elevations)

    // Merge all terrain hexes into one geometry
    const gridCenter = {
      lat: (grid.bounds.sw.lat + grid.bounds.ne.lat) / 2,
      lng: (grid.bounds.sw.lng + grid.bounds.ne.lng) / 2,
    }

    const geometries = terrainCells.map((cell) =>
      createHexPrismGeometry(cell.boundary, gridCenter, cell.elevation, minElev, maxElev)
    )

    const merged = mergeGeometries(geometries)

    // Clean up individual geometries
    geometries.forEach((g) => g.dispose())

    return { minElev, maxElev, mergedGeo: merged }
  }, [grid])

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
        vertexShader={terrainVertexShader}
        fragmentShader={terrainFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}

/**
 * Water hex cells — separate mesh with animated water shader.
 */
function WaterCells({ grid }: { grid: HexGrid }) {
  const meshRef = useRef<THREE.Mesh>(null)
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

  const { mergedGeo } = useMemo(() => {
    const waterCells = grid.cells.filter((c) => c.isWater)
    if (waterCells.length === 0) {
      return { mergedGeo: new THREE.BufferGeometry() }
    }

    const gridCenter = {
      lat: (grid.bounds.sw.lat + grid.bounds.ne.lat) / 2,
      lng: (grid.bounds.sw.lng + grid.bounds.ne.lng) / 2,
    }

    const geometries = waterCells.map((cell) =>
      createHexPrismGeometry(cell.boundary, gridCenter, -1, -1, 100)
    )

    const merged = mergeGeometries(geometries)
    geometries.forEach((g) => g.dispose())

    return { mergedGeo: merged }
  }, [grid])

  return (
    <mesh ref={meshRef} geometry={mergedGeo}>
      <shaderMaterial
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        uniforms={{ uTime: { value: 0 } }}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

/**
 * Main 3D hex map scene.
 */
export function HexMap3D({ grid }: HexMap3DProps) {
  const hasWater = grid.cells.some((c) => c.isWater)
  const hasTerrain = grid.cells.some((c) => !c.isWater)

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[50, 80, 30]} intensity={0.8} castShadow />

      {/* Hex cells */}
      {hasTerrain && <TerrainCells grid={grid} />}
      {hasWater && <WaterCells grid={grid} />}

      {/* Camera controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={200}
        maxPolarAngle={Math.PI / 2.1} // Don't go below ground
      />
    </>
  )
}

/**
 * Simple geometry merge — combines multiple BufferGeometries into one.
 * Equivalent to Three.js BufferGeometryUtils.mergeGeometries but inline.
 */
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

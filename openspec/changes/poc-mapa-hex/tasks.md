## 1. Project Scaffolding ✅

- [x] 1.1 Initialize Vite + React + TypeScript project
- [x] 1.2 Install dependencies: react, three.js, @react-three/fiber, @react-three/drei, h3-js, maplibre-gl, tailwindcss
- [x] 1.3 Configure Tailwind CSS (v4 @tailwindcss/vite plugin)
- [x] 1.4 Create folder structure: src/components/, src/lib/, src/shaders/, src/hooks/
- [x] 1.5 Create base App component with placeholder layout
- [x] 1.6 Verify build + type-check + lint pass (CI green)

## 2. Region Selector (MapCN/MapLibre)

- [ ] 2.1 Create MapLibre map component with OSM tiles
- [ ] 2.2 Add bounding box drawing/selection tool
- [ ] 2.3 Display selected coordinates in UI
- [ ] 2.4 Add confirm button that emits bounding box
- [ ] 2.5 Style with Tailwind/shadcn patterns

## 3. Geo Data Pipeline — Elevation

- [ ] 3.1 Create utility to fetch SRTM elevation data from OpenTopography API
- [ ] 3.2 Parse elevation raster into 2D grid of elevation values
- [ ] 3.3 Implement bilinear interpolation for smooth elevation sampling
- [ ] 3.4 Add caching for repeated region queries

## 4. Geo Data Pipeline — Features

- [ ] 4.1 Create Overpass API client for OSM queries
- [ ] 4.2 Query water features (rivers, lakes, ocean) for bounding box
- [ ] 4.3 Query land use/land cover features (forest, urban, farmland)
- [ ] 4.4 Classify features into terrain categories
- [ ] 4.5 Convert OSM features to GeoJSON format

## 5. Hex Grid Generator

- [ ] 5.1 Install and configure h3-js
- [ ] 5.2 Generate hex grid covering bounding box at configurable resolution
- [ ] 5.3 For each hex cell: sample elevation from SRTM data
- [ ] 5.4 For each hex cell: determine terrain type from OSM features
- [ ] 5.5 For each hex cell: flag if it's water
- [ ] 5.6 Expose resolution slider in UI (h3 resolutions 5-9)

## 6. Hex Map Renderer — Base

- [ ] 6.1 Create Three.js scene with React Three Fiber canvas
- [ ] 6.2 Create hexagonal prism geometry (base shape)
- [ ] 6.3 Instantiate hex prisms for each cell with elevation-based height
- [ ] 6.4 Implement geometry merging by terrain type (BufferGeometryUtils)
- [ ] 6.5 Add OrbitControls for camera interaction
- [ ] 6.6 Add directional lighting

## 7. Hex Map Renderer — Shaders

- [ ] 7.1 Create vertex shader for terrain (pass elevation + world position)
- [ ] 7.2 Create fragment shader with altitude gradient (green → brown → white)
- [ ] 7.3 Create water shader with FBM noise wave animation
- [ ] 7.4 Blend biome colors based on terrain type uniform
- [ ] 7.5 Add fog/atmosphere effect at edges

## 8. Integration & Polish

- [ ] 8.1 Wire full pipeline: select region → fetch data → generate grid → render
- [ ] 8.2 Add loading states during data fetch and grid generation
- [ ] 8.3 Add error handling for API failures
- [ ] 8.4 Pre-select a default region (e.g., Rio de Janeiro) for instant demo
- [ ] 8.5 Performance test with 5000+ cells, optimize if < 30 FPS
- [ ] 8.6 Final visual polish: shadows, ambient occlusion, anti-aliasing

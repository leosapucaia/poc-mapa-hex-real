/**
 * Terrain shader — altitude gradient: green (low) → brown (mid) → white (high)
 * Receives elevation as a varying for per-vertex coloring.
 */
export const terrainVertexShader = /* glsl */ `
  varying float vElevation;
  varying vec3 vNormal;
  varying vec3 vPosition;

  uniform float uMinElevation;
  uniform float uMaxElevation;

  void main() {
    vElevation = position.z;
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const terrainFragmentShader = /* glsl */ `
  varying float vElevation;
  varying vec3 vNormal;
  varying vec3 vPosition;

  uniform float uMinElevation;
  uniform float uMaxElevation;
  uniform vec3 uLightDir;

  void main() {
    // Normalize elevation to 0-1
    float t = clamp((vElevation - uMinElevation) / max(uMaxElevation - uMinElevation, 1.0), 0.0, 1.0);

    // Altitude gradient: green → brown → white
    vec3 green  = vec3(0.22, 0.62, 0.25);
    vec3 brown  = vec3(0.55, 0.35, 0.17);
    vec3 white  = vec3(0.90, 0.89, 0.86);

    vec3 color;
    if (t < 0.4) {
      color = mix(green, brown, t / 0.4);
    } else {
      color = mix(brown, white, (t - 0.4) / 0.6);
    }

    // Simple directional lighting
    float light = max(dot(vNormal, normalize(uLightDir)), 0.0);
    float ambient = 0.35;
    color *= (ambient + light * 0.65);

    // Subtle fog based on distance
    float fog = 1.0 - exp(-length(vPosition) * 0.00008);
    color = mix(color, vec3(0.75, 0.80, 0.85), fog * 0.3);

    gl_FragColor = vec4(color, 1.0);
  }
`

/**
 * Water shader — animated waves using FBM noise
 */
export const waterVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const waterFragmentShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPosition;

  uniform float uTime;

  // Simple FBM noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Animated wave pattern
    vec2 uv = vUv * 6.0 + uTime * 0.3;
    float wave = fbm(uv);

    // Water colors
    vec3 deep = vec3(0.08, 0.15, 0.35);
    vec3 shallow = vec3(0.15, 0.35, 0.65);
    vec3 foam = vec3(0.70, 0.85, 0.95);

    vec3 color = mix(deep, shallow, wave);
    color = mix(color, foam, smoothstep(0.65, 0.80, wave) * 0.4);

    // Subtle specular-like highlight
    float highlight = pow(wave, 3.0) * 0.3;
    color += vec3(highlight);

    // Fade at edges for depth
    float edgeFade = smoothstep(0.0, 0.05, min(vUv.x, min(vUv.y, min(1.0 - vUv.x, 1.0 - vUv.y))));
    float alpha = 0.85 * edgeFade;

    gl_FragColor = vec4(color, alpha);
  }
`

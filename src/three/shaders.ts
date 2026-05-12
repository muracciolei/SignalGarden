export const backgroundVertexShader = `
  varying vec3 vWorld;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

export const backgroundFragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform float uVolume;
  uniform float uBass;
  uniform float uIdle;
  uniform vec3 uBackground;
  uniform vec3 uPrimary;
  uniform vec3 uSecondary;
  uniform vec3 uAccent;

  varying vec3 vWorld;
  varying vec2 vUv;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(
        mix(hash(i + vec3(0.0, 0.0, 0.0)), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x),
        f.y
      ),
      mix(
        mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x),
        f.y
      ),
      f.z
    );
  }

  float fbm(vec3 p) {
    float sum = 0.0;
    float amp = 0.5;

    for (int i = 0; i < 5; i++) {
      sum += noise(p) * amp;
      p *= 2.03;
      amp *= 0.52;
    }

    return sum;
  }

  void main() {
    vec3 dir = normalize(vWorld);
    float time = uTime * (0.045 + uVolume * 0.045);
    float field = fbm(dir * 3.0 + vec3(time, time * 0.42, -time * 0.8));
    float veins = smoothstep(0.42, 0.94, sin((dir.x + dir.y * 0.7 + field) * 9.5 + uTime * 0.22));
    float horizon = smoothstep(-0.78, 0.92, dir.y + field * 0.45);
    float pulse = smoothstep(0.62, 1.0, field + uBass * 0.6);

    vec3 color = mix(uBackground, uSecondary * 0.48, horizon);
    color += uPrimary * veins * (0.12 + uVolume * 0.32);
    color += uAccent * pulse * 0.16;
    color *= 0.82 + (1.0 - uIdle) * 0.28;

    float vignette = smoothstep(1.0, 0.18, distance(vUv, vec2(0.5)));
    color *= 0.34 + vignette * 0.52;
    color += uPrimary * pow(vignette, 5.0) * 0.025;

    gl_FragColor = vec4(color, 1.0);
  }
`

export const particleVertexShader = `
  precision highp float;

  uniform float uTime;
  uniform float uBass;
  uniform float uTreble;
  uniform float uVolume;
  uniform float uPointerEnergy;
  uniform float uKeyboard;
  uniform float uIdle;
  uniform vec2 uPointer;
  uniform float uPixelRatio;
  uniform vec3 uPrimary;
  uniform vec3 uSecondary;
  uniform vec3 uAccent;

  attribute float aSeed;
  attribute float aSize;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vPulse;

  void main() {
    vec3 p = position;
    float orbit = uTime * (0.05 + aSeed * 0.035) + aSeed * 24.0;
    float wave = sin(orbit + p.x * 0.08) + cos(orbit * 1.7 + p.y * 0.06);
    float audioLift = uBass * 3.2 + uTreble * 1.7 + uKeyboard * 1.2;

    p.x += sin(orbit + p.z * 0.025) * (0.5 + audioLift);
    p.y += cos(orbit * 1.25 + p.x * 0.018) * (0.6 + audioLift * 0.72);
    p.z += wave * (0.4 + uVolume * 2.4);

    vec2 projected = p.xy * 0.045;
    float pull = exp(-distance(projected, uPointer) * 4.3) * uPointerEnergy;
    p.xy += normalize(vec2(uPointer.x, uPointer.y + 0.001)) * pull * (2.4 + uBass * 5.0);
    p.z += pull * 8.0;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    float depth = clamp(26.0 / -mvPosition.z, 0.35, 3.2);
    float size = aSize * (0.72 + uVolume * 1.4 + pull * 3.2) * depth * uPixelRatio;

    vPulse = clamp(0.22 + wave * 0.16 + uVolume + pull, 0.0, 1.6);
    vec3 moodColor = mix(mix(uPrimary, uSecondary, fract(aSeed * 4.13)), uAccent, smoothstep(0.45, 1.0, vPulse));
    vColor = mix(aColor, moodColor, 0.72) * (0.72 + vPulse * 0.62 + (1.0 - uIdle) * 0.18);
    gl_PointSize = size;
    gl_Position = projectionMatrix * mvPosition;
  }
`

export const particleFragmentShader = `
  precision highp float;

  varying vec3 vColor;
  varying float vPulse;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist = length(uv);
    float core = smoothstep(0.5, 0.04, dist);
    float halo = smoothstep(0.5, 0.18, dist) * 0.34;
    float alpha = core + halo * (0.6 + vPulse);

    if (alpha < 0.02) {
      discard;
    }

    gl_FragColor = vec4(vColor * (core * 0.62 + halo * 0.72), alpha * 0.58);
  }
`

export const organismVertexShader = `
  precision highp float;

  uniform float uTime;
  uniform float uBass;
  uniform float uTreble;
  uniform float uKeyboard;
  uniform float uIdle;

  attribute float aSeed;

  varying float vSeed;
  varying vec3 vNormal;
  varying float vGlow;

  void main() {
    vSeed = aSeed;
    vNormal = normalize(normalMatrix * normal);
    float pulse = sin(uTime * (1.1 + aSeed * 0.9) + aSeed * 16.0);
    float ripple = sin((position.y + position.x) * 5.5 + uTime * 2.2 + aSeed * 12.0);
    vec3 transformed = position + normal * (pulse * 0.09 + ripple * (0.03 + uBass * 0.16));
    transformed *= 1.0 + uTreble * 0.22 + uKeyboard * 0.06 - uIdle * 0.03;

    #ifdef USE_INSTANCING
      vec4 world = modelViewMatrix * instanceMatrix * vec4(transformed, 1.0);
    #else
      vec4 world = modelViewMatrix * vec4(transformed, 1.0);
    #endif

    vGlow = clamp(0.45 + pulse * 0.2 + uBass * 0.75 + uTreble * 0.45, 0.0, 1.7);
    gl_Position = projectionMatrix * world;
  }
`

export const organismFragmentShader = `
  precision highp float;

  uniform vec3 uPrimary;
  uniform vec3 uSecondary;
  uniform vec3 uAccent;
  uniform float uVolume;

  varying float vSeed;
  varying vec3 vNormal;
  varying float vGlow;

  void main() {
    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.2);
    vec3 base = mix(uPrimary, uSecondary, fract(vSeed * 11.31));
    vec3 color = mix(base, uAccent, fresnel * 0.72 + uVolume * 0.18);
    color += base * vGlow * 0.18;

    gl_FragColor = vec4(color, 0.46 + fresnel * 0.18);
  }
`

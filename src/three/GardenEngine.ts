import {
  AdditiveBlending,
  AmbientLight,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Euler,
  FogExp2,
  Group,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TorusKnotGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import type { AudioLevels, GardenStats, MoodProfile, RenderQuality } from '../types/ecosystem'
import type { MutableRefObject } from 'react'
import { createPrng, hashSeed } from '../lib/seed'
import {
  backgroundFragmentShader,
  backgroundVertexShader,
  organismFragmentShader,
  organismVertexShader,
  particleFragmentShader,
  particleVertexShader,
} from './shaders'

interface GardenEngineOptions {
  container: HTMLElement
  seed: string
  mood: MoodProfile
  quality: RenderQuality
  audioRef: MutableRefObject<AudioLevels>
  onFrame?: (stats: GardenStats) => void
}

interface OrganismState {
  origin: Vector3
  orbitRadius: number
  orbitSpeed: number
  verticalSpeed: number
  scale: number
  seed: number
}

interface EphemeralMesh {
  mesh: Mesh
  age: number
  life: number
  velocity?: Vector3
}

const QUALITY = {
  low: { particles: 900, organisms: 26, vines: 8, pixelRatio: 1.15 },
  medium: { particles: 1650, organisms: 44, vines: 12, pixelRatio: 1.45 },
  high: { particles: 2800, organisms: 72, vines: 17, pixelRatio: 1.9 },
} satisfies Record<RenderQuality, { particles: number; organisms: number; vines: number; pixelRatio: number }>

export class GardenEngine {
  private readonly container: HTMLElement
  private readonly audioRef: MutableRefObject<AudioLevels>
  private readonly onFrame?: (stats: GardenStats) => void
  private readonly renderer: WebGLRenderer
  private readonly composer: EffectComposer
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(52, 1, 0.1, 180)
  private readonly clock = { last: performance.now(), elapsed: 0 }
  private readonly prng: () => number
  private readonly organisms: OrganismState[] = []
  private readonly organismMesh: InstancedMesh
  private readonly organismMaterial: ShaderMaterial
  private particleMaterial!: ShaderMaterial
  private readonly backgroundMaterial: ShaderMaterial
  private readonly bloomPass: UnrealBloomPass
  private readonly afterimagePass: AfterimagePass
  private readonly roots = new Group()
  private readonly structures = new Group()
  private readonly trails: EphemeralMesh[] = []
  private readonly shockwaves: EphemeralMesh[] = []
  private readonly pointer = new Vector2(0, 0)
  private readonly pointerWorld = new Vector3()
  private readonly currentColors: Record<'background' | 'primary' | 'secondary' | 'accent' | 'fog', Color>
  private readonly targetColors: Record<'background' | 'primary' | 'secondary' | 'accent' | 'fog', Color>
  private quality: RenderQuality
  private targetMood: MoodProfile
  private animationId = 0
  private disposed = false
  private pointerEnergy = 0
  private keyboardEnergy = 0
  private lastInteraction = performance.now()
  private lastTrail = 0
  private fps = 60
  private frameCount = 0
  private frameAccumulator = 0
  private lastStatsAt = 0

  constructor(options: GardenEngineOptions) {
    this.container = options.container
    this.audioRef = options.audioRef
    this.onFrame = options.onFrame
    this.quality = options.quality
    this.targetMood = options.mood
    this.prng = createPrng(`${options.seed}:${hashSeed(options.mood.id)}`)
    this.currentColors = this.makeColorSet(options.mood)
    this.targetColors = this.makeColorSet(options.mood)

    this.camera.position.set(0, 0, 28)
    this.scene.fog = new FogExp2(options.mood.fog, 0.018)
    this.scene.add(this.roots, this.structures)
    this.scene.add(new AmbientLight(options.mood.primary, 0.6))

    this.renderer = new WebGLRenderer({
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(options.mood.background)
    this.renderer.domElement.className = 'signal-canvas'
    this.renderer.domElement.setAttribute('aria-label', 'Signal Garden procedural ecosystem')
    this.container.append(this.renderer.domElement)

    const renderPass = new RenderPass(this.scene, this.camera)
    this.bloomPass = new UnrealBloomPass(new Vector2(1, 1), options.mood.bloom * 0.65, 0.48, 0.42)
    this.afterimagePass = new AfterimagePass(0.86)
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(renderPass)
    this.composer.addPass(this.afterimagePass)
    this.composer.addPass(this.bloomPass)
    this.composer.addPass(new OutputPass())

    this.backgroundMaterial = this.createBackground()
    this.scene.add(new Mesh(new SphereGeometry(92, 64, 32), this.backgroundMaterial))

    const particleSystem = this.createParticles()
    this.scene.add(particleSystem)

    const { mesh, material } = this.createOrganisms()
    this.organismMesh = mesh
    this.organismMaterial = material
    this.scene.add(this.organismMesh)

    this.createVines()
    this.createStructures()
    this.bindEvents()
    this.resize()
    this.animate()
  }

  setMood(mood: MoodProfile) {
    this.targetMood = mood
    const next = this.makeColorSet(mood)
    this.targetColors.background.copy(next.background)
    this.targetColors.primary.copy(next.primary)
    this.targetColors.secondary.copy(next.secondary)
    this.targetColors.accent.copy(next.accent)
    this.targetColors.fog.copy(next.fog)
  }

  setQuality(quality: RenderQuality) {
    this.quality = quality
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY[quality].pixelRatio))
    this.resize()
  }

  captureStill(): string {
    this.composer.render()
    return this.renderer.domElement.toDataURL('image/png', 0.95)
  }

  recordLoop(durationMs = 5000): Promise<Blob> {
    const canvas = this.renderer.domElement

    if (!('captureStream' in canvas) || !('MediaRecorder' in window)) {
      return Promise.reject(new Error('Video capture is not supported by this browser.'))
    }

    return new Promise((resolve, reject) => {
      const stream = canvas.captureStream(30)
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      const chunks: BlobPart[] = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }
      recorder.onerror = () => reject(new Error('Video recording failed.'))
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        resolve(new Blob(chunks, { type: 'video/webm' }))
      }
      recorder.start()
      window.setTimeout(() => recorder.stop(), durationMs)
    })
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.animationId)
    this.unbindEvents()
    this.composer.dispose()
    this.renderer.dispose()
    this.container.querySelector('.signal-canvas')?.remove()

    this.scene.traverse((node) => {
      const mesh = node as Mesh
      mesh.geometry?.dispose()
      const material = mesh.material

      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose())
      } else {
        material?.dispose()
      }
    })
  }

  private createBackground() {
    return new ShaderMaterial({
      vertexShader: backgroundVertexShader,
      fragmentShader: backgroundFragmentShader,
      side: BackSide,
      uniforms: {
        uTime: { value: 0 },
        uVolume: { value: 0 },
        uBass: { value: 0 },
        uIdle: { value: 0 },
        uBackground: { value: this.currentColors.background.clone() },
        uPrimary: { value: this.currentColors.primary.clone() },
        uSecondary: { value: this.currentColors.secondary.clone() },
        uAccent: { value: this.currentColors.accent.clone() },
      },
    })
  }

  private createParticles() {
    const count = Math.floor(QUALITY[this.quality].particles * this.targetMood.density)
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const seeds = new Float32Array(count)
    const palette = [
      this.currentColors.primary,
      this.currentColors.secondary,
      this.currentColors.accent,
      new Color(this.targetMood.ember),
    ]

    for (let index = 0; index < count; index += 1) {
      const radius = 5 + this.prng() * 25
      const theta = this.prng() * Math.PI * 2
      const phi = Math.acos(this.prng() * 2 - 1)
      const stride = index * 3
      positions[stride] = Math.sin(phi) * Math.cos(theta) * radius
      positions[stride + 1] = Math.cos(phi) * radius * 0.72
      positions[stride + 2] = Math.sin(phi) * Math.sin(theta) * radius

      const color = palette[Math.floor(this.prng() * palette.length)].clone()
      color.offsetHSL((this.prng() - 0.5) * 0.08, 0, (this.prng() - 0.5) * 0.12)
      colors[stride] = color.r
      colors[stride + 1] = color.g
      colors[stride + 2] = color.b

      sizes[index] = 1.2 + this.prng() * 5.4
      seeds[index] = this.prng()
    }

    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('aColor', new BufferAttribute(colors, 3))
    geometry.setAttribute('aSize', new BufferAttribute(sizes, 1))
    geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1))

    this.particleMaterial = new ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uTreble: { value: 0 },
        uVolume: { value: 0 },
        uPointerEnergy: { value: 0 },
        uKeyboard: { value: 0 },
        uIdle: { value: 0 },
        uPointer: { value: this.pointer.clone() },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, QUALITY[this.quality].pixelRatio) },
        uPrimary: { value: this.currentColors.primary.clone() },
        uSecondary: { value: this.currentColors.secondary.clone() },
        uAccent: { value: this.currentColors.accent.clone() },
      },
    })

    return new Points(geometry, this.particleMaterial)
  }

  private createOrganisms() {
    const count = Math.floor(QUALITY[this.quality].organisms * this.targetMood.density)
    const geometry = new IcosahedronGeometry(1, 3)
    const seeds = new Float32Array(count)
    geometry.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1))

    const material = new ShaderMaterial({
      vertexShader: organismVertexShader,
      fragmentShader: organismFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uTreble: { value: 0 },
        uKeyboard: { value: 0 },
        uIdle: { value: 0 },
        uVolume: { value: 0 },
        uPrimary: { value: this.currentColors.primary.clone() },
        uSecondary: { value: this.currentColors.secondary.clone() },
        uAccent: { value: this.currentColors.accent.clone() },
      },
    })

    const mesh = new InstancedMesh(geometry, material, count)
    const matrix = new Matrix4()

    for (let index = 0; index < count; index += 1) {
      const state: OrganismState = {
        origin: new Vector3((this.prng() - 0.5) * 18, (this.prng() - 0.5) * 11, (this.prng() - 0.5) * 18),
        orbitRadius: 0.5 + this.prng() * 3.5,
        orbitSpeed: 0.15 + this.prng() * 0.45,
        verticalSpeed: 0.2 + this.prng() * 0.7,
        scale: 0.16 + this.prng() * 0.8,
        seed: this.prng(),
      }
      this.organisms.push(state)
      seeds[index] = state.seed
      matrix.makeScale(state.scale, state.scale * (0.8 + this.prng() * 0.7), state.scale)
      matrix.setPosition(state.origin)
      mesh.setMatrixAt(index, matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
    geometry.attributes.aSeed.needsUpdate = true

    return { mesh, material }
  }

  private createVines() {
    const count = QUALITY[this.quality].vines

    for (let index = 0; index < count; index += 1) {
      const points: Vector3[] = []
      const startAngle = this.prng() * Math.PI * 2
      const radius = 5 + this.prng() * 12

      for (let step = 0; step < 9; step += 1) {
        const t = step / 8
        const angle = startAngle + t * Math.PI * (1.4 + this.prng() * 1.2)
        points.push(
          new Vector3(
            Math.cos(angle) * (radius + Math.sin(t * Math.PI) * 3),
            (t - 0.5) * 17 + (this.prng() - 0.5) * 2,
            Math.sin(angle) * (radius * 0.75 + this.prng() * 4),
          ),
        )
      }

      const curve = new CatmullRomCurve3(points)
      const geometry = new TubeGeometry(curve, 90, 0.025 + this.prng() * 0.045, 7, false)
      const color = [this.currentColors.primary, this.currentColors.secondary, this.currentColors.accent][index % 3]
      const material = new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.16 + this.prng() * 0.12,
        blending: AdditiveBlending,
        depthWrite: false,
      })
      const mesh = new Mesh(geometry, material)
      mesh.userData.seed = this.prng()
      this.roots.add(mesh)
    }
  }

  private createStructures() {
    for (let index = 0; index < 9; index += 1) {
      const geometry = new TorusKnotGeometry(0.42 + this.prng() * 0.55, 0.025 + this.prng() * 0.055, 92, 8)
      const material = new MeshStandardMaterial({
        color: this.currentColors.secondary,
        emissive: this.currentColors.primary,
        emissiveIntensity: 0.8,
        roughness: 0.25,
        metalness: 0.18,
        transparent: true,
        opacity: 0.42,
        blending: AdditiveBlending,
        depthWrite: false,
      })
      const mesh = new Mesh(geometry, material)
      mesh.position.set((this.prng() - 0.5) * 24, (this.prng() - 0.5) * 14, (this.prng() - 0.5) * 20)
      mesh.rotation.set(this.prng() * Math.PI, this.prng() * Math.PI, this.prng() * Math.PI)
      mesh.scale.setScalar(0.75 + this.prng() * 1.9)
      mesh.userData.speed = 0.15 + this.prng() * 0.55
      this.structures.add(mesh)
    }
  }

  private animate = () => {
    if (this.disposed) {
      return
    }

    const now = performance.now()
    const delta = Math.min(0.05, (now - this.clock.last) / 1000)
    this.clock.last = now
    this.clock.elapsed += delta
    this.frameAccumulator += delta
    this.frameCount += 1

    if (this.frameAccumulator >= 0.5) {
      this.fps = Math.round(this.frameCount / this.frameAccumulator)
      this.frameAccumulator = 0
      this.frameCount = 0
    }

    this.update(delta, now)
    this.composer.render(delta)
    this.animationId = requestAnimationFrame(this.animate)
  }

  private update(delta: number, now: number) {
    const audio = this.audioRef.current
    const idle = Math.min(1, Math.max(0, (now - this.lastInteraction - 15000) / 14000))
    this.pointerEnergy *= 0.9
    this.keyboardEnergy *= 0.94

    this.lerpColors(delta)
    this.updateUniforms(audio, idle)
    this.updateOrganisms(audio, idle)
    this.updateVines(audio)
    this.updateStructures(audio)
    this.updateEphemeral(this.trails, delta, audio)
    this.updateEphemeral(this.shockwaves, delta, audio)

    this.camera.position.x += (this.pointer.x * 1.6 - this.camera.position.x) * delta * 0.65
    this.camera.position.y += (this.pointer.y * 0.9 - this.camera.position.y) * delta * 0.65
    this.camera.lookAt(0, 0, 0)

    this.bloomPass.strength +=
      (this.targetMood.bloom * 0.68 + audio.volume * 0.42 - this.bloomPass.strength) * delta * 1.8
    this.bloomPass.radius = 0.36 + audio.treble * 0.2
    ;(this.afterimagePass as unknown as { uniforms: { damp: { value: number } } }).uniforms.damp.value =
      0.84 + idle * 0.05 - audio.volume * 0.06

    if (now - this.lastStatsAt > 420) {
      this.lastStatsAt = now
      this.onFrame?.({
        organisms: this.organisms.length,
        particles: QUALITY[this.quality].particles,
        fps: this.fps,
        idle,
      })
    }
  }

  private updateUniforms(audio: AudioLevels, idle: number) {
    const time = this.clock.elapsed
    const uniforms = [
      this.backgroundMaterial.uniforms,
      this.particleMaterial.uniforms,
      this.organismMaterial.uniforms,
    ]

    for (const uniform of uniforms) {
      if (uniform.uTime) uniform.uTime.value = time
      if (uniform.uBass) uniform.uBass.value = audio.bass
      if (uniform.uTreble) uniform.uTreble.value = audio.treble
      if (uniform.uVolume) uniform.uVolume.value = audio.volume
      if (uniform.uKeyboard) uniform.uKeyboard.value = this.keyboardEnergy
      if (uniform.uPointerEnergy) uniform.uPointerEnergy.value = this.pointerEnergy
      if (uniform.uIdle) uniform.uIdle.value = idle
      if (uniform.uPointer) uniform.uPointer.value.copy(this.pointer)
      if (uniform.uPrimary) uniform.uPrimary.value.copy(this.currentColors.primary)
      if (uniform.uSecondary) uniform.uSecondary.value.copy(this.currentColors.secondary)
      if (uniform.uAccent) uniform.uAccent.value.copy(this.currentColors.accent)
      if (uniform.uBackground) uniform.uBackground.value.copy(this.currentColors.background)
    }

    this.renderer.setClearColor(this.currentColors.background)

    if (this.scene.fog instanceof FogExp2) {
      this.scene.fog.color.copy(this.currentColors.fog)
      this.scene.fog.density = 0.014 + idle * 0.011 + audio.volume * 0.006
    }
  }

  private updateOrganisms(audio: AudioLevels, idle: number) {
    const matrix = new Matrix4()
    const time = this.clock.elapsed

    this.organisms.forEach((organism, index) => {
      const orbit = time * organism.orbitSpeed * this.targetMood.motion + organism.seed * Math.PI * 2
      const pulse = 1 + Math.sin(time * organism.verticalSpeed + organism.seed * 12) * 0.12
      const audioScale = 1 + audio.bass * 0.65 + audio.treble * 0.22 + this.keyboardEnergy * 0.08
      const position = organism.origin.clone()
      position.x += Math.cos(orbit) * organism.orbitRadius * (1 + audio.volume * 0.42)
      position.y += Math.sin(orbit * 0.72) * organism.orbitRadius * 0.4 - idle * 0.25
      position.z += Math.sin(orbit) * organism.orbitRadius

      matrix.makeRotationFromEuler(new Euler(orbit * 0.8, orbit * 1.1, orbit * 0.35, 'XYZ'))
      matrix.scale(
        new Vector3(
          organism.scale * pulse * audioScale,
          organism.scale * (0.75 + organism.seed * 0.9) * audioScale,
          organism.scale * pulse * audioScale,
        ),
      )
      matrix.setPosition(position)
      this.organismMesh.setMatrixAt(index, matrix)
    })

    this.organismMesh.instanceMatrix.needsUpdate = true
  }

  private updateVines(audio: AudioLevels) {
    this.roots.children.forEach((child, index) => {
      child.rotation.y += 0.0008 * this.targetMood.motion * (index % 2 === 0 ? 1 : -1)
      child.rotation.z = Math.sin(this.clock.elapsed * 0.13 + child.userData.seed * 12) * 0.05

      const material = (child as Mesh).material as MeshBasicMaterial
      material.color.lerp(index % 2 === 0 ? this.currentColors.primary : this.currentColors.accent, 0.025)
      material.opacity = 0.13 + audio.mid * 0.18 + Math.sin(this.clock.elapsed + index) * 0.025
    })
  }

  private updateStructures(audio: AudioLevels) {
    this.structures.children.forEach((child, index) => {
      child.rotation.x += 0.0018 * child.userData.speed * this.targetMood.motion
      child.rotation.y -= 0.0012 * child.userData.speed
      const scale = 1 + Math.sin(this.clock.elapsed * 0.7 + index) * 0.06 + audio.bass * 0.24
      child.scale.setScalar(scale * (0.85 + index * 0.015))

      const material = (child as Mesh).material as MeshStandardMaterial
      material.color.lerp(this.currentColors.secondary, 0.025)
      material.emissive.lerp(index % 2 ? this.currentColors.primary : this.currentColors.accent, 0.025)
      material.emissiveIntensity = 0.45 + audio.volume * 1.4
    })
  }

  private updateEphemeral(collection: EphemeralMesh[], delta: number, audio: AudioLevels) {
    for (let index = collection.length - 1; index >= 0; index -= 1) {
      const item = collection[index]
      item.age += delta
      const progress = item.age / item.life
      const material = item.mesh.material as MeshBasicMaterial

      if (progress >= 1) {
        item.mesh.removeFromParent()
        item.mesh.geometry.dispose()
        material.dispose()
        collection.splice(index, 1)
        continue
      }

      item.mesh.position.addScaledVector(item.velocity ?? new Vector3(), delta)
      const strength = 1 - progress
      item.mesh.scale.multiplyScalar(1 + delta * (0.5 + audio.bass * 1.6))
      material.opacity = strength * (0.34 + audio.volume * 0.22)
    }
  }

  private addTrail() {
    const geometry = new PlaneGeometry(0.24, 0.24)
    const material = new MeshBasicMaterial({
      color: this.currentColors.accent,
      transparent: true,
      opacity: 0.34,
      blending: AdditiveBlending,
      depthWrite: false,
    })
    const mesh = new Mesh(geometry, material)
    mesh.position.copy(this.pointerWorld)
    mesh.position.z += 1.5 + this.prng() * 2
    mesh.rotation.z = this.prng() * Math.PI
    this.scene.add(mesh)
    this.trails.push({
      mesh,
      age: 0,
      life: 0.55 + this.prng() * 0.45,
      velocity: new Vector3((this.prng() - 0.5) * 0.45, (this.prng() - 0.5) * 0.45, -1.1),
    })
  }

  private addShockwave() {
    const geometry = new RingGeometry(0.55, 0.6, 96)
    const material = new MeshBasicMaterial({
      color: this.currentColors.primary,
      transparent: true,
      opacity: 0.48,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    })
    const mesh = new Mesh(geometry, material)
    mesh.position.copy(this.pointerWorld)
    mesh.position.z += 1.2
    this.scene.add(mesh)
    this.shockwaves.push({ mesh, age: 0, life: 1.1 })
  }

  private lerpColors(delta: number) {
    const amount = Math.min(1, delta * 1.25)
    this.currentColors.background.lerp(this.targetColors.background, amount)
    this.currentColors.primary.lerp(this.targetColors.primary, amount)
    this.currentColors.secondary.lerp(this.targetColors.secondary, amount)
    this.currentColors.accent.lerp(this.targetColors.accent, amount)
    this.currentColors.fog.lerp(this.targetColors.fog, amount)
  }

  private makeColorSet(mood: MoodProfile) {
    return {
      background: new Color(mood.background),
      primary: new Color(mood.primary),
      secondary: new Color(mood.secondary),
      accent: new Color(mood.accent),
      fog: new Color(mood.fog),
    }
  }

  private bindEvents() {
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove)
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown)
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('resize', this.resize)
  }

  private unbindEvents() {
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove)
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown)
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('resize', this.resize)
  }

  private handlePointerMove = (event: PointerEvent) => {
    this.updatePointer(event.clientX, event.clientY)
    this.pointerEnergy = Math.min(1.4, this.pointerEnergy + 0.12)
    this.lastInteraction = performance.now()

    if (this.lastInteraction - this.lastTrail > 24) {
      this.addTrail()
      this.lastTrail = this.lastInteraction
    }
  }

  private handlePointerDown = (event: PointerEvent) => {
    this.updatePointer(event.clientX, event.clientY)
    this.pointerEnergy = 1.5
    this.keyboardEnergy = Math.min(1.4, this.keyboardEnergy + 0.28)
    this.lastInteraction = performance.now()
    this.addShockwave()
  }

  private handleKeyDown = () => {
    this.keyboardEnergy = Math.min(1.4, this.keyboardEnergy + 0.2)
    this.lastInteraction = performance.now()
  }

  private updatePointer(clientX: number, clientY: number) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 2 - 1
    const y = -(((clientY - rect.top) / rect.height) * 2 - 1)
    this.pointer.set(x, y)

    const height = 2 * Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.position.z
    const width = height * this.camera.aspect
    this.pointerWorld.set(x * width * 0.5, y * height * 0.5, 0)
  }

  private resize = () => {
    const width = Math.max(1, this.container.clientWidth)
    const height = Math.max(1, this.container.clientHeight)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY[this.quality].pixelRatio))
    this.renderer.setSize(width, height, false)
    this.composer.setSize(width, height)
    this.bloomPass.setSize(width, height)
    this.particleMaterial.uniforms.uPixelRatio.value = Math.min(
      window.devicePixelRatio || 1,
      QUALITY[this.quality].pixelRatio,
    )
  }
}

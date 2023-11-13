import * as THREE from 'three'
import { three } from './core/Three'
import fragmentShader from './shader/screen.fs'
import vertexShader from './shader/screen.vs'
import gsap from 'gsap'

type Asset = { name: string; loader: () => Promise<any>; data?: any }

export class Canvas {
  private plane!: THREE.Mesh<THREE.PlaneGeometry, THREE.RawShaderMaterial>
  private assets!: Asset[]
  private images: { texture: THREE.Texture; coveredScale: [number, number] }[] = []

  constructor(canvas: HTMLCanvasElement) {
    this.load().then((assets) => {
      this.assets = assets
      this.init(canvas)
      this.plane = this.createPlane()
      this.createRepeatAnimation()
      three.animation(this.anime)
    })
  }

  private async load() {
    const result: Asset[] = [
      { name: 'image1', loader: () => this.loadTexture('image1.webp') },
      { name: 'image2', loader: () => this.loadTexture('image2.webp') },
      { name: 'image3', loader: () => this.loadTexture('image3.webp') },
      { name: 'env', loader: () => this.loadCubeTexture() },
    ]

    await Promise.all(
      result.map(async (obj) => {
        obj.data = await obj.loader()
      }),
    )

    return result
  }

  private async loadTexture(file: string) {
    const loader = new THREE.TextureLoader()
    loader.setPath(import.meta.env.BASE_URL)
    const texture = await loader.loadAsync(file)
    texture.wrapS = THREE.MirroredRepeatWrapping
    texture.wrapT = THREE.MirroredRepeatWrapping
    texture.userData.aspect = texture.source.data.width / texture.source.data.height
    return texture
  }

  private async loadCubeTexture() {
    const loader = new THREE.CubeTextureLoader()
    loader.setPath(import.meta.env.BASE_URL + 'env/')
    const texture = await loader.loadAsync(['px.webp', 'nx.webp', 'py.webp', 'ny.webp', 'pz.webp', 'nz.webp'])
    texture.colorSpace = THREE.NoColorSpace
    return texture
  }

  private init(canvas: HTMLCanvasElement) {
    three.setup(canvas)
    three.scene.background = new THREE.Color('#0a0a0a')

    three.camera.position.z = 1.8
    three.controls.enableDamping = true
    three.controls.dampingFactor = 0.15
    three.controls.enablePan = false
    three.controls.enableZoom = false
    three.controls.minPolarAngle = Math.PI * 0.3
    three.controls.maxPolarAngle = Math.PI * 0.7
    three.controls.minAzimuthAngle = -Math.PI * 0.2
    three.controls.maxAzimuthAngle = Math.PI * 0.2
  }

  private getAsset<T>(fileName: string) {
    return this.assets.find(({ name }) => name === fileName)!.data as T
  }

  private createPlane() {
    const image1 = this.getAsset<THREE.Texture>('image1')
    const image2 = this.getAsset<THREE.Texture>('image2')
    const image3 = this.getAsset<THREE.Texture>('image3')

    this.images.push({ texture: image1, coveredScale: three.coveredScale(image1.userData.aspect, 16 / 9) })
    this.images.push({ texture: image2, coveredScale: three.coveredScale(image2.userData.aspect, 16 / 9) })
    this.images.push({ texture: image3, coveredScale: three.coveredScale(image3.userData.aspect, 16 / 9) })

    const geometry = new THREE.PlaneGeometry(1.6, 0.9)
    const material = new THREE.RawShaderMaterial({
      uniforms: {
        uCurrent: { value: { unit: this.images[0].texture, coveredScale: this.images[0].coveredScale } },
        uNext: { value: { unit: this.images[1].texture, coveredScale: this.images[1].coveredScale } },
        tEnv: { value: this.getAsset<THREE.CubeTexture>('env') },
        uTime: { value: 0 },
        uProgress: { value: 0 },
      },
      vertexShader,
      fragmentShader,
    })
    const mesh = new THREE.Mesh(geometry, material)
    three.scene.add(mesh)

    return mesh
  }

  private createRepeatAnimation() {
    const uniforms = this.plane.material.uniforms
    let repeatCount = 0

    gsap.to(uniforms.uProgress, {
      value: 1,
      duration: 3,
      ease: 'power2.inOut',
      delay: 6,
      repeatDelay: 6,
      repeat: -1,
      onRepeat: () => {
        repeatCount++
        const current = this.images[repeatCount % this.images.length]
        const next = this.images[(repeatCount + 1) % this.images.length]
        uniforms.uCurrent.value.unit = current.texture
        uniforms.uCurrent.value.coveredScale = current.coveredScale
        uniforms.uNext.value.unit = next.texture
        uniforms.uNext.value.coveredScale = next.coveredScale
      },
    })
  }

  private anime = () => {
    three.controls.update()
    this.plane.material.uniforms.uTime.value += three.time.delta
    three.render()
  }

  dispose() {
    three.dispose()
  }
}

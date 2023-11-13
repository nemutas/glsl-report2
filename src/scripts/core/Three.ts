import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

class Three {
  public time = { delta: 0, elapsed: 0 }
  public counter = 0

  private _renderer?: THREE.WebGLRenderer
  private _scene?: THREE.Scene
  private _camera?: THREE.PerspectiveCamera
  private _controls?: OrbitControls
  private clock = new THREE.Clock()
  private abortController = new AbortController()
  private shouldDisposedObjects: any[] = []
  private fps = document.querySelector<HTMLElement>('.fps')

  setup(canvas: HTMLCanvasElement) {
    this._renderer = this.createRenderer(canvas)
    this._scene = this.createScene()
    this._camera = this.createCamera()
    this.createEvents()
  }

  private createRenderer(canvas: HTMLCanvasElement) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    return renderer
  }

  private createScene() {
    const scene = new THREE.Scene()
    return scene
  }

  private createCamera() {
    // const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10)
    const camera = new THREE.PerspectiveCamera(40, this.size.aspect, 0.01, 10)
    camera.position.z = 1
    return camera
  }

  private createEvents() {
    this.addEventListener('resize', () => {
      const { innerWidth: width, innerHeight: height } = window
      this.renderer.setSize(width, height)
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
    })
  }

  get size() {
    const { width, height } = this.renderer.domElement
    return { width, height, aspect: width / height }
  }

  get renderer() {
    if (this._renderer) return this._renderer
    else throw new Error('renderer is not defined')
  }

  get scene() {
    if (this._scene) return this._scene
    else throw new Error('scene is not defined')
  }

  get camera() {
    if (this._camera) return this._camera
    else throw new Error('camera is not defined')
  }

  get controls() {
    if (!this._controls) {
      this._controls = new OrbitControls(this.camera, this.renderer.domElement)
    }
    return this._controls
  }

  addEventListener<K extends keyof WindowEventMap>(type: K, listener: (this: Window, ev: WindowEventMap[K]) => any, options?: AddEventListenerOptions) {
    window.addEventListener(type, listener, { ...options, signal: this.abortController.signal })
  }

  addDisposableObject(...obj: any[]) {
    obj.forEach((o) => {
      if (o.dispose && typeof o.dispose === 'function') {
        this.shouldDisposedObjects.push(o)
      }
    })
  }

  coveredScale(imageAspect: number, screenAspect?: number): [number, number] {
    const aspect = screenAspect ?? three.size.aspect
    if (aspect < imageAspect) return [aspect / imageAspect, 1]
    else return [1, imageAspect / aspect]
  }

  animation(anime: (() => void) | null) {
    if (anime) {
      this.renderer.setAnimationLoop(() => {
        this.time.delta = this.clock.getDelta()
        this.time.elapsed = this.clock.getElapsedTime()

        this.counter++
        if (this.fps && this.counter % 10 === 0) {
          this.fps.innerText = (1 / three.time.delta).toFixed(0)
        }

        anime()
      })
    } else {
      this.renderer.setAnimationLoop(null)
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.animation(null)
    this.shouldDisposedObjects.forEach((o) => o.dispose())
    this.renderer.dispose()
    this.abortController.abort()
  }
}

export const three = new Three()

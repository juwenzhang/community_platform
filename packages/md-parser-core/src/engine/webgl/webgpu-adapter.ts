/**
 * WebGPU 适配层
 *
 * 优先使用 WebGPU（如果浏览器支持），否则降级到 WebGL2。
 * 统一接口，让上层代码不需要关心底层是 WebGPU 还是 WebGL。
 */

export type GPUBackend = 'webgpu' | 'webgl2' | 'webgl';

// WebGPU 类型在大多数环境尚未内置，使用 unknown 兜底避免编译报错
// 运行时通过 feature detection 安全访问
export interface GPUContext {
  backend: GPUBackend;
  canvas: HTMLCanvasElement;
  gl?: WebGL2RenderingContext | WebGLRenderingContext;
  gpuDevice?: unknown;
  gpuContext?: unknown;
}

/**
 * 检测最佳可用的 GPU 后端
 */
export async function detectBestBackend(): Promise<GPUBackend> {
  // 1. 尝试 WebGPU（运行时 feature detection，类型不内置）
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      const gpu = (navigator as unknown as Record<string, any>).gpu;
      const adapter = await gpu.requestAdapter();
      if (adapter) {
        const device = await adapter.requestDevice();
        device.destroy(); // 只是检测，不真正使用
        return 'webgpu';
      }
    } catch {
      // WebGPU 不可用
    }
  }

  // 2. 尝试 WebGL2
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      if (canvas.getContext('webgl2')) {
        return 'webgl2';
      }
    } catch {
      // WebGL2 不可用
    }
  }

  // 3. 降级到 WebGL1
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      if (canvas.getContext('webgl')) {
        return 'webgl';
      }
    } catch {
      // WebGL 不可用
    }
  }

  return 'webgl'; // 最低兜底
}

/**
 * 初始化 GPU 上下文
 */
export async function createGPUContext(
  canvas: HTMLCanvasElement,
  preferredBackend?: GPUBackend,
): Promise<GPUContext> {
  const backend = preferredBackend ?? (await detectBestBackend());

  if (backend === 'webgpu') {
    const gpu = (navigator as unknown as Record<string, any>).gpu;
    const adapter = await gpu.requestAdapter();
    if (!adapter) throw new Error('WebGPU adapter not available');

    const device = await adapter.requestDevice();
    const gpuContext = canvas.getContext('webgpu') as unknown;
    if (!gpuContext) throw new Error('WebGPU canvas context not available');

    (gpuContext as any).configure({
      device,
      format: gpu.getPreferredCanvasFormat(),
      alphaMode: 'premultiplied',
    });

    return { backend: 'webgpu', canvas, gpuDevice: device, gpuContext };
  }

  // WebGL2 / WebGL fallback
  const glVersion = backend === 'webgl2' ? 'webgl2' : 'webgl';
  const gl = canvas.getContext(glVersion, {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
  }) as WebGL2RenderingContext | WebGLRenderingContext | null;

  if (!gl) {
    throw new Error(`${glVersion} context not available`);
  }

  return { backend, canvas, gl };
}

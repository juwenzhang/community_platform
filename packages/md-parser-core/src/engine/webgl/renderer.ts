/**
 * WebGL 文本渲染器
 *
 * 使用 instanced draw call 批量绘制所有字符。
 * 每个字符一个 quad（两个三角形），通过 instance attribute 传递：
 * - 字符位置 (x, y)
 * - 字形在 atlas 中的 UV 坐标
 * - 字形大小
 * - 颜色
 */

export interface CharInstance {
  x: number;
  y: number;
  u: number;
  v: number;
  uWidth: number;
  vHeight: number;
  width: number;
  height: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

// SDF fragment shader
const SDF_FRAG_SOURCE = `
  precision mediump float;
  uniform sampler2D u_atlas;
  varying vec2 v_uv;
  varying vec4 v_color;

  void main() {
    float dist = texture2D(u_atlas, v_uv).r;
    float alpha = smoothstep(0.4, 0.6, dist) * v_color.a;
    gl_FragColor = vec4(v_color.rgb, alpha);
  }
`;

// Instanced vertex shader
const INSTANCED_VERT_SOURCE = `
  attribute vec2 a_position;       // quad 顶点 (0,0)-(1,1)
  attribute vec2 a_instancePos;    // 字符位置
  attribute vec4 a_instanceUV;     // atlas UV (u, v, uWidth, vHeight)
  attribute vec2 a_instanceSize;   // 字符渲染尺寸
  attribute vec4 a_instanceColor;  // 颜色

  uniform vec2 u_resolution;
  uniform float u_scrollY;

  varying vec2 v_uv;
  varying vec4 v_color;

  void main() {
    vec2 pos = a_instancePos + a_position * a_instanceSize;
    pos.y -= u_scrollY;

    // 转换到 clip space (-1 ~ 1)
    vec2 clipPos = (pos / u_resolution) * 2.0 - 1.0;
    clipPos.y = -clipPos.y; // Y 轴翻转

    gl_Position = vec4(clipPos, 0.0, 1.0);

    // UV 插值
    v_uv = a_instanceUV.xy + a_position * a_instanceUV.zw;
    v_color = a_instanceColor;
  }
`;

export class WebGLTextRenderer {
  private gl: WebGL2RenderingContext | WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private instanceBuffer: WebGLBuffer | null = null;
  private maxInstances = 10000;
  private instanceData: Float32Array;

  constructor(gl: WebGL2RenderingContext | WebGLRenderingContext) {
    this.gl = gl;
    this.instanceData = new Float32Array(this.maxInstances * 12); // 12 floats per instance
    this.initShaders();
  }

  /**
   * 上传字符实例数据并绘制
   */
  draw(instances: CharInstance[], atlasTexture: WebGLTexture, scrollY: number): void {
    const gl = this.gl;
    if (!this.program) return;

    gl.useProgram(this.program);

    // 设置 uniform
    const resLoc = gl.getUniformLocation(this.program, 'u_resolution');
    gl.uniform2f(resLoc, gl.canvas.width, gl.canvas.height);

    const scrollLoc = gl.getUniformLocation(this.program, 'u_scrollY');
    gl.uniform1f(scrollLoc, scrollY);

    // 绑定 atlas 纹理
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
    const atlasLoc = gl.getUniformLocation(this.program, 'u_atlas');
    gl.uniform1i(atlasLoc, 0);

    // 上传实例数据
    const count = Math.min(instances.length, this.maxInstances);
    for (let i = 0; i < count; i++) {
      const inst = instances[i];
      const offset = i * 12;
      this.instanceData[offset] = inst.x;
      this.instanceData[offset + 1] = inst.y;
      this.instanceData[offset + 2] = inst.u;
      this.instanceData[offset + 3] = inst.v;
      this.instanceData[offset + 4] = inst.uWidth;
      this.instanceData[offset + 5] = inst.vHeight;
      this.instanceData[offset + 6] = inst.width;
      this.instanceData[offset + 7] = inst.height;
      this.instanceData[offset + 8] = inst.r;
      this.instanceData[offset + 9] = inst.g;
      this.instanceData[offset + 10] = inst.b;
      this.instanceData[offset + 11] = inst.a;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.instanceData.subarray(0, count * 12));

    // instanced draw call
    if (gl instanceof WebGL2RenderingContext) {
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    }
  }

  destroy(): void {
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);
    if (this.instanceBuffer) gl.deleteBuffer(this.instanceBuffer);
  }

  // ─── 内部方法 ────────────────────

  private initShaders(): void {
    const gl = this.gl;

    const vertShader = this.compileShader(gl.VERTEX_SHADER, INSTANCED_VERT_SOURCE);
    const fragShader = this.compileShader(gl.FRAGMENT_SHADER, SDF_FRAG_SOURCE);
    if (!vertShader || !fragShader) return;

    this.program = gl.createProgram();
    if (!this.program) return;

    gl.attachShader(this.program, vertShader);
    gl.attachShader(this.program, fragShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('WebGL program link failed:', gl.getProgramInfoLog(this.program));
      this.program = null;
      return;
    }

    // 创建 instance buffer
    this.instanceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.byteLength, gl.DYNAMIC_DRAW);
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('WebGL shader compile failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }
}

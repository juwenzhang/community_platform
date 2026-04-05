/**
 * 渲染引擎入口
 *
 * 提供 createRenderEngine() 工厂函数，根据文档复杂度自动选择渲染策略。
 * 支持手动指定策略和自动降级。
 */
import type { RenderEngineOptions, RenderLevel, RenderStrategy } from '../types/engine';
import type { ParseResult } from '../types/result';
import { CanvasStrategy } from './canvas';
import { detectRenderLevel, fallbackLevel } from './detect';
import { DomStrategy } from './dom-strategy';
import { VirtualListStrategy } from './virtual-list-strategy';
import { WebGLStrategy } from './webgl';

export { CanvasStrategy } from './canvas';
export {
  computeComplexity,
  computeComplexityScore,
  detectRenderLevel,
  fallbackLevel,
  isLevelSupported,
} from './detect';
export { DomStrategy } from './dom-strategy';
export { VirtualListStrategy } from './virtual-list-strategy';
export { WebGLStrategy } from './webgl';

/**
 * 根据渲染级别创建对应的渲染策略
 */
function createStrategy(level: RenderLevel, options?: RenderEngineOptions): RenderStrategy {
  switch (level) {
    case 'dom':
      return new DomStrategy();
    case 'virtual-list':
      return new VirtualListStrategy({
        bufferSize: options?.virtualListBuffer,
      });
    case 'canvas':
      return new CanvasStrategy();
    case 'webgl':
      return new WebGLStrategy();
  }
}

/**
 * 创建渲染引擎
 *
 * 根据 ParseResult 的文档复杂度自动选择最优策略。
 * 如果检测到的策略不被当前环境支持，自动降级到下一级。
 *
 * @example
 * ```ts
 * const engine = createRenderEngine(result);
 * engine.strategy.mount(container, result);
 *
 * // 内容更新时
 * engine.strategy.update(newResult);
 *
 * // 卸载
 * engine.strategy.unmount();
 * ```
 */
export function createRenderEngine(
  result: ParseResult,
  options?: RenderEngineOptions,
): { strategy: RenderStrategy; level: RenderLevel; detectedLevel: RenderLevel } {
  const detectedLevel = detectRenderLevel(result, options);

  // 确保策略可用（自动降级）
  const actualLevel = fallbackLevel(options?.forceLevel ?? detectedLevel);

  const strategy = createStrategy(actualLevel, options);

  return {
    strategy,
    level: actualLevel,
    detectedLevel,
  };
}

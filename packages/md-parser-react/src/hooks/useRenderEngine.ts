import type {
  ParseResult,
  RenderEngineOptions,
  RenderLevel,
  RenderStrategy,
} from '@luhanxin/md-parser-core';
import { createRenderEngine } from '@luhanxin/md-parser-core';
import { useEffect, useRef, useState } from 'react';

export interface UseRenderEngineResult {
  /** 当前渲染级别 */
  level: RenderLevel;
  /** 检测到的渲染级别（可能被降级） */
  detectedLevel: RenderLevel;
  /** 渲染策略实例 */
  strategy: RenderStrategy | null;
}

/**
 * 渲染引擎 Hook
 *
 * 根据 ParseResult 的文档复杂度自动选择渲染策略（DOM / 虚拟列表 / Canvas / WebGL）。
 * 当策略不被当前环境支持时自动降级。
 */
export function useRenderEngine(
  containerRef: React.RefObject<HTMLElement | null>,
  parseResult: ParseResult | null,
  options?: RenderEngineOptions,
): UseRenderEngineResult {
  const [result, setResult] = useState<UseRenderEngineResult>({
    level: 'dom',
    detectedLevel: 'dom',
    strategy: null,
  });
  const strategyRef = useRef<RenderStrategy | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !parseResult) return;

    // 卸载旧策略
    strategyRef.current?.unmount();

    // 创建新策略
    const engine = createRenderEngine(parseResult, options);
    strategyRef.current = engine.strategy;

    setResult({
      level: engine.level,
      detectedLevel: engine.detectedLevel,
      strategy: engine.strategy,
    });

    // 挂载
    engine.strategy.mount(container, parseResult);

    return () => {
      strategyRef.current?.unmount();
      strategyRef.current = null;
    };
  }, [containerRef, parseResult, options]);

  // 内容更新时调用 update 而非重新 mount
  useEffect(() => {
    if (parseResult && strategyRef.current) {
      strategyRef.current.update(parseResult);
    }
  }, [parseResult]);

  return result;
}

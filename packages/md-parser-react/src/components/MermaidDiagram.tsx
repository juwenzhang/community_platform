import DOMPurify from 'dompurify';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface MermaidDiagramProps {
  /** Mermaid 代码 */
  code: string;
  /** 图表 ID（用于错误提示） */
  id?: string;
}

/**
 * Mermaid 图表组件
 * 支持 loading/error 状态，超时回退
 */
export function MermaidDiagram({ code, id = 'mermaid' }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // 使用 DOMPurify 清理 SVG（防止 XSS）
  const sanitizedSvg = useMemo(() => DOMPurify.sanitize(svg), [svg]);

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      try {
        setLoading(true);
        setError('');

        // 动态加载 mermaid（延迟加载）
        const mermaid = await import('mermaid');
        mermaid.default.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
        });

        // 超时机制（5秒）
        const timeout = setTimeout(() => {
          if (!cancelled) {
            setError('图表渲染超时');
            setLoading(false);
          }
        }, 5000);

        const { svg } = await mermaid.default.render(`${id}-${Date.now()}`, code);
        clearTimeout(timeout);

        if (!cancelled) {
          setSvg(svg);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          setError(`图表渲染失败: ${message}`);
          setLoading(false);
        }
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [code, id]);

  if (loading) {
    return (
      <div className="mermaidLoading">
        <div className="mermaidSpinner" />
        <span>正在渲染图表...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mermaidError">
        <span className="mermaidErrorIcon">⚠️</span>
        <span className="mermaidErrorText">{error}</span>
        <pre className="mermaidErrorCode">{code}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaidDiagram"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG 已通过 DOMPurify 清理
      dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
    />
  );
}

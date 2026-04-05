import { useRef, useState } from 'react';

export interface CodeBlockProps {
  /** 代码内容 */
  code: string;
  /** 编程语言 */
  language?: string;
  /** 是否显示行号 */
  showLineNumbers?: boolean;
  /** 高亮后的 HTML（来自 Shiki） */
  highlightedHtml?: string;
}

/**
 * 代码块组件
 * 支持语言标签、行号、复制按钮
 */
export function CodeBlock({
  code,
  language,
  showLineNumbers = false,
  highlightedHtml,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const lines = code.split('\n');

  return (
    <div className="code-block-wrapper">
      {language && <span className="code-block-lang">{language}</span>}
      <pre ref={preRef} className={highlightedHtml ? 'shiki' : ''}>
        {highlightedHtml ? (
          <code
            // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML 来自 core 渲染管线，已通过 rehype-sanitize 清理
            dangerouslySetInnerHTML={{ __html: highlightedHtml ?? '' }}
          />
        ) : showLineNumbers ? (
          <code>
            {lines.map((line, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: 代码行顺序固定，不会重排序
              <div key={`line-${i}`} className="code-line">
                <span className="line-number">{i + 1}</span>
                <span className="line-content">{line}</span>
              </div>
            ))}
          </code>
        ) : (
          <code>{code}</code>
        )}
      </pre>
      <button
        type="button"
        className="code-block-copy"
        onClick={handleCopy}
        aria-label={copied ? '已复制' : '复制代码'}
      >
        {copied ? '✓' : '📋'}
      </button>
    </div>
  );
}

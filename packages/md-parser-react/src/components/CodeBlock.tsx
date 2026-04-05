import DOMPurify from 'dompurify';
import { useMemo, useRef, useState } from 'react';

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

  // 使用 DOMPurify 清理高亮 HTML（防止 XSS）
  const sanitizedHighlightedHtml = useMemo(
    () => (highlightedHtml ? DOMPurify.sanitize(highlightedHtml) : ''),
    [highlightedHtml],
  );

  // 生成稳定的行 key
  const lineKeys = useMemo(() => lines.map((_, i) => `line-${i}`), [lines]);

  return (
    <div className="codeBlockWrapper">
      {language && <span className="codeBlockLanguage">{language}</span>}
      <pre ref={preRef} className={highlightedHtml ? 'shiki' : ''}>
        {highlightedHtml ? (
          <code
            // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML 已通过 DOMPurify 清理
            dangerouslySetInnerHTML={{ __html: sanitizedHighlightedHtml }}
          />
        ) : showLineNumbers ? (
          <code>
            {lines.map((line, i) => (
              <div key={lineKeys[i]} className="codeLine">
                <span className="lineNumber">{i + 1}</span>
                <span className="lineContent">{line}</span>
              </div>
            ))}
          </code>
        ) : (
          <code>{code}</code>
        )}
      </pre>
      <button
        type="button"
        className="copyButton"
        onClick={handleCopy}
        aria-label={copied ? '已复制' : '复制代码'}
      >
        {copied ? '✓' : '📋'}
      </button>
    </div>
  );
}

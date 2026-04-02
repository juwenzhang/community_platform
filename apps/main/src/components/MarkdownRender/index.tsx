import { MarkdownHooks } from 'react-markdown';
// import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
// import rehypeStarryNight from 'rehype-starry-night';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import CopyableCodeBlock from '@/components/CopyableCodeBlock/CopyableCodeBlock';

interface MarkdownRenderProps {
  content: string;
}

export default function MarkdownRender(props: MarkdownRenderProps) {
  const { content } = props;
  return (
    <MarkdownHooks
      remarkPlugins={[remarkGfm, remarkBreaks]}
      rehypePlugins={[rehypeSlug]}
      components={{
        code(props) {
          const { className, children, ...rest } = props;
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';
          const value = String(children).replace(/\n$/, '');
          if (language) {
            return <CopyableCodeBlock language={language} value={value} />;
          }
          return (
            <code className={className} {...rest}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </MarkdownHooks>
  );
}

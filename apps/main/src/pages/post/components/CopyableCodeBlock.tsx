import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Props {
  language: string;
  value: string;
}

export default function CopyableCodeBlock({ language, value }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ position: 'relative', margin: '16px 0' }}>
      <SyntaxHighlighter
        language={language}
        style={atomDark}
        customStyle={{
          borderRadius: '8px',
          padding: '16px',
          fontSize: '14px',
        }}
      >
        {value}
      </SyntaxHighlighter>

      <Button
        type="text"
        shape="circle"
        icon={copied ? <CheckOutlined /> : <CopyOutlined />}
        onClick={handleCopy}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          color: copied ? '#52c41a' : '#fff',
          background: 'rgba(0,0,0,0.4)',
        }}
      />
    </div>
  );
}

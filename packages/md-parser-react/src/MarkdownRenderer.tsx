import type { ArticleMeta, TocItem } from '@luhanxin/md-parser-core';
import DOMPurify from 'dompurify';
import React, { useCallback, useMemo, useRef } from 'react';
import { useMarkdown } from './hooks/useMarkdown';

/**
 * 图片上传处理函数类型
 * @param file 图片文件
 * @returns 图片 URL 或 Promise<string>
 */
export type ImageUploadHandler = (file: File) => string | Promise<string>;

export interface MarkdownRendererProps {
  /** Markdown 内容 */
  content: string;
  /** 自定义类名 */
  className?: string;
  /** TOC 提取完成回调 */
  onTocReady?: (toc: TocItem[]) => void;
  /** 元数据提取完成回调 */
  onMetaReady?: (meta: ArticleMeta) => void;
  /** 图片上传处理（企业级功能） */
  onImageUpload?: ImageUploadHandler;
  /** 是否启用图片粘贴上传（默认 true） */
  enableImagePaste?: boolean;
  /** 图片上传前的校验函数 */
  validateImage?: (file: File) => boolean | string;
  /** 图片上传成功后的回调 */
  onImageUploaded?: (url: string, file: File) => void;
  /** 图片上传失败回调 */
  onImageUploadError?: (error: Error, file: File) => void;
  /** 是否添加水印（企业级功能） */
  watermark?: {
    text?: string;
    opacity?: number;
    fontSize?: number;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  };
}

/**
 * React Markdown 渲染组件
 * 支持图片粘贴上传、水印等企业级功能
 */
export function MarkdownRenderer({
  content,
  className,
  onTocReady,
  onMetaReady,
  onImageUpload,
  enableImagePaste = true,
  validateImage,
  onImageUploaded,
  onImageUploadError,
  watermark,
}: MarkdownRendererProps) {
  const { html, toc, meta, loading, error } = useMarkdown(content);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 使用 DOMPurify 二次清理 HTML（双重防护）
  // 第一层：md-parser-core 中的 rehype-sanitize
  // 第二层：React 端的 DOMPurify
  const sanitizedHtml = useMemo(() => DOMPurify.sanitize(html), [html]);

  // 默认图片校验
  const defaultValidateImage = useCallback((file: File): boolean | string => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return '不支持的图片格式，仅支持 JPG/PNG/GIF/WEBP';
    }

    if (file.size > maxSize) {
      return '图片大小不能超过 5MB';
    }

    return true;
  }, []);

  // 图片上传处理
  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!onImageUpload) {
        console.warn('onImageUpload handler not provided');
        return;
      }

      // 校验图片
      const validator = validateImage || defaultValidateImage;
      const validationResult = validator(file);
      if (validationResult !== true) {
        const errorMsg = typeof validationResult === 'string' ? validationResult : '图片校验失败';
        onImageUploadError?.(new Error(errorMsg), file);
        return;
      }

      try {
        // 添加水印（如果有）
        let processedFile = file;
        if (watermark) {
          processedFile = await addWatermark(file, watermark);
        }

        // 上传图片
        const url = await onImageUpload(processedFile);
        onImageUploaded?.(url, file);

        // TODO: 插入图片到编辑器（需要编辑器支持）
        // 如果是预览模式，不需要插入
        console.log('Image uploaded:', url);
      } catch (err: any) {
        onImageUploadError?.(err, file);
      }
    },
    [
      onImageUpload,
      validateImage,
      defaultValidateImage,
      watermark,
      onImageUploaded,
      onImageUploadError,
    ],
  );

  // 监听粘贴事件
  React.useEffect(() => {
    if (!enableImagePaste || !containerRef.current) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await handleImageUpload(file);
          }
          break;
        }
      }
    };

    const container = containerRef.current;
    container.addEventListener('paste', handlePaste);

    return () => {
      container.removeEventListener('paste', handlePaste);
    };
  }, [enableImagePaste, handleImageUpload]);

  // 文件选择处理
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await handleImageUpload(file);
        // 重置 input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [handleImageUpload],
  );

  React.useEffect(() => {
    if (toc.length > 0 && onTocReady) {
      onTocReady(toc);
    }
  }, [toc, onTocReady]);

  React.useEffect(() => {
    if (meta && onMetaReady) {
      onMetaReady(meta);
    }
  }, [meta, onMetaReady]);

  if (loading) {
    return <div className="markdown-skeleton">Loading...</div>;
  }

  if (error) {
    return <div className="markdown-error">{error}</div>;
  }

  return (
    <>
      {/* 隐藏的文件上传 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <div
        ref={containerRef}
        className={`markdown-body ${className || ''}`}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML 已通过 rehype-sanitize 和 DOMPurify 双重清理
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        tabIndex={-1} // 允许 div 获得焦点以支持粘贴
      />
    </>
  );
}

/**
 * 添加水印（Canvas 实现）
 */
async function addWatermark(
  file: File,
  options: NonNullable<MarkdownRendererProps['watermark']>,
): Promise<File> {
  const { text = '', opacity = 0.3, fontSize = 16, position = 'bottom-right' } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      // 绘制原图
      ctx.drawImage(img, 0, 0);

      // 绘制水印
      ctx.globalAlpha = opacity;
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 1;

      const padding = 10;
      const textWidth = ctx.measureText(text).width;
      const textHeight = fontSize;

      let x: number, y: number;
      switch (position) {
        case 'top-left':
          x = padding;
          y = padding + textHeight;
          break;
        case 'top-right':
          x = canvas.width - textWidth - padding;
          y = padding + textHeight;
          break;
        case 'bottom-left':
          x = padding;
          y = canvas.height - padding;
          break;
        case 'bottom-right':
          x = canvas.width - textWidth - padding;
          y = canvas.height - padding;
          break;
        case 'center':
          x = (canvas.width - textWidth) / 2;
          y = (canvas.height + textHeight) / 2;
          break;
      }

      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);

      // 转换为 Blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          const watermarkedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve(watermarkedFile);
        },
        file.type,
        0.92,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

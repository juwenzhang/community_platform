<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import {
  renderMarkdown,
  extractToc,
  extractPlainText,
  extractMeta,
  parseMarkdownToAst,
} from '@luhanxin/md-parser-core';
import type { TocItem, ArticleMeta } from '@luhanxin/md-parser-core';

/**
 * 图片上传处理函数类型
 */
export type ImageUploadHandler = (file: File) => string | Promise<string>;

/**
 * 水印配置
 */
export interface WatermarkOptions {
  text?: string;
  opacity?: number;
  fontSize?: number;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
}

const props = withDefaults(
  defineProps<{
    /** Markdown 内容 */
    content: string;
    /** 自定义类名 */
    className?: string;
    /** 是否启用图片粘贴上传 */
    enableImagePaste?: boolean;
    /** 图片上传前的校验函数 */
    validateImage?: (file: File) => boolean | string;
    /** 是否添加水印 */
    watermark?: WatermarkOptions;
  }>(),
  {
    enableImagePaste: true,
  }
);

const emit = defineEmits<{
  (e: 'toc-ready', toc: TocItem[]): void;
  (e: 'meta-ready', meta: ArticleMeta): void;
  (e: 'image-upload', file: File): Promise<string>;
  (e: 'image-uploaded', url: string, file: File): void;
  (e: 'image-upload-error', error: Error, file: File): void;
}>();

const html = ref('');
const toc = ref<TocItem[]>([]);
const meta = ref<ArticleMeta | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

// 默认图片校验
const defaultValidateImage = (file: File): boolean | string => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return '不支持的图片格式，仅支持 JPG/PNG/GIF/WEBP';
  }

  if (file.size > maxSize) {
    return '图片大小不能超过 5MB';
  }

  return true;
};

// 添加水印
const addWatermark = async (
  file: File,
  options: WatermarkOptions
): Promise<File> => {
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
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};

// 图片上传处理
const handleImageUpload = async (file: File) => {
  // 校验图片
  const validator = props.validateImage || defaultValidateImage;
  const validationResult = validator(file);
  if (validationResult !== true) {
    const errorMsg = typeof validationResult === 'string' ? validationResult : '图片校验失败';
    emit('image-upload-error', new Error(errorMsg), file);
    return;
  }

  try {
    // 添加水印（如果有）
    let processedFile = file;
    if (props.watermark) {
      processedFile = await addWatermark(file, props.watermark);
    }

    // 上传图片（调用父组件提供的上传函数）
    const url = await emit('image-upload', processedFile);
    emit('image-uploaded', url, file);

    // TODO: 插入图片到编辑器（需要编辑器支持）
    console.log('Image uploaded:', url);
  } catch (err: any) {
    emit('image-upload-error', err, file);
  }
};

// 监听粘贴事件
onMounted(() => {
  if (!props.enableImagePaste || !containerRef.value) return;

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

  const container = containerRef.value;
  container.addEventListener('paste', handlePaste);

  // 清理
  return () => {
    container.removeEventListener('paste', handlePaste);
  };
});

// 文件选择处理
const handleFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    await handleImageUpload(file);
    // 重置 input
    if (fileInputRef.value) {
      fileInputRef.value.value = '';
    }
  }
};

const parse = async () => {
  if (!props.content) {
    html.value = '';
    toc.value = [];
    meta.value = null;
    loading.value = false;
    error.value = null;
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    // 渲染 HTML
    html.value = await renderMarkdown(props.content);

    // 解析 AST
    const ast = await parseMarkdownToAst(props.content);

    // 提取 TOC
    toc.value = extractToc(ast);
    emit('toc-ready', toc.value);

    // 提取纯文本
    const plainText = extractPlainText(ast);

    // 提取元数据
    meta.value = extractMeta(ast, plainText);
    if (meta.value) {
      emit('meta-ready', meta.value);
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to parse markdown';
  } finally {
    loading.value = false;
  }
};

onMounted(parse);
watch(() => props.content, parse);
</script>

<template>
  <div>
    <!-- 隐藏的文件上传 input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png,image/gif,image/webp"
      style="display: none"
      @change="handleFileChange"
    />

    <div v-if="loading" class="markdown-skeleton">
      Loading...
    </div>
    <div v-else-if="error" class="markdown-error">
      {{ error }}
    </div>
    <div
      v-else
      ref="containerRef"
      class="markdown-body"
      :class="className"
      v-html="html"
      tabindex="-1"
    />
  </div>
</template>

<style scoped>
.markdown-skeleton {
  padding: 1rem;
  background: #f5f5f5;
  color: #999;
}

.markdown-error {
  padding: 1rem;
  background: #fff5f5;
  color: #c53030;
  border: 1px solid #fc8181;
  border-radius: 4px;
}

.markdown-body {
  line-height: 1.6;
  word-wrap: break-word;
}

/* 基础 Markdown 样式 */
.markdown-body :deep(h1) {
  font-size: 2em;
  margin: 0.67em 0;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #eaecef;
}

.markdown-body :deep(h2) {
  font-size: 1.5em;
  margin: 1em 0 0.5em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #eaecef;
}

.markdown-body :deep(h3) {
  font-size: 1.25em;
  margin: 1em 0 0.5em;
}

.markdown-body :deep(p) {
  margin: 1em 0;
}

.markdown-body :deep(code) {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
}

.markdown-body :deep(pre) {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 6px;
}

.markdown-body :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.markdown-body :deep(blockquote) {
  padding: 0 1em;
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
  margin: 1em 0;
}

.markdown-body :deep(table) {
  border-spacing: 0;
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.markdown-body :deep(table th),
.markdown-body :deep(table td) {
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
}

.markdown-body :deep(table th) {
  font-weight: 600;
  background-color: #f6f8fa;
}

.markdown-body :deep(table tr:nth-child(2n)) {
  background-color: #f6f8fa;
}

.markdown-body :deep(img) {
  max-width: 100%;
  box-sizing: content-box;
  background-color: #fff;
}

/* 自定义语法样式 */
.markdown-body :deep(.mention) {
  color: #1e80ff;
  font-weight: 500;
  text-decoration: none;
}

.markdown-body :deep(.mention:hover) {
  text-decoration: underline;
}

.markdown-body :deep(.hashtag) {
  color: #1e80ff;
  font-weight: 500;
  text-decoration: none;
}

.markdown-body :deep(.hashtag:hover) {
  text-decoration: underline;
}

.markdown-body :deep(.custom-container) {
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
}

.markdown-body :deep(.custom-container.tip) {
  background-color: #e8f3ff;
  border-left: 4px solid #1e80ff;
}

.markdown-body :deep(.custom-container.warning) {
  background-color: #fff8e6;
  border-left: 4px solid #f59e0b;
}

.markdown-body :deep(.custom-container.info) {
  background-color: #f0f9ff;
  border-left: 4px solid #0ea5e9;
}

.markdown-body :deep(.custom-container.danger) {
  background-color: #fef2f2;
  border-left: 4px solid #ef4444;
}
</style>

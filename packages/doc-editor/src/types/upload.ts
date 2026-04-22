/**
 * 图片上传适配器接口
 *
 * 设计原则：不耦合任何上传实现（Cloudinary / S3 / 自建服务），
 * 全部通过 UploadHandler 由消费方注入。
 *
 * 接口同时支持单文件和多尺寸数组，为未来的 self-hosted-image-pipeline change
 * 的 WebP 多尺寸/水印/LQIP 能力预留。
 */

export interface UploadHandler {
  upload(file: File | File[], opts?: UploadOptions): Promise<UploadResult>;
}

export interface UploadOptions {
  /** 目标文件夹（如 `article-images/{articleId}`）*/
  folder?: string;
  /** 附加元数据，不同适配器自行解释 */
  metadata?: Record<string, unknown>;
}

export interface UploadResult {
  /** 主 URL（默认尺寸或单尺寸）*/
  url: string;
  /** 响应式 srcset 字符串（多尺寸上传时填充）*/
  srcset?: string;
  /** 低质量模糊占位 base64（Low Quality Image Placeholder）*/
  lqip?: string;
  /** 自动生成或用户填写的 alt 文本 */
  alt?: string;
}

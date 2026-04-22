/**
 * 上传 handler — Cloudinary 签名上传适配器
 *
 * 复用 AvatarUpload 的流程：POST /api/v1/upload/sign 取签名 → 直传 Cloudinary
 * 为未来的 self-hosted-image-pipeline change 预留接口（File[] + srcset/lqip）
 */

import type { UploadHandler, UploadOptions, UploadResult } from '../../types/upload';

export interface CloudinaryUploadHandlerOptions {
  /** 签名接口 URL，默认 '/api/v1/upload/sign' */
  getSignatureUrl?: string;
  /** 读取 JWT token（用于 Authorization: Bearer <token>）*/
  getAuthToken: () => string | null | undefined;
  /** 默认 folder，默认 'article-images' */
  defaultFolder?: string;
}

interface SignResponse {
  signature: string;
  timestamp: number;
  cloud_name: string;
  api_key: string;
  folder: string;
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/** 文件大小上限：10 MB */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/**
 * 创建 Cloudinary 上传 handler
 *
 * Phase 2 版本：单文件原图直传，不做转码/多尺寸/水印
 * （后续由 self-hosted-image-pipeline change 升级为完整管线）
 */
export function createCloudinaryUploadHandler(opts: CloudinaryUploadHandlerOptions): UploadHandler {
  const signUrl = opts.getSignatureUrl ?? '/api/v1/upload/sign';
  const defaultFolder = opts.defaultFolder ?? 'article-images';

  async function getSignature(folder: string, token: string): Promise<SignResponse> {
    const res = await fetch(signUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ folder }),
    });
    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const err = await res.json();
        errMsg = (err as { error?: string }).error ?? errMsg;
      } catch {
        // body 不是 JSON
      }
      throw new Error(`获取上传签名失败: ${errMsg}`);
    }
    return res.json() as Promise<SignResponse>;
  }

  async function uploadToCloudinary(file: File, sign: SignResponse): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('signature', sign.signature);
    formData.append('timestamp', String(sign.timestamp));
    formData.append('api_key', sign.api_key);
    formData.append('folder', sign.folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloud_name}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const errMsg =
        (data.error as { message?: string } | undefined)?.message ?? JSON.stringify(data);
      throw new Error(`Cloudinary: ${errMsg}`);
    }
    return data.secure_url as string;
  }

  function validateFile(file: File): void {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error(`不支持的文件类型: ${file.type}`);
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error(`文件过大（${(file.size / 1024 / 1024).toFixed(2)}MB），上限 10MB`);
    }
  }

  return {
    async upload(fileOrFiles: File | File[], options?: UploadOptions): Promise<UploadResult> {
      // 本 change 只支持单文件；File[] 留给 self-hosted-image-pipeline
      if (Array.isArray(fileOrFiles)) {
        throw new Error('Cloudinary handler 当前不支持多尺寸上传，请使用 image-pipeline 适配器');
      }
      const file = fileOrFiles;
      validateFile(file);

      const token = opts.getAuthToken();
      if (!token) {
        throw new Error('未登录，无法上传图片');
      }

      const folder = options?.folder ?? defaultFolder;
      const sign = await getSignature(folder, token);
      const url = await uploadToCloudinary(file, sign);
      return { url };
    },
  };
}

import { CameraOutlined } from '@ant-design/icons';
import { message, Spin } from 'antd';
import { useRef, useState } from 'react';
import styles from './avatarUpload.module.less';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

interface AvatarUploadProps {
  value?: string;
  onChange?: (url: string) => void;
}

async function getUploadSignature(folder: string, token: string) {
  let res: Response;
  try {
    res = await fetch('/api/v1/upload/sign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ folder }),
    });
  } catch {
    throw new Error('无法连接到服务器，请确保后端 Gateway 已启动');
  }
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      errMsg = err.error || errMsg;
    } catch {
      // 响应体不是 JSON
    }
    throw new Error(errMsg);
  }
  return res.json() as Promise<{
    signature: string;
    timestamp: number;
    cloud_name: string;
    api_key: string;
    folder: string;
  }>;
}

async function uploadToCloudinary(
  file: File,
  sign: Awaited<ReturnType<typeof getUploadSignature>>,
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('signature', sign.signature);
  formData.append('timestamp', String(sign.timestamp));
  formData.append('api_key', sign.api_key);
  formData.append('folder', sign.folder);

  let res: Response;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloud_name}/image/upload`, {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new Error('无法连接 Cloudinary，请检查网络');
  }

  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Cloudinary 返回了非 JSON 响应 (HTTP ${res.status})`);
  }

  if (!res.ok) {
    const errMsg = (data.error as { message?: string })?.message || JSON.stringify(data);
    throw new Error(`Cloudinary: ${errMsg}`);
  }

  return data.secure_url as string;
}

/** Cloudinary URL 变换：裁剪为正方形头像 */
function avatarTransform(url: string, size: number): string {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace(
    '/upload/',
    `/upload/w_${size * 2},h_${size * 2},c_fill,g_face,f_auto,q_auto/`,
  );
}

export default function AvatarUpload({ value, onChange }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFile = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      message.error('仅支持 JPEG/PNG/GIF/WebP 格式');
      return;
    }
    if (file.size > MAX_SIZE) {
      message.error('图片大小不能超过 2MB');
      return;
    }

    const token = localStorage.getItem('luhanxin_auth_token');
    if (!token) {
      message.error('请先登录');
      return;
    }

    setUploading(true);
    try {
      const sign = await getUploadSignature('avatars', token);
      const secureUrl = await uploadToCloudinary(file, sign);
      onChange?.(secureUrl);
      message.success('头像上传成功');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const previewUrl = value ? avatarTransform(value, 120) : '';

  return (
    <div className={styles.uploadWrapper}>
      <div
        className={styles.avatarArea}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        role="button"
        tabIndex={0}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="头像" className={styles.preview} />
        ) : (
          <div className={styles.placeholder}>
            <CameraOutlined className={styles.icon} />
            <span>点击上传</span>
          </div>
        )}
        {uploading && (
          <div className={styles.loadingOverlay}>
            <Spin />
          </div>
        )}
      </div>
      <div className={styles.hint}>支持 JPG/PNG/GIF/WebP，不超过 2MB</div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </div>
  );
}

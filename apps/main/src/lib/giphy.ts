import { GiphyFetch, setServerUrl } from '@giphy/js-fetch-api';

/**
 * GIPHY SDK Key（用于 @giphy/js-fetch-api + @giphy/react-components）
 *
 * ⚠️ 必须使用 SDK 类型 App 的 Key，API 类型的 Key 不可用于 SDK
 */
const sdkKey = import.meta.env.VITE_GIPHY_SDK_KEY as string;

if (!sdkKey) {
  console.warn(
    '[GIPHY] VITE_GIPHY_SDK_KEY not set. GIF/Sticker features will be unavailable.\n' +
      'Create an SDK-type app at https://developers.giphy.com/ and set VITE_GIPHY_SDK_KEY in .env.local',
  );
}

/**
 * 开发环境：GIPHY API 请求走 Vite dev server proxy
 *   SDK 内部请求 /giphy-api/v1/gifs/trending?...
 *   Vite proxy 转发到 https://api.giphy.com/v1/gifs/trending?...
 *
 * 原因：浏览器无法直连 api.giphy.com（网络限制），Node 层可以。
 * 生产环境：通过 Nginx 反向代理或直连。
 */
if (import.meta.env.DEV) {
  setServerUrl('/giphy-api/v1/');
}

/** GIPHY SDK 客户端单例（整个应用共享一个实例） */
export const gf = new GiphyFetch(sdkKey || 'placeholder');

/** GIPHY SDK 是否可用 */
export const isGiphyAvailable = Boolean(sdkKey);

/**
 * Antd 静态方法全局引用
 *
 * 解决 antd 5.x 中 message/notification/modal 静态方法无法消费 context 的问题。
 * App.tsx 中通过 <AntdStaticProvider> 注入实例，
 * 之后在任意位置（组件 / store / 工具函数）均可直接 import 使用。
 *
 * @example
 * import { antdMessage } from '@/lib/antdStatic';
 * antdMessage.success('操作成功');
 */
import type { MessageInstance } from 'antd/es/message/interface';

let messageInstance: MessageInstance | null = null;

/** 由 <AntdStaticProvider> 调用，注入 App.useApp() 返回的 message 实例 */
export function setMessageInstance(instance: MessageInstance) {
  messageInstance = instance;
}

/**
 * 全局 message 代理对象。
 * 调用时如果实例尚未注入则静默忽略（SSR/test 场景不会报错）。
 */
export const antdMessage: MessageInstance = new Proxy({} as MessageInstance, {
  get(_target, prop) {
    if (!messageInstance) {
      // 还没注入（SSR / 测试），返回 noop
      return () => {};
    }
    return (messageInstance as Record<string | symbol, any>)[prop];
  },
});

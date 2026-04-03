/**
 * 集中管理所有 gRPC Client 实例
 *
 * 所有前端代码统一从此文件引用 client，不再各自 createClient。
 * 好处：
 * 1. 全局共享同一个 client 实例（含 transport 拦截器链）
 * 2. 新增/修改拦截器只需改 connect.ts，所有调用方自动生效
 * 3. 代码搜索更方便 — grep xxxClient 即可定位所有 RPC 调用
 */

import { createClient } from '@connectrpc/connect';
import { ArticleService, CommentService, SocialService, UserService } from '@luhanxin/shared-types';

import { transport } from './connect';

export const userClient = createClient(UserService, transport);
export const articleClient = createClient(ArticleService, transport);
export const commentClient = createClient(CommentService, transport);
export const socialClient = createClient(SocialService, transport);

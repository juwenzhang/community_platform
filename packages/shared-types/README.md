# 共享类型包 — `packages/shared-types/`

**前端共享的 TypeScript 类型定义**，包含 buf 自动生成的 Protobuf TypeScript 类型。

## 概述

这个包是前端所有子应用的 **类型唯一真相源 (Single Source of Truth)**，类型由 `proto/` 目录下的 `.proto` 文件通过 `buf generate` 自动生成。

```
proto/*.proto  ──buf generate──▶  packages/shared-types/src/proto/  ──导出──▶  apps/main, apps/feed ...
```

## 目录结构

```
packages/shared-types/
├── package.json          # @luhanxin/shared-types
├── tsconfig.json         # TypeScript 配置
└── src/
    ├── index.ts          # 主入口 (re-export proto 类型)
    └── proto/            # buf 生成的 TypeScript 代码 (勿手动编辑)
        └── luhanxin/
            └── community/
                └── v1/
                    ├── user_pb.ts
                    ├── article_pb.ts
                    └── common_pb.ts
```

## 使用方式

### 在其他 app 中引用

```typescript
// 导入消息类型
import { UserSchema, GetUserRequestSchema } from '@luhanxin/shared-types';

// 导入 Service 定义 (用于 Connect RPC)
import { UserService } from '@luhanxin/shared-types/proto/luhanxin/community/v1/user_pb';
```

### 支持的导出路径

```json
// package.json exports
{
  ".": "./src/index.ts",
  "./proto/*": "./src/proto/*"
}
```

## 开发命令

```bash
# 类型检查
pnpm --filter @luhanxin/shared-types typecheck

# 或直接
cd packages/shared-types && npx tsc --noEmit
```

## 重新生成类型

当 `.proto` 文件修改后，需要重新生成：

```bash
# 从项目根目录
pnpm proto

# 或
cd proto && buf generate
```

生成器配置在 `proto/buf.gen.yaml`：

```yaml
# TypeScript: protobuf-es → packages/shared-types/src/proto/
- local: protoc-gen-es
  out: ../packages/shared-types/src/proto
  opt:
    - target=ts
```

## 注意事项

> ⚠️ `src/proto/` 目录下的文件是**自动生成**的，请勿手动编辑！
> 所有修改应在 `proto/community/v1/*.proto` 文件中进行，然后重新运行 `buf generate`。

### 依赖

| 包 | 用途 |
|---|------|
| `@bufbuild/protobuf` | Protobuf 运行时 (protobuf-es v2) |

### 无构建步骤

此包直接导出 `.ts` 源文件，不需要编译步骤。Vite 在开发/构建时会直接处理 TypeScript 源码。

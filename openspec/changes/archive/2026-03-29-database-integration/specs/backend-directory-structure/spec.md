## MODIFIED Requirements

### Requirement: Shared Crate 模块组织

`shared` crate SHALL 新增以下模块：

```
shared/src/
├── ... (已有模块)
├── database/              # 数据库连接池封装（新增）
│   └── mod.rs
└── entity/                # SeaORM Entity 自动生成代码（新增）
    ├── mod.rs
    ├── user.rs
    └── article.rs
```

#### Scenario: database 模块可正常导出

- **WHEN** svc-user 引用 `shared::database::connect`
- **THEN** 编译成功，可获取 `DatabaseConnection`

#### Scenario: entity 模块可正常导出

- **WHEN** svc-user 引用 `shared::entity::user::Entity`
- **THEN** 编译成功，可使用 Entity 执行查询

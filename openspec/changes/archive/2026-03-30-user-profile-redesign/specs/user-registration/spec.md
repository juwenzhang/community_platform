# user-registration — Delta Spec

## 变更说明

`UpdateProfileRequest` Proto 消息扩展新字段以支持社交链接和结构化个人信息。

## 变更内容

**UpdateProfileRequest 新增字段:**
```protobuf
message UpdateProfileRequest {
  // 现有字段 1-3 不变
  string company = 4;                    // 新增：公司/组织
  string location = 5;                   // 新增：所在地
  string website = 6;                    // 新增：个人网站
  repeated SocialLink social_links = 7;  // 新增：社交链接
}
```

**svc-user UpdateProfile handler:**
- 新增字段持久化到数据库
- `social_links` 序列化为 JSON 存入 JSONB 列

详见 `user-social-links` spec。

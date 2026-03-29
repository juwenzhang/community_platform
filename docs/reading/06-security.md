# 核心推荐阅读 — 安全篇

> 📅 创建日期：2026-03-29
> 📌 作者：luhanxin
> 🏷️ 标签：推荐阅读 · 安全 · Web 安全 · 认证授权 · 密码学

---

## 1. Web 安全

### 综合

- [OWASP Top 10（最常见 Web 安全风险）](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series（速查手册）](https://cheatsheetseries.owasp.org/)
- [Web Security Academy — PortSwigger（免费靶场）](https://portswigger.net/web-security)
- [MDN Web Security 指南](https://developer.mozilla.org/en-US/docs/Web/Security)

### 常见攻击

| 攻击类型 | 推荐阅读 |
|---------|---------|
| XSS | [Cross-Site Scripting Prevention — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) |
| CSRF | [CSRF Prevention — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) |
| SQL Injection | [SQL Injection Prevention — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html) |
| SSRF | [SSRF Prevention — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) |
| Prototype Pollution | [Prototype Pollution — Snyk](https://learn.snyk.io/lesson/prototype-pollution/) |

### Markdown 安全（本项目相关）

- [DOMPurify — HTML 净化库](https://github.com/cure53/DOMPurify)
- [rehype-sanitize — Markdown 渲染安全过滤](https://github.com/rehypejs/rehype-sanitize)

---

## 2. 认证 & 授权

### JWT

- [JWT 官方介绍](https://jwt.io/introduction)
- [JWT Handbook（Auth0 免费电子书）](https://auth0.com/resources/ebooks/jwt-handbook)
- [Stop Using JWT for Sessions!（争议讨论）](http://cryto.net/~joepie91/blog/2016/06/13/stop-using-jwt-for-sessions/)
- [JWT Best Practices — RFC 8725](https://datatracker.ietf.org/doc/html/rfc8725)

### OAuth 2.0 & OIDC

- [OAuth 2.0 Simplified（Aaron Parecki，免费书）](https://www.oauth.com/)
- [OAuth 2.0 规范 (RFC 6749)](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect 入门](https://openid.net/developers/how-connect-works/)
- [PKCE 详解（防止授权码被截获）](https://oauth.net/2/pkce/)

### 密码存储

- [Password Storage — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [bcrypt / scrypt / Argon2 对比](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#argon2id)

---

## 3. 供应链安全

- [npm 供应链攻击案例总结](https://snyk.io/blog/npm-security-2024/)
- [Cargo 供应链安全 — cargo-audit](https://rustsec.org/)
- [Sigstore — 软件签名验证](https://www.sigstore.dev/)
- [SLSA 框架（Supply-chain Levels for Software Artifacts）](https://slsa.dev/)
- [Socket.dev — 依赖风险扫描](https://socket.dev/)

---

## 4. 密码学基础

- [Crypto 101（密码学入门，免费书）](https://www.crypto101.io/)
- [Practical Cryptography for Developers（免费书）](https://cryptobook.nakov.com/)
- [对称加密 vs 非对称加密 — Cloudflare](https://www.cloudflare.com/learning/ssl/what-is-asymmetric-encryption/)
- [HTTPS 工作原理 — How HTTPS Works（漫画版）](https://howhttps.works/)

---

## 5. 安全工具

| 工具 | 用途 | 链接 |
|------|------|------|
| **cargo-audit** | Rust 依赖漏洞扫描 | [GitHub](https://github.com/rustsec/rustsec/tree/main/cargo-audit) |
| **npm audit** | Node.js 依赖漏洞扫描 | [npm docs](https://docs.npmjs.com/cli/v10/commands/npm-audit) |
| **Snyk** | 多语言依赖安全扫描 | [snyk.io](https://snyk.io/) |
| **Trivy** | 容器镜像漏洞扫描 | [GitHub](https://github.com/aquasecurity/trivy) |
| **OWASP ZAP** | Web 应用渗透测试 | [zaproxy.org](https://www.zaproxy.org/) |

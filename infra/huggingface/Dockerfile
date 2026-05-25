# ============================================================
# Luhanxin Community Platform — HuggingFace Spaces Dockerfile
# All-in-One: Rust 后端 + PostgreSQL + Redis + NATS + Consul + Meilisearch + Nginx
# ============================================================

# ======================== Stage 1: Rust Builder ========================
FROM rust:1.82-slim-bookworm AS rust-builder

# 安装编译依赖
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# 复制 workspace 级文件
COPY Cargo.toml Cargo.lock rust-toolchain.toml ./

# 复制所有 crate 源码
COPY crates/ crates/
COPY services/ services/

# 构建 release 版本
RUN cargo build --release \
    -p gateway \
    -p svc-user \
    -p svc-content \
    -p svc-notification \
    -p migration \
    && strip /build/target/release/gateway \
    && strip /build/target/release/svc-user \
    && strip /build/target/release/svc-content \
    && strip /build/target/release/svc-notification \
    && strip /build/target/release/migration

# ======================== Stage 2: Runtime ========================
FROM debian:bookworm-slim AS runtime

# 添加 PostgreSQL 官方源（Bookworm 默认只有 PG 15）+ 安装运行时依赖
RUN apt-get update && apt-get install -y ca-certificates curl gnupg \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/pgdg.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update && apt-get install -y \
    supervisor \
    nginx \
    postgresql-16 \
    postgresql-client-16 \
    redis-server \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# 安装 NATS Server
RUN wget -qO /tmp/nats.deb https://github.com/nats-io/nats-server/releases/download/v2.10.22/nats-server-v2.10.22-amd64.deb \
    && dpkg -i /tmp/nats.deb \
    && rm /tmp/nats.deb

# 安装 Consul
RUN wget -qO /tmp/consul.zip https://releases.hashicorp.com/consul/1.19.2/consul_1.19.2_linux_amd64.zip \
    && apt-get update && apt-get install -y unzip && rm -rf /var/lib/apt/lists/* \
    && unzip /tmp/consul.zip -d /usr/local/bin/ \
    && rm /tmp/consul.zip

# 安装 Meilisearch
RUN curl -L https://install.meilisearch.com | sh \
    && mv ./meilisearch /usr/local/bin/meilisearch

# HuggingFace Spaces 要求：UID 1000
RUN useradd -m -u 1000 user

# 创建目录结构
RUN mkdir -p \
    /app/bin \
    /app/config \
    /app/data/postgres \
    /app/data/redis \
    /app/data/meilisearch \
    /app/data/consul \
    /app/data/nats \
    /var/log/supervisor \
    /var/run/postgresql \
    && chown -R user:user /app /var/log/supervisor /var/run/postgresql

# PostgreSQL 数据目录权限
RUN chown -R user:user /app/data/postgres

# Nginx 权限
RUN chown -R user:user /var/lib/nginx /var/log/nginx /run

# 复制 Rust 二进制文件
COPY --from=rust-builder --chown=user /build/target/release/gateway /app/bin/
COPY --from=rust-builder --chown=user /build/target/release/svc-user /app/bin/
COPY --from=rust-builder --chown=user /build/target/release/svc-content /app/bin/
COPY --from=rust-builder --chown=user /build/target/release/svc-notification /app/bin/
COPY --from=rust-builder --chown=user /build/target/release/migration /app/bin/

# 复制配置文件
COPY --chown=user infra/huggingface/nginx.conf /etc/nginx/nginx.conf
COPY --chown=user infra/huggingface/supervisord.conf /app/config/supervisord.conf
COPY --chown=user infra/huggingface/entrypoint.sh /app/entrypoint.sh
COPY --chown=user infra/huggingface/pg_hba.conf /app/config/pg_hba.conf
COPY --chown=user infra/huggingface/postgresql.conf /app/config/postgresql.conf

RUN chmod +x /app/entrypoint.sh

# 切换到非 root 用户
USER user
ENV HOME=/home/user \
    PATH=/app/bin:/usr/lib/postgresql/16/bin:$PATH \
    PGDATA=/app/data/postgres

WORKDIR /app

# HuggingFace Spaces 对外端口
EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:7860/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]

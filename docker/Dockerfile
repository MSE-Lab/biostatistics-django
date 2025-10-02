FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    TZ=Asia/Shanghai

WORKDIR /app

# 基础系统依赖（Pillow、psycopg2 之类常见依赖）
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libjpeg62-turbo-dev zlib1g-dev libfreetype6-dev liblcms2-dev \
    libwebp-dev tcl-dev tk-dev \
    && rm -rf /var/lib/apt/lists/*

# 先复制依赖清单并安装依赖（更好利用缓存）
COPY requirements.txt /app/requirements.txt
RUN python -m pip install --upgrade pip && pip install -r requirements.txt

# 复制项目源码与部署脚本
COPY . /app

# 确保入口脚本可执行
RUN chmod +x /app/docker/web/entrypoint.sh

EXPOSE 8000

# 入口由 docker-compose 指定（/app/docker/web/entrypoint.sh）
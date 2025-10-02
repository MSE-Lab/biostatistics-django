#!/usr/bin/env bash
set -euo pipefail

# 进入项目目录（镜像内工作目录应为 /app）
cd /app

: "${DJANGO_SETTINGS_MODULE:=biostatistics_course.settings_production}"
export DJANGO_SETTINGS_MODULE

if [ -z "${DJANGO_SECRET_KEY:-}" ]; then
  echo "WARN: DJANGO_SECRET_KEY is not set. Please set it in .env.production for production security."
fi

# 数据库迁移
python manage.py migrate --noinput --settings=${DJANGO_SETTINGS_MODULE}

# 收集静态文件至 /app/staticfiles（已通过卷映射持久化）
python manage.py collectstatic --noinput --settings=${DJANGO_SETTINGS_MODULE}

# 启动 Gunicorn 服务
exec gunicorn biostatistics_course.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 3 \
  --timeout 120 \
  --access-logfile "-" \
  --error-logfile "-"
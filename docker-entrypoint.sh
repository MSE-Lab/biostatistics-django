#!/bin/bash
set -e

echo "🚀 启动 Biostatistics Django 应用..."

# 等待数据库准备就绪（如果使用外部数据库）
echo "📊 检查数据库连接..."

# 执行数据库迁移
echo "🔄 执行数据库迁移..."
python manage.py migrate --noinput

# 收集静态文件
echo "📁 收集静态文件..."
python manage.py collectstatic --noinput --clear

# 创建超级用户（如果不存在）
echo "👤 检查管理员用户..."
python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    print("创建默认管理员用户...")
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print("管理员用户创建成功！用户名: admin, 密码: admin123")
else:
    print("管理员用户已存在")
EOF

echo "✅ 应用初始化完成！"
echo "🌐 应用将在 http://0.0.0.0:8000 启动"
echo "🔑 管理后台: http://your-server:8000/admin (admin/admin123)"

# 执行传入的命令
exec "$@"
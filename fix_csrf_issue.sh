#!/bin/bash

echo "🔐 修复CSRF验证问题..."

# 进入项目目录
cd /var/www/biostatistics-django

# 备份当前的生产配置文件
echo "💾 备份配置文件..."
sudo cp biostatistics_course/settings_production.py biostatistics_course/settings_production.py.backup

# 修复CSRF设置
echo "🛠️ 修复CSRF配置..."
sudo tee -a biostatistics_course/settings_production.py > /dev/null << 'EOF'

# CSRF 配置修复
CSRF_TRUSTED_ORIGINS = [
    'http://localhost',
    'http://127.0.0.1',
    'http://10.50.0.198',
    'http://10.50.0.198:8001',
    'https://10.50.0.198',
    'https://10.50.0.198:8001',
]

# 允许的主机配置
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '10.50.0.198',
    '10.50.0.198:8001',
]

# 会话配置
SESSION_COOKIE_SECURE = False  # HTTP环境下设为False
CSRF_COOKIE_SECURE = False     # HTTP环境下设为False
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

# 安全头配置
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
EOF

echo "📝 显示修改后的配置..."
echo "CSRF_TRUSTED_ORIGINS 配置:"
grep -A 10 "CSRF_TRUSTED_ORIGINS" biostatistics_course/settings_production.py

# 重启Django服务
echo "🔄 重启Django服务..."
sudo systemctl restart biostatistics-django

# 检查服务状态
echo "📊 检查Django服务状态..."
sudo systemctl status biostatistics-django --no-pager -l

# 检查日志
echo "📋 检查最新日志..."
sudo journalctl -u biostatistics-django --no-pager -l -n 10

echo ""
echo "🎉 CSRF修复完成！"
echo "现在尝试重新登录 http://10.50.0.198:8001"
echo ""
echo "如果还有问题，可以临时启用DEBUG模式查看详细错误："
echo "sudo nano biostatistics_course/settings_production.py"
echo "将 DEBUG = False 改为 DEBUG = True"
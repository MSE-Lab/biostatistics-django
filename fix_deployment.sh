#!/bin/bash

# 部署问题修复脚本
# 使用方法: chmod +x fix_deployment.sh && sudo ./fix_deployment.sh

set -e

echo "🔧 开始修复部署问题..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/var/www/biostatistics-django"
REAL_USER=${SUDO_USER:-$USER}

cd $PROJECT_DIR

# 1. 修复数据库迁移问题
echo "🗄️ 修复数据库迁移..."
sudo -u $REAL_USER bash -c "
    cd $PROJECT_DIR
    source venv/bin/activate
    
    # 生成迁移文件
    python manage.py makemigrations core --settings=biostatistics_course.settings_production
    python manage.py makemigrations simulators --settings=biostatistics_course.settings_production
    
    # 执行迁移
    python manage.py migrate --settings=biostatistics_course.settings_production
"

# 2. 测试Django配置
echo "🧪 测试Django配置..."
sudo -u $REAL_USER bash -c "
    cd $PROJECT_DIR
    source venv/bin/activate
    python manage.py check --settings=biostatistics_course.settings_production
"

# 3. 修复systemd服务配置
echo "⚙️ 修复systemd服务配置..."
cat > /etc/systemd/system/biostatistics-django.service << EOF
[Unit]
Description=Biostatistics Django Application
After=network.target

[Service]
Type=simple
User=$REAL_USER
Group=$REAL_USER
WorkingDirectory=$PROJECT_DIR
Environment=PATH=$PROJECT_DIR/venv/bin:/usr/local/bin:/usr/bin:/bin
Environment=DJANGO_SETTINGS_MODULE=biostatistics_course.settings_production
ExecStart=/bin/bash -c 'cd $PROJECT_DIR && source venv/bin/activate && gunicorn --workers 3 --bind 127.0.0.1:8000 biostatistics_course.wsgi:application'
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 4. 重新加载并启动服务
echo "🚀 重新启动服务..."
systemctl daemon-reload
systemctl stop biostatistics-django 2>/dev/null || true
systemctl start biostatistics-django

# 5. 检查服务状态
sleep 3
if systemctl is-active --quiet biostatistics-django; then
    echo -e "${GREEN}✅ Django服务启动成功${NC}"
else
    echo -e "${RED}❌ Django服务启动失败，查看详细日志:${NC}"
    journalctl -u biostatistics-django --no-pager -n 20
    echo ""
    echo "手动测试命令:"
    echo "cd $PROJECT_DIR"
    echo "source venv/bin/activate"
    echo "gunicorn --workers 3 --bind 127.0.0.1:8000 biostatistics_course.wsgi:application"
    exit 1
fi

# 6. 测试Nginx配置
echo "🌐 测试Nginx配置..."
nginx -t

if [ $? -eq 0 ]; then
    systemctl restart nginx
    echo -e "${GREEN}✅ Nginx重启成功${NC}"
else
    echo -e "${RED}❌ Nginx配置错误${NC}"
    exit 1
fi

# 7. 检查端口监听
echo "🔍 检查端口监听..."
echo "Django服务 (8000端口):"
ss -tlnp | grep :8000 || echo "端口8000未监听"

echo "Nginx服务 (80和8001端口):"
ss -tlnp | grep :80 || echo "端口80未监听"
ss -tlnp | grep :8001 || echo "端口8001未监听"

# 8. 创建管理员用户提醒
echo ""
echo -e "${YELLOW}📋 下一步操作:${NC}"
echo "1. 创建管理员用户:"
echo "   cd $PROJECT_DIR"
echo "   python create_admin_secure.py"
echo ""
echo "2. 访问网站:"
echo "   本地: http://localhost"
echo "   远程: http://10.50.0.198:8001"
echo ""
echo "3. 查看服务状态:"
echo "   sudo systemctl status biostatistics-django"
echo "   sudo journalctl -u biostatistics-django -f"

echo -e "${GREEN}🎉 修复完成！${NC}"
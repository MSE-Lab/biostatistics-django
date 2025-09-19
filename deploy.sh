#!/bin/bash

# 生物统计学课程平台部署脚本
# 使用方法: chmod +x deploy.sh && ./deploy.sh

set -e  # 遇到错误立即退出

echo "🚀 开始部署生物统计学课程平台..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}错误: 请不要使用root用户运行此脚本${NC}"
   exit 1
fi

# 检查Python版本
echo "📋 检查Python版本..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
required_version="3.9"
if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 9) else 1)"; then
    echo -e "${RED}错误: 需要Python 3.9或更高版本，当前版本: $python_version${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Python版本检查通过: $python_version${NC}"

# 检查必要的系统包
echo "📋 检查系统依赖..."
required_packages=("git" "nginx" "postgresql")
for package in "${required_packages[@]}"; do
    if ! command -v $package &> /dev/null; then
        echo -e "${YELLOW}警告: $package 未安装，请手动安装${NC}"
    else
        echo -e "${GREEN}✅ $package 已安装${NC}"
    fi
done

# 创建项目目录
PROJECT_DIR="/var/www/biostatistics-django"
echo "📁 设置项目目录: $PROJECT_DIR"

if [ ! -d "$PROJECT_DIR" ]; then
    sudo mkdir -p $PROJECT_DIR
    sudo chown $USER:$USER $PROJECT_DIR
fi

cd $PROJECT_DIR

# 检查.env文件
if [ ! -f ".env" ]; then
    echo -e "${RED}错误: .env 文件不存在！${NC}"
    echo "请复制 .env.example 为 .env 并填入正确的配置"
    exit 1
fi

# 加载环境变量
source .env

# 检查关键环境变量
if [ -z "$DJANGO_SECRET_KEY" ] || [ "$DJANGO_SECRET_KEY" = "your-very-long-and-random-secret-key-here" ]; then
    echo -e "${RED}错误: 请在.env文件中设置正确的DJANGO_SECRET_KEY${NC}"
    exit 1
fi

# 创建虚拟环境
echo "🐍 创建Python虚拟环境..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate

# 安装依赖
echo "📦 安装Python依赖..."
pip install --upgrade pip
pip install -r requirements.txt

# 数据库迁移
echo "🗄️ 执行数据库迁移..."
python manage.py migrate --settings=biostatistics_course.settings_production

# 收集静态文件
echo "📁 收集静态文件..."
python manage.py collectstatic --noinput --settings=biostatistics_course.settings_production

# 创建超级用户（如果不存在）
echo "👤 检查管理员用户..."
python manage.py shell --settings=biostatistics_course.settings_production << EOF
from core.models import User
if not User.objects.filter(username='admin').exists():
    print("需要创建管理员用户")
    exit(1)
else:
    print("管理员用户已存在")
EOF

if [ $? -eq 1 ]; then
    echo "请手动创建管理员用户:"
    python manage.py createsuperuser --settings=biostatistics_course.settings_production
fi

# 创建日志目录
echo "📝 创建日志目录..."
mkdir -p logs
touch logs/django.log
chmod 664 logs/django.log

# 设置文件权限
echo "🔒 设置文件权限..."
chmod -R 755 static/
chmod -R 755 media/
chmod -R 644 logs/

# 创建systemd服务文件
echo "⚙️ 创建systemd服务..."
sudo tee /etc/systemd/system/biostatistics-django.service > /dev/null << EOF
[Unit]
Description=Biostatistics Django Application
After=network.target

[Service]
Type=notify
User=$USER
Group=$USER
WorkingDirectory=$PROJECT_DIR
Environment=PATH=$PROJECT_DIR/venv/bin
Environment=DJANGO_SETTINGS_MODULE=biostatistics_course.settings_production
ExecStart=$PROJECT_DIR/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8000 biostatistics_course.wsgi:application
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# 启用并启动服务
sudo systemctl daemon-reload
sudo systemctl enable biostatistics-django
sudo systemctl start biostatistics-django

# 检查服务状态
if sudo systemctl is-active --quiet biostatistics-django; then
    echo -e "${GREEN}✅ Django服务启动成功${NC}"
else
    echo -e "${RED}❌ Django服务启动失败${NC}"
    sudo systemctl status biostatistics-django
    exit 1
fi

# 创建Nginx配置
echo "🌐 配置Nginx..."
sudo tee /etc/nginx/sites-available/biostatistics-django > /dev/null << EOF
server {
    listen 80;
    server_name localhost;

    client_max_body_size 100M;

    location /static/ {
        alias $PROJECT_DIR/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias $PROJECT_DIR/media/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# 启用Nginx站点
sudo ln -sf /etc/nginx/sites-available/biostatistics-django /etc/nginx/sites-enabled/
sudo nginx -t

if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx配置成功${NC}"
else
    echo -e "${RED}❌ Nginx配置错误${NC}"
    exit 1
fi

# 创建备份脚本
echo "💾 创建备份脚本..."
tee backup.sh > /dev/null << 'EOF'
#!/bin/bash
# 数据库备份脚本

BACKUP_DIR="/var/backups/biostatistics-django"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
python manage.py dumpdata --settings=biostatistics_course.settings_production > $BACKUP_DIR/db_backup_$DATE.json

# 备份媒体文件
tar -czf $BACKUP_DIR/media_backup_$DATE.tar.gz media/

# 删除7天前的备份
find $BACKUP_DIR -name "*.json" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "备份完成: $DATE"
EOF

chmod +x backup.sh

# 添加定时备份任务
echo "⏰ 设置定时备份..."
(crontab -l 2>/dev/null; echo "0 2 * * * cd $PROJECT_DIR && ./backup.sh") | crontab -

echo ""
echo -e "${GREEN}🎉 部署完成！${NC}"
echo ""
echo "📋 部署信息:"
echo "   项目目录: $PROJECT_DIR"
echo "   服务名称: biostatistics-django"
echo "   访问地址: http://localhost"
echo ""
echo "🔧 常用命令:"
echo "   查看服务状态: sudo systemctl status biostatistics-django"
echo "   重启服务: sudo systemctl restart biostatistics-django"
echo "   查看日志: tail -f logs/django.log"
echo "   手动备份: ./backup.sh"
echo ""
echo -e "${YELLOW}⚠️  重要提醒:${NC}"
echo "1. 请确保已修改所有默认密码"
echo "2. 建议配置SSL证书启用HTTPS"
echo "3. 定期检查系统更新和安全补丁"
echo "4. 监控系统资源使用情况"
echo ""
echo -e "${GREEN}✅ 部署成功完成！${NC}"
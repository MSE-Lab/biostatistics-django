#!/bin/bash

# 生物统计学课程平台CentOS部署脚本
# 适用于CentOS 7/8/9和RHEL系统
# 使用方法: chmod +x deploy_centos.sh && sudo ./deploy_centos.sh

set -e  # 遇到错误立即退出

echo "🚀 开始在CentOS系统上部署生物统计学课程平台..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检测CentOS版本
if [ -f /etc/redhat-release ]; then
    CENTOS_VERSION=$(rpm -q --queryformat '%{VERSION}' centos-release 2>/dev/null || echo "unknown")
    RHEL_VERSION=$(rpm -q --queryformat '%{VERSION}' redhat-release-server 2>/dev/null || echo "unknown")
    
    if [ "$CENTOS_VERSION" != "unknown" ]; then
        echo "检测到CentOS版本: $CENTOS_VERSION"
        OS_VERSION=$CENTOS_VERSION
    elif [ "$RHEL_VERSION" != "unknown" ]; then
        echo "检测到RHEL版本: $RHEL_VERSION"
        OS_VERSION=$RHEL_VERSION
    else
        echo "检测到Red Hat系列系统"
        OS_VERSION="unknown"
    fi
else
    echo -e "${RED}错误: 此脚本仅适用于CentOS/RHEL系统${NC}"
    exit 1
fi

# 检查是否为root用户
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}错误: 请使用root用户或sudo运行此脚本${NC}"
   exit 1
fi

# 获取运行脚本的实际用户
REAL_USER=${SUDO_USER:-$USER}
if [ "$REAL_USER" = "root" ]; then
    echo -e "${YELLOW}警告: 建议使用普通用户通过sudo运行此脚本${NC}"
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    REAL_USER="nginx"  # 使用nginx用户作为默认用户
fi

echo "将使用用户: $REAL_USER"

# 检查Python版本
echo "📋 检查Python版本..."
if command -v python3 &> /dev/null; then
    python_version=$(python3 --version 2>&1 | awk '{print $2}')
    if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 9) else 1)" 2>/dev/null; then
        echo -e "${RED}错误: 需要Python 3.9或更高版本，当前版本: $python_version${NC}"
        echo "正在安装Python 3.9..."
        
        # 安装EPEL仓库
        if [ "$OS_VERSION" = "7" ]; then
            yum install -y epel-release
            yum install -y python39 python39-pip python39-devel
            ln -sf /usr/bin/python3.9 /usr/bin/python3
        elif [ "$OS_VERSION" = "8" ] || [ "$OS_VERSION" = "9" ]; then
            dnf install -y epel-release
            dnf install -y python39 python39-pip python39-devel
            alternatives --install /usr/bin/python3 python3 /usr/bin/python3.9 1
        fi
    fi
else
    echo "正在安装Python 3..."
    if [ "$OS_VERSION" = "7" ]; then
        yum update -y
        yum install -y epel-release
        yum install -y python39 python39-pip python39-devel
        ln -sf /usr/bin/python3.9 /usr/bin/python3
    elif [ "$OS_VERSION" = "8" ] || [ "$OS_VERSION" = "9" ]; then
        dnf update -y
        dnf install -y python39 python39-pip python39-devel
        alternatives --install /usr/bin/python3 python3 /usr/bin/python3.9 1
    fi
fi

python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo -e "${GREEN}✅ Python版本检查通过: $python_version${NC}"

# 安装系统依赖
echo "📦 安装系统依赖..."
if [ "$OS_VERSION" = "7" ]; then
    # CentOS 7
    yum groupinstall -y "Development Tools"
    yum install -y git nginx postgresql-server postgresql-contrib postgresql-devel
    yum install -y gcc gcc-c++ make openssl-devel libffi-devel
    yum install -y libjpeg-devel zlib-devel freetype-devel lcms2-devel
    yum install -y libwebp-devel tcl-devel tk-devel
    
    # 初始化PostgreSQL
    postgresql-setup initdb
    systemctl enable postgresql
    systemctl start postgresql
    
elif [ "$OS_VERSION" = "8" ] || [ "$OS_VERSION" = "9" ]; then
    # CentOS 8/9
    dnf groupinstall -y "Development Tools"
    dnf install -y git nginx postgresql-server postgresql-contrib postgresql-devel
    dnf install -y gcc gcc-c++ make openssl-devel libffi-devel
    dnf install -y libjpeg-devel zlib-devel freetype-devel lcms2-devel
    dnf install -y libwebp-devel tcl-devel tk-devel
    
    # 初始化PostgreSQL
    postgresql-setup --initdb
    systemctl enable postgresql
    systemctl start postgresql
fi

echo -e "${GREEN}✅ 系统依赖安装完成${NC}"

# 配置SELinux
echo "🔒 配置SELinux..."
if command -v getenforce &> /dev/null; then
    if [ "$(getenforce)" = "Enforcing" ]; then
        echo "SELinux处于强制模式，配置相关策略..."
        setsebool -P httpd_can_network_connect 1
        setsebool -P httpd_can_network_relay 1
        setsebool -P httpd_execmem 1
        echo -e "${GREEN}✅ SELinux策略配置完成${NC}"
    fi
fi

# 配置防火墙
echo "🔥 配置防火墙..."
if systemctl is-active --quiet firewalld; then
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
    echo -e "${GREEN}✅ 防火墙配置完成${NC}"
fi

# 创建项目目录
PROJECT_DIR="/var/www/biostatistics-django"
echo "📁 设置项目目录: $PROJECT_DIR"

mkdir -p $PROJECT_DIR
chown $REAL_USER:$REAL_USER $PROJECT_DIR

# 切换到项目目录
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
    sudo -u $REAL_USER python3 -m venv venv
fi

# 激活虚拟环境并安装依赖
echo "📦 安装Python依赖..."
sudo -u $REAL_USER bash -c "
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
"

# 配置PostgreSQL数据库
echo "🗄️ 配置PostgreSQL数据库..."
DB_NAME=${DB_NAME:-biostatistics_course}
DB_USER=${DB_USER:-biostatistics_user}
DB_PASSWORD=${DB_PASSWORD:-$(openssl rand -base64 32)}

# 创建数据库用户和数据库
sudo -u postgres psql << EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF

# 更新.env文件中的数据库配置
if ! grep -q "DB_NAME=" .env; then
    echo "DB_NAME=$DB_NAME" >> .env
    echo "DB_USER=$DB_USER" >> .env
    echo "DB_PASSWORD=$DB_PASSWORD" >> .env
    echo "DB_HOST=localhost" >> .env
    echo "DB_PORT=5432" >> .env
fi

echo -e "${GREEN}✅ 数据库配置完成${NC}"
echo "数据库名: $DB_NAME"
echo "数据库用户: $DB_USER"
echo "数据库密码: $DB_PASSWORD"

# 数据库迁移
echo "🗄️ 执行数据库迁移..."
sudo -u $REAL_USER bash -c "
    source venv/bin/activate
    python manage.py migrate --settings=biostatistics_course.settings_production
"

# 收集静态文件
echo "📁 收集静态文件..."
sudo -u $REAL_USER bash -c "
    source venv/bin/activate
    python manage.py collectstatic --noinput --settings=biostatistics_course.settings_production
"

# 创建日志目录
echo "📝 创建日志目录..."
mkdir -p logs
chown $REAL_USER:$REAL_USER logs
touch logs/django.log
chmod 664 logs/django.log
chown $REAL_USER:$REAL_USER logs/django.log

# 设置文件权限
echo "🔒 设置文件权限..."
chown -R $REAL_USER:$REAL_USER $PROJECT_DIR
chmod -R 755 static/ || true
chmod -R 755 media/ || true
chmod -R 644 logs/
chmod 600 .env

# 创建systemd服务文件
echo "⚙️ 创建systemd服务..."
cat > /etc/systemd/system/biostatistics-django.service << EOF
[Unit]
Description=Biostatistics Django Application
After=network.target

[Service]
Type=notify
User=$REAL_USER
Group=$REAL_USER
WorkingDirectory=$PROJECT_DIR
Environment=PATH=$PROJECT_DIR/venv/bin
Environment=DJANGO_SETTINGS_MODULE=biostatistics_course.settings_production
ExecStart=$PROJECT_DIR/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8000 biostatistics_course.wsgi:application
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 启用并启动服务
systemctl daemon-reload
systemctl enable biostatistics-django
systemctl start biostatistics-django

# 检查服务状态
sleep 3
if systemctl is-active --quiet biostatistics-django; then
    echo -e "${GREEN}✅ Django服务启动成功${NC}"
else
    echo -e "${RED}❌ Django服务启动失败${NC}"
    systemctl status biostatistics-django
    exit 1
fi

# 配置Nginx
echo "🌐 配置Nginx..."
cat > /etc/nginx/conf.d/biostatistics-django.conf << EOF
server {
    listen 80;
    server_name localhost _;

    client_max_body_size 100M;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

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

# 测试Nginx配置
nginx -t

if [ $? -eq 0 ]; then
    systemctl enable nginx
    systemctl restart nginx
    echo -e "${GREEN}✅ Nginx配置成功${NC}"
else
    echo -e "${RED}❌ Nginx配置错误${NC}"
    exit 1
fi

# 创建备份脚本
echo "💾 创建备份脚本..."
cat > backup.sh << 'EOF'
#!/bin/bash
# 数据库备份脚本

BACKUP_DIR="/var/backups/biostatistics-django"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
source .env
pg_dump -h ${DB_HOST:-localhost} -U ${DB_USER} -d ${DB_NAME} > $BACKUP_DIR/db_backup_$DATE.sql

# 备份媒体文件
tar -czf $BACKUP_DIR/media_backup_$DATE.tar.gz media/

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "备份完成: $DATE"
EOF

chmod +x backup.sh
chown $REAL_USER:$REAL_USER backup.sh

# 添加定时备份任务
echo "⏰ 设置定时备份..."
(sudo -u $REAL_USER crontab -l 2>/dev/null; echo "0 2 * * * cd $PROJECT_DIR && ./backup.sh") | sudo -u $REAL_USER crontab -

# 创建SSL证书获取脚本（可选）
echo "🔒 创建SSL证书获取脚本..."
cat > setup_ssl.sh << 'EOF'
#!/bin/bash
# SSL证书设置脚本（使用Let's Encrypt）

if [ "$#" -ne 1 ]; then
    echo "使用方法: $0 your-domain.com"
    exit 1
fi

DOMAIN=$1

# 安装certbot
if [ -f /etc/redhat-release ]; then
    if grep -q "release 7" /etc/redhat-release; then
        yum install -y certbot python2-certbot-nginx
    else
        dnf install -y certbot python3-certbot-nginx
    fi
fi

# 获取SSL证书
certbot --nginx -d $DOMAIN

# 设置自动续期
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

echo "SSL证书设置完成！"
EOF

chmod +x setup_ssl.sh

echo ""
echo -e "${GREEN}🎉 CentOS部署完成！${NC}"
echo ""
echo "📋 部署信息:"
echo "   操作系统: CentOS/RHEL $OS_VERSION"
echo "   项目目录: $PROJECT_DIR"
echo "   运行用户: $REAL_USER"
echo "   服务名称: biostatistics-django"
echo "   访问地址: http://$(hostname -I | awk '{print $1}')"
echo "   数据库: PostgreSQL"
echo ""
echo "🔧 常用命令:"
echo "   查看服务状态: systemctl status biostatistics-django"
echo "   重启服务: systemctl restart biostatistics-django"
echo "   查看日志: tail -f $PROJECT_DIR/logs/django.log"
echo "   手动备份: cd $PROJECT_DIR && ./backup.sh"
echo "   设置SSL: ./setup_ssl.sh your-domain.com"
echo ""
echo "🔒 数据库信息:"
echo "   数据库名: $DB_NAME"
echo "   用户名: $DB_USER"
echo "   密码: $DB_PASSWORD"
echo ""
echo -e "${YELLOW}⚠️  重要提醒:${NC}"
echo "1. 请使用 python create_admin_secure.py 创建管理员账户"
echo "2. 建议配置SSL证书启用HTTPS"
echo "3. 定期检查系统更新和安全补丁"
echo "4. 监控系统资源使用情况"
echo "5. 配置防火墙只开放必要端口"
echo ""
echo -e "${GREEN}✅ CentOS部署成功完成！${NC}"
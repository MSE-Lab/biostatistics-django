#!/bin/bash

# 生物统计学课程平台CentOS部署脚本（修复版）
# 适用于CentOS 7/8/9和RHEL系统
# 使用方法: chmod +x deploy_centos_fixed.sh && sudo ./deploy_centos_fixed.sh

set -e  # 遇到错误立即退出

echo "🚀 开始在CentOS系统上部署生物统计学课程平台（修复版）..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
PROJECT_DIR="/var/www/biostatistics-django"
SERVICE_NAME="biostatistics-django"
PYTHON_VERSION="python39"

# 获取服务器IP地址（用于配置）
SERVER_IP=$(hostname -I | awk '{print $1}' || echo "localhost")

# SELinux 配置函数
configure_selinux() {
    echo -e "${BLUE}🔒 配置SELinux权限...${NC}"

    # 检查SELinux是否启用
    if command -v getenforce >/dev/null 2>&1 && [ "$(getenforce)" != "Disabled" ]; then
        echo "SELinux 状态: $(getenforce)"

        # 安装SELinux管理工具
        if [ "$OS_VERSION" = "7" ]; then
            yum install -y policycoreutils-python 2>/dev/null || echo "policycoreutils-python已安装或不可用"
        else
            dnf install -y policycoreutils-python-utils 2>/dev/null || echo "policycoreutils-python-utils已安装或不可用"
        fi

        # 设置SELinux布尔值
        setsebool -P httpd_can_network_connect 1 2>/dev/null || echo "setsebool命令执行失败，可能是因为SELinux未完全启用"

        echo -e "${GREEN}✅ SELinux配置完成${NC}"
    else
        echo "SELinux已禁用或未安装，跳过配置。"
    fi
}

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
    REAL_USER="nginx"  # 使用nginx用户作为默认用户
fi

echo "将使用用户: $REAL_USER"
echo "服务器IP: $SERVER_IP"

# 检查并创建.env文件
echo -e "${BLUE}📋 检查配置文件...${NC}"
if [ ! -f "$(dirname "$0")/.env" ]; then
    echo -e "${YELLOW}⚠️  .env 文件不存在，正在创建...${NC}"

    # 生成SECRET_KEY
    SECRET_KEY=$(python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())" 2>/dev/null)

    if [ -z "$SECRET_KEY" ]; then
        echo -e "${RED}❌ 无法生成SECRET_KEY，请检查Python环境${NC}"
        exit 1
    fi

    cat > "$(dirname "$0")/.env" << EOF
DJANGO_SECRET_KEY=$SECRET_KEY
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,$SERVER_IP
EOF

    chmod 600 "$(dirname "$0")/.env"
    echo -e "${GREEN}✅ .env文件已创建${NC}"
else
    echo -e "${GREEN}✅ .env文件已存在${NC}"
fi

# 检查Python版本
echo -e "${BLUE}📋 检查Python版本...${NC}"
if command -v python3 &> /dev/null; then
    python_version=$(python3 --version 2>&1 | awk '{print $2}')
    echo "当前Python版本: $python_version"

    if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 9) else 1)" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Python版本过低，正在安装Python 3.9...${NC}"

        # 安装Python 3.9
        if [ "$OS_VERSION" = "7" ]; then
            yum install -y epel-release 2>/dev/null || echo "EPEL仓库已安装"
            yum install -y python39 python39-pip python39-devel 2>/dev/null || echo "Python 3.9已安装或不可用"
        elif [ "$OS_VERSION" = "8" ] || [ "$OS_VERSION" = "9" ]; then
            dnf install -y epel-release 2>/dev/null || echo "EPEL仓库已安装"
            dnf install -y python39 python39-pip python39-devel 2>/dev/null || echo "Python 3.9已安装或不可用"
        fi
    fi
else
    echo "正在安装Python 3..."
    if [ "$OS_VERSION" = "7" ]; then
        yum install -y python39 python39-pip python39-devel
    elif [ "$OS_VERSION" = "8" ] || [ "$OS_VERSION" = "9" ]; then
        dnf install -y python39 python39-pip python39-devel
    fi
fi

python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo -e "${GREEN}✅ Python版本检查通过: $python_version${NC}"

# 安装系统依赖
echo -e "${BLUE}📦 安装系统依赖...${NC}"
if [ "$OS_VERSION" = "7" ]; then
    yum groupinstall -y "Development Tools" 2>/dev/null || echo "Development Tools已安装"
    yum install -y git nginx gcc gcc-c++ openssl-devel libffi-devel 2>/dev/null || echo "部分依赖已安装"
    yum install -y libjpeg-devel zlib-devel freetype-devel lcms2-devel libwebp-devel 2>/dev/null || echo "图像库已安装"
elif [ "$OS_VERSION" = "8" ] || [ "$OS_VERSION" = "9" ]; then
    dnf groupinstall -y "Development Tools" 2>/dev/null || echo "Development Tools已安装"
    dnf install -y git nginx gcc gcc-c++ openssl-devel libffi-devel 2>/dev/null || echo "部分依赖已安装"
    dnf install -y libjpeg-devel zlib-devel freetype-devel lcms2-devel libwebp-devel 2>/dev/null || echo "图像库已安装"
fi

echo -e "${GREEN}✅ 系统依赖安装完成${NC}"

# 配置防火墙
echo -e "${BLUE}🔥 配置防火墙...${NC}"
if systemctl is-active --quiet firewalld; then
    firewall-cmd --permanent --add-service=http 2>/dev/null || echo "http服务已开放"
    firewall-cmd --permanent --add-service=https 2>/dev/null || echo "https服务已开放"
    firewall-cmd --reload 2>/dev/null || echo "防火墙重载失败"
    echo -e "${GREEN}✅ 防火墙配置完成${NC}"
else
    echo "防火墙未运行，跳过配置"
fi

# 获取脚本所在目录并复制项目文件
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "脚本目录: $SCRIPT_DIR"
echo "项目目录: $PROJECT_DIR"

# 创建项目目录
mkdir -p $PROJECT_DIR
chown $REAL_USER:$REAL_USER $PROJECT_DIR

# 复制项目文件到目标目录
echo -e "${BLUE}📋 复制项目文件...${NC}"
rsync -av --exclude='venv' --exclude='__pycache__' --exclude='*.pyc' "$SCRIPT_DIR/" "$PROJECT_DIR/" || {
    echo -e "${RED}❌ 文件复制失败${NC}"
    exit 1
}
chown -R $REAL_USER:$REAL_USER $PROJECT_DIR

# 切换到项目目录
cd $PROJECT_DIR

# 创建虚拟环境
echo -e "${BLUE}🐍 创建Python虚拟环境...${NC}"
if [ ! -d "venv" ]; then
    sudo -u $REAL_USER python3 -m venv venv || {
        echo -e "${RED}❌ 虚拟环境创建失败${NC}"
        exit 1
    }
fi

# 激活虚拟环境并安装依赖
echo -e "${BLUE}📦 安装Python依赖...${NC}"
sudo -u $REAL_USER bash -c "
    cd $PROJECT_DIR
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
" || {
    echo -e "${RED}❌ Python依赖安装失败${NC}"
    exit 1
}

# 创建日志目录
echo -e "${BLUE}📝 创建日志目录...${NC}"
mkdir -p logs
chown $REAL_USER:$REAL_USER logs
touch logs/django.log
chmod 664 logs/django.log
chown $REAL_USER:$REAL_USER logs/django.log

# 数据库迁移
echo -e "${BLUE}🗄️ 执行数据库迁移...${NC}"
sudo -u $REAL_USER bash -c "
    cd $PROJECT_DIR
    source venv/bin/activate
    python manage.py makemigrations --settings=biostatistics_course.settings_production 2>/dev/null || echo '迁移文件已存在'
    python manage.py migrate --settings=biostatistics_course.settings_production
" || {
    echo -e "${RED}❌ 数据库迁移失败${NC}"
    exit 1
}

# 收集静态文件
echo -e "${BLUE}📁 收集静态文件...${NC}"
sudo -u $REAL_USER bash -c "
    cd $PROJECT_DIR
    source venv/bin/activate
    python manage.py collectstatic --noinput --settings=biostatistics_course.settings_production
" || {
    echo -e "${RED}❌ 静态文件收集失败${NC}"
    exit 1
}

# 调用SELinux配置函数
configure_selinux

# 创建systemd服务文件
echo -e "${BLUE}⚙️ 创建systemd服务...${NC}"
cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=Biostatistics Django Application
After=network.target

[Service]
Type=exec
User=$REAL_USER
Group=$REAL_USER
WorkingDirectory=$PROJECT_DIR
EnvironmentFile=$PROJECT_DIR/.env
Environment=PATH=$PROJECT_DIR/venv/bin:/usr/local/bin:/usr/bin:/bin
Environment=DJANGO_SETTINGS_MODULE=biostatistics_course.settings_production
ExecStart=$PROJECT_DIR/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8000 biostatistics_course.wsgi:application
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=on-failure
RestartSec=5
TimeoutStartSec=60
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

# 启用并启动服务
systemctl daemon-reload
systemctl enable $SERVICE_NAME 2>/dev/null || echo "服务已启用或权限不足"
systemctl start $SERVICE_NAME || {
    echo -e "${RED}❌ 服务启动失败${NC}"
    echo "显示最近的日志："
    journalctl -u $SERVICE_NAME.service -n 10 --no-pager
    exit 1
}

# 检查服务状态
sleep 3
if systemctl is-active --quiet $SERVICE_NAME; then
    echo -e "${GREEN}✅ Django服务启动成功${NC}"
else
    echo -e "${RED}❌ Django服务启动失败${NC}"
    echo "显示最近的日志："
    journalctl -u $SERVICE_NAME.service -n 20 --no-pager
    exit 1
fi

# 配置Nginx
echo -e "${BLUE}🌐 配置Nginx...${NC}"
cat > /etc/nginx/conf.d/biostatistics-django.conf << EOF
# 默认80端口配置
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

# 可选：配置特定域名或IP的服务器块
EOF

# 测试Nginx配置并重启
if nginx -t 2>/dev/null; then
    systemctl enable nginx 2>/dev/null || echo "Nginx已启用"
    systemctl restart nginx || {
        echo -e "${YELLOW}⚠️ Nginx重启失败，但服务可能已正常运行${NC}"
    }
    echo -e "${GREEN}✅ Nginx配置成功${NC}"
else
    echo -e "${RED}❌ Nginx配置错误${NC}"
    echo "配置测试失败，将继续但Nginx可能无法正常工作"
fi

# 设置文件权限
echo -e "${BLUE}🔒 设置文件权限...${NC}"
chown -R $REAL_USER:$REAL_USER $PROJECT_DIR
chmod -R 755 static/ media/ 2>/dev/null || true
chmod -R 644 logs/ 2>/dev/null || true
chmod 600 .env 2>/dev/null || true

echo ""
echo -e "${GREEN}🎉 CentOS部署完成！${NC}"
echo ""
echo "📋 部署信息:"
echo "   操作系统: CentOS/RHEL $OS_VERSION"
echo "   项目目录: $PROJECT_DIR"
echo "   运行用户: $REAL_USER"
echo "   服务名称: $SERVICE_NAME"
echo "   服务器IP: $SERVER_IP"
echo "   本地访问: http://localhost"
echo "   远程访问: http://$SERVER_IP"
echo "   数据库: SQLite"
echo ""
echo "🔧 常用命令:"
echo "   查看服务状态: systemctl status $SERVICE_NAME"
echo "   重启服务: systemctl restart $SERVICE_NAME"
echo "   查看日志: tail -f $PROJECT_DIR/logs/django.log"
echo "   查看Nginx日志: tail -f /var/log/nginx/access.log"
echo ""
echo "🔒 数据库信息:"
echo "   数据库类型: SQLite"
echo "   数据库文件: db.sqlite3"
echo ""
echo -e "${YELLOW}⚠️  重要提醒:${NC}"
echo "1. 请使用 python3 create_admin_secure.py 创建管理员账户"
echo "2. 如需配置域名，请编辑 /etc/nginx/conf.d/biostatistics-django.conf"
echo "3. 如需SSL证书，请安装certbot并运行: certbot --nginx -d your-domain.com"
echo "4. 定期检查系统更新和安全补丁"
echo "5. 监控系统资源使用情况"
echo ""
echo -e "${GREEN}✅ CentOS部署成功完成！${NC}"

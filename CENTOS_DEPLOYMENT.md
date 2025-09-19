# 🐧 CentOS系统部署指南

## 系统要求

- CentOS 7/8/9 或 RHEL 7/8/9
- 最少2GB内存
- 最少20GB磁盘空间
- root权限或sudo权限

## 快速部署

### 方式一：自动部署（推荐）

```bash
# 1. 下载项目文件到服务器
# 2. 确保已完成安全修复（参考QUICK_FIX.md）
# 3. 运行CentOS部署脚本
chmod +x deploy_centos.sh
sudo ./deploy_centos.sh
```

### 方式二：手动部署

#### 1. 系统准备

```bash
# 更新系统
sudo yum update -y  # CentOS 7
# 或
sudo dnf update -y  # CentOS 8/9

# 安装EPEL仓库
sudo yum install -y epel-release  # CentOS 7
# 或
sudo dnf install -y epel-release  # CentOS 8/9
```

#### 2. 安装Python 3.9+

```bash
# CentOS 7
sudo yum install -y python39 python39-pip python39-devel

# CentOS 8/9
sudo dnf install -y python39 python39-pip python39-devel

# 设置Python3默认版本
sudo alternatives --install /usr/bin/python3 python3 /usr/bin/python3.9 1
```

#### 3. 安装系统依赖

```bash
# 开发工具
sudo yum groupinstall -y "Development Tools"  # CentOS 7
# 或
sudo dnf groupinstall -y "Development Tools"  # CentOS 8/9

# Web服务器和数据库
sudo yum install -y nginx postgresql-server postgresql-contrib postgresql-devel  # CentOS 7
# 或
sudo dnf install -y nginx postgresql-server postgresql-contrib postgresql-devel  # CentOS 8/9

# 图像处理库依赖
sudo yum install -y libjpeg-devel zlib-devel freetype-devel lcms2-devel libwebp-devel  # CentOS 7
# 或
sudo dnf install -y libjpeg-devel zlib-devel freetype-devel lcms2-devel libwebp-devel  # CentOS 8/9
```

#### 4. 配置PostgreSQL

```bash
# 初始化数据库
sudo postgresql-setup initdb  # CentOS 7
# 或
sudo postgresql-setup --initdb  # CentOS 8/9

# 启动并启用PostgreSQL
sudo systemctl enable postgresql
sudo systemctl start postgresql

# 创建数据库和用户
sudo -u postgres psql << EOF
CREATE USER biostatistics_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE biostatistics_course OWNER biostatistics_user;
GRANT ALL PRIVILEGES ON DATABASE biostatistics_course TO biostatistics_user;
\q
EOF
```

#### 5. 配置SELinux

```bash
# 检查SELinux状态
getenforce

# 如果是Enforcing，配置相关策略
sudo setsebool -P httpd_can_network_connect 1
sudo setsebool -P httpd_can_network_relay 1
sudo setsebool -P httpd_execmem 1

# 为项目目录设置SELinux上下文
sudo semanage fcontext -a -t httpd_exec_t "/var/www/biostatistics-django/venv/bin/gunicorn"
sudo restorecon -Rv /var/www/biostatistics-django/
```

#### 6. 配置防火墙

```bash
# 开放HTTP和HTTPS端口
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# 查看开放的端口
sudo firewall-cmd --list-all
```

#### 7. 项目部署

```bash
# 创建项目目录
sudo mkdir -p /var/www/biostatistics-django
sudo chown $USER:$USER /var/www/biostatistics-django
cd /var/www/biostatistics-django

# 上传项目文件或克隆仓库
# git clone <your-repository> .

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install --upgrade pip
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑.env文件

# 数据库迁移
python manage.py migrate --settings=biostatistics_course.settings_production

# 收集静态文件
python manage.py collectstatic --noinput --settings=biostatistics_course.settings_production

# 创建管理员用户
python create_admin_secure.py
```

#### 8. 配置systemd服务

```bash
# 创建服务文件
sudo tee /etc/systemd/system/biostatistics-django.service > /dev/null << EOF
[Unit]
Description=Biostatistics Django Application
After=network.target

[Service]
Type=notify
User=$USER
Group=$USER
WorkingDirectory=/var/www/biostatistics-django
Environment=PATH=/var/www/biostatistics-django/venv/bin
Environment=DJANGO_SETTINGS_MODULE=biostatistics_course.settings_production
ExecStart=/var/www/biostatistics-django/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8000 biostatistics_course.wsgi:application
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 启用并启动服务
sudo systemctl daemon-reload
sudo systemctl enable biostatistics-django
sudo systemctl start biostatistics-django
```

#### 9. 配置Nginx

```bash
# 创建Nginx配置文件
sudo tee /etc/nginx/conf.d/biostatistics-django.conf > /dev/null << EOF
server {
    listen 80;
    server_name your-domain.com;  # 替换为您的域名

    client_max_body_size 100M;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location /static/ {
        alias /var/www/biostatistics-django/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias /var/www/biostatistics-django/media/;
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

# 测试并重启Nginx
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
```

## SSL证书配置

### 使用Let's Encrypt

```bash
# 安装certbot
sudo yum install -y certbot python2-certbot-nginx  # CentOS 7
# 或
sudo dnf install -y certbot python3-certbot-nginx  # CentOS 8/9

# 获取SSL证书
sudo certbot --nginx -d your-domain.com

# 设置自动续期
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## CentOS特有配置

### 1. SELinux配置

```bash
# 查看SELinux状态
sestatus

# 临时关闭SELinux（不推荐）
sudo setenforce 0

# 永久关闭SELinux（不推荐）
sudo sed -i 's/SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config

# 推荐：配置SELinux策略
sudo setsebool -P httpd_can_network_connect 1
sudo setsebool -P httpd_can_network_relay 1
sudo setsebool -P httpd_execmem 1
```

### 2. 防火墙配置

```bash
# 查看防火墙状态
sudo systemctl status firewalld

# 开放特定端口
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload

# 查看开放的端口
sudo firewall-cmd --list-ports
```

### 3. 系统服务管理

```bash
# 查看服务状态
sudo systemctl status biostatistics-django
sudo systemctl status nginx
sudo systemctl status postgresql

# 重启服务
sudo systemctl restart biostatistics-django
sudo systemctl restart nginx

# 查看服务日志
sudo journalctl -u biostatistics-django -f
sudo journalctl -u nginx -f
```

## 故障排除

### 常见问题

1. **Python版本问题**
```bash
# 检查Python版本
python3 --version

# 如果版本过低，安装Python 3.9
sudo yum install -y python39
sudo alternatives --install /usr/bin/python3 python3 /usr/bin/python3.9 1
```

2. **权限问题**
```bash
# 检查文件权限
ls -la /var/www/biostatistics-django/

# 修复权限
sudo chown -R $USER:$USER /var/www/biostatistics-django/
sudo chmod -R 755 /var/www/biostatistics-django/
```

3. **SELinux问题**
```bash
# 查看SELinux拒绝日志
sudo ausearch -m AVC -ts recent

# 生成SELinux策略
sudo audit2allow -M myapp < /var/log/audit/audit.log
sudo semodule -i myapp.pp
```

4. **防火墙问题**
```bash
# 检查端口是否开放
sudo ss -tlnp | grep :80
sudo ss -tlnp | grep :8000

# 临时关闭防火墙测试
sudo systemctl stop firewalld
```

5. **数据库连接问题**
```bash
# 检查PostgreSQL状态
sudo systemctl status postgresql

# 测试数据库连接
sudo -u postgres psql -l

# 检查数据库配置
sudo cat /var/lib/pgsql/data/postgresql.conf
sudo cat /var/lib/pgsql/data/pg_hba.conf
```

## 性能优化

### 1. 系统优化

```bash
# 调整文件描述符限制
echo "* soft nofile 65535" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65535" | sudo tee -a /etc/security/limits.conf

# 调整内核参数
echo "net.core.somaxconn = 65535" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 2. Nginx优化

```bash
# 编辑Nginx配置
sudo nano /etc/nginx/nginx.conf

# 添加以下配置
worker_processes auto;
worker_connections 1024;
keepalive_timeout 65;
client_max_body_size 100M;
```

### 3. PostgreSQL优化

```bash
# 编辑PostgreSQL配置
sudo nano /var/lib/pgsql/data/postgresql.conf

# 调整以下参数
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
```

## 监控和维护

### 1. 系统监控

```bash
# 安装监控工具
sudo yum install -y htop iotop nethogs  # CentOS 7
# 或
sudo dnf install -y htop iotop nethogs  # CentOS 8/9

# 查看系统资源
htop
iotop
nethogs
```

### 2. 日志管理

```bash
# 配置日志轮转
sudo tee /etc/logrotate.d/biostatistics-django > /dev/null << EOF
/var/www/biostatistics-django/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
}
EOF
```

### 3. 自动备份

```bash
# 创建备份脚本
cat > /var/www/biostatistics-django/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/biostatistics-django"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# 备份数据库
pg_dump -h localhost -U biostatistics_user biostatistics_course > $BACKUP_DIR/db_backup_$DATE.sql

# 备份媒体文件
tar -czf $BACKUP_DIR/media_backup_$DATE.tar.gz /var/www/biostatistics-django/media/

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x /var/www/biostatistics-django/backup.sh

# 添加定时任务
echo "0 2 * * * /var/www/biostatistics-django/backup.sh" | crontab -
```

---

**重要提醒**：
- CentOS 7将于2024年6月30日停止支持，建议升级到CentOS 8/9或迁移到Rocky Linux/AlmaLinux
- 定期更新系统和软件包
- 监控系统资源使用情况
- 定期检查安全日志
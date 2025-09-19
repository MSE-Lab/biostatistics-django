# 🚀 生物统计学课程平台部署指南

## ⚠️ 部署前必读

**🚨 安全警告**: 项目中发现了多个高危安全问题，**必须**在部署前修复！

### 发现的高危安全问题
1. ❌ 硬编码的SECRET_KEY
2. ❌ 硬编码的管理员密码
3. ❌ 硬编码的教师密码
4. ❌ DEBUG=True（生产环境）
5. ❌ ALLOWED_HOSTS为空
6. ❌ 缺少.env配置文件
7. ❌ 数据库文件权限过宽

## 🔧 部署前安全修复（必须完成）

### 1. 立即修复安全问题

```bash
# 1. 创建环境配置文件
cp .env.example .env

# 2. 生成新的SECRET_KEY
python -c "from django.core.management.utils import get_random_secret_key; print('DJANGO_SECRET_KEY=' + get_random_secret_key())" >> .env

# 3. 编辑.env文件，填入正确的配置
nano .env
```

### 2. 使用安全脚本创建用户

```bash
# 创建管理员（安全方式）
python create_admin_secure.py

# 创建教师用户（安全方式）
python create_teacher_secure.py
```

### 3. 删除不安全的脚本

```bash
# 删除包含硬编码密码的脚本
rm create_admin.py create_teacher_user.py
```

### 4. 设置正确的文件权限

```bash
# 设置.env文件权限
chmod 600 .env

# 设置数据库文件权限
chmod 600 db.sqlite3

# 设置敏感文件权限
chmod 600 biostatistics_course/settings*.py
```

## 🏗️ 部署步骤

### 方式一：自动部署（推荐）

```bash
# 1. 确保已完成安全修复
python security_check.py

# 2. 运行自动部署脚本
sudo ./deploy.sh
```

### 方式二：手动部署

#### 1. 环境准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要软件
sudo apt install -y python3 python3-pip python3-venv nginx
```

#### 2. 数据库配置（使用SQLite）

```bash
# SQLite数据库无需额外配置
# 项目会自动创建 db.sqlite3 文件
echo "使用SQLite数据库，无需额外配置"
```

#### 3. 项目部署

```bash
# 创建项目目录
sudo mkdir -p /var/www/biostatistics-django
sudo chown $USER:$USER /var/www/biostatistics-django
cd /var/www/biostatistics-django

# 克隆项目（或上传文件）
# git clone <your-repository> .

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑.env文件，填入正确配置

# 数据库迁移
python manage.py migrate --settings=biostatistics_course.settings_production

# 收集静态文件
python manage.py collectstatic --noinput --settings=biostatistics_course.settings_production

# 创建管理员用户
python create_admin_secure.py
```

#### 4. 系统服务配置

```bash
# 创建systemd服务文件
sudo nano /etc/systemd/system/biostatistics-django.service
```

服务文件内容：
```ini
[Unit]
Description=Biostatistics Django Application
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/biostatistics-django
Environment=PATH=/var/www/biostatistics-django/venv/bin
Environment=DJANGO_SETTINGS_MODULE=biostatistics_course.settings_production
ExecStart=/var/www/biostatistics-django/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8000 biostatistics_course.wsgi:application
ExecReload=/bin/kill -s HUP $MAINPID
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
# 启用并启动服务
sudo systemctl daemon-reload
sudo systemctl enable biostatistics-django
sudo systemctl start biostatistics-django
```

#### 5. Nginx配置

```bash
# 创建Nginx配置
sudo nano /etc/nginx/sites-available/biostatistics-django
```

Nginx配置内容：
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为您的域名
    
    client_max_body_size 100M;
    
    # 静态文件
    location /static/ {
        alias /var/www/biostatistics-django/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # 媒体文件
    location /media/ {
        alias /var/www/biostatistics-django/media/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # 应用代理
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/biostatistics-django /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 SSL证书配置（强烈推荐）

### 使用Let's Encrypt免费证书

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加以下行：
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 监控和维护

### 1. 日志监控

```bash
# 查看应用日志
tail -f /var/www/biostatistics-django/logs/django.log

# 查看系统服务日志
sudo journalctl -u biostatistics-django -f

# 查看Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. 性能监控

```bash
# 系统资源监控
htop

# 数据库连接监控
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# 磁盘空间监控
df -h
```

### 3. 定期维护

```bash
# 数据库备份（每日凌晨2点）
crontab -e
# 添加：0 2 * * * cd /var/www/biostatistics-django && ./backup.sh

# 系统更新（每周）
sudo apt update && sudo apt upgrade

# 日志清理（每月）
sudo find /var/log -name "*.log" -mtime +30 -delete
```

## 🚨 故障排除

### 常见问题

1. **服务无法启动**
```bash
sudo systemctl status biostatistics-django
sudo journalctl -u biostatistics-django --no-pager
```

2. **静态文件404**
```bash
python manage.py collectstatic --settings=biostatistics_course.settings_production
sudo systemctl reload nginx
```

3. **数据库连接错误**
```bash
# 检查数据库服务
sudo systemctl status postgresql
# 检查连接配置
sudo -u postgres psql -l
```

4. **权限问题**
```bash
sudo chown -R www-data:www-data /var/www/biostatistics-django
sudo chmod -R 755 /var/www/biostatistics-django
sudo chmod 600 /var/www/biostatistics-django/.env
```

## 📋 部署检查清单

### 部署前检查
- [ ] 运行安全检查：`python security_check.py`
- [ ] 所有高危安全问题已修复
- [ ] .env文件已正确配置
- [ ] 数据库连接已测试
- [ ] SSL证书已配置
- [ ] 防火墙规则已设置

### 部署后验证
- [ ] 网站可正常访问
- [ ] HTTPS重定向正常
- [ ] 管理后台可登录
- [ ] 静态文件加载正常
- [ ] 用户注册登录正常
- [ ] 作业系统功能正常
- [ ] 模拟器功能正常
- [ ] 讨论区功能正常

### 安全验证
- [ ] 默认密码已全部更改
- [ ] DEBUG模式已关闭
- [ ] ALLOWED_HOSTS已正确设置
- [ ] 文件权限已正确设置
- [ ] 日志记录正常工作
- [ ] 备份系统已配置

## 📞 技术支持

如遇到部署问题，请：

1. 查看日志文件
2. 运行安全检查脚本
3. 检查系统资源使用情况
4. 联系技术支持团队

---

**重要提醒**: 
- 🔥 **必须**完成所有安全修复才能部署到生产环境
- 🔒 定期更新系统和依赖包
- 📊 监控系统性能和安全状况
- 💾 定期备份数据库和重要文件

**部署成功后，请立即删除所有包含默认密码的文件！**
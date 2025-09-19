# 安全检查清单

## 🚨 发现的安全问题

### 1. 硬编码密码和密钥
- ❌ `biostatistics_course/settings.py` 中包含硬编码的 SECRET_KEY
- ❌ `create_admin.py` 中包含硬编码的管理员密码
- ❌ `create_teacher_user.py` 中包含硬编码的教师密码

### 2. 调试模式
- ❌ 生产环境中 `DEBUG = True`
- ❌ `ALLOWED_HOSTS = []` 允许任何主机访问

### 3. 数据库安全
- ⚠️ 使用SQLite数据库（不适合生产环境）
- ⚠️ 没有数据库备份策略

## ✅ 部署前必须完成的安全修复

### 1. 立即修复 - 高危
```bash
# 1. 生成新的SECRET_KEY
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# 2. 修改所有默认密码
python manage.py changepassword admin

# 3. 使用生产环境配置
export DJANGO_SETTINGS_MODULE=biostatistics_course.settings_production
```

### 2. 配置环境变量
```bash
# 创建 .env 文件
cp .env.example .env
# 编辑 .env 文件，填入实际值
```

### 3. 数据库配置（SQLite）
```bash
# 使用SQLite数据库，无需额外配置
# 确保数据库文件权限正确
chmod 644 db.sqlite3

# 导出现有数据
python manage.py dumpdata > data_backup.json

# 配置新数据库后导入
python manage.py loaddata data_backup.json
```

### 4. Web服务器配置
```nginx
# Nginx配置示例
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location /static/ {
        alias /path/to/staticfiles/;
    }
    
    location /media/ {
        alias /path/to/media/;
    }
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔒 安全最佳实践

### 1. 密码策略
- ✅ 强制使用复杂密码
- ✅ 定期更换密码
- ✅ 启用双因素认证（如需要）

### 2. 访问控制
- ✅ 最小权限原则
- ✅ 定期审查用户权限
- ✅ 记录访问日志

### 3. 数据保护
- ✅ 定期备份数据库
- ✅ 加密敏感数据
- ✅ 安全的文件上传

### 4. 网络安全
- ✅ 使用HTTPS
- ✅ 配置防火墙
- ✅ 限制管理后台访问IP

### 5. 监控和日志
- ✅ 启用详细日志记录
- ✅ 监控异常访问
- ✅ 设置安全告警

## 📋 部署检查清单

### 部署前检查
- [ ] SECRET_KEY已更改
- [ ] DEBUG设置为False
- [ ] ALLOWED_HOSTS已正确配置
- [ ] 所有默认密码已更改
- [ ] 数据库连接已配置
- [ ] 静态文件路径已设置
- [ ] SSL证书已安装
- [ ] 防火墙规则已配置

### 部署后检查
- [ ] 网站可正常访问
- [ ] HTTPS重定向工作正常
- [ ] 管理后台可正常登录
- [ ] 静态文件加载正常
- [ ] 媒体文件上传正常
- [ ] 数据库连接正常
- [ ] 日志记录正常

### 定期维护
- [ ] 定期更新Django版本
- [ ] 定期备份数据库
- [ ] 监控系统资源使用
- [ ] 检查安全日志
- [ ] 更新SSL证书

## 🚨 紧急响应

### 如果发现安全问题
1. 立即下线网站
2. 分析问题范围
3. 修复安全漏洞
4. 更改所有密码
5. 检查访问日志
6. 通知相关用户

### 联系方式
- 技术负责人: [联系方式]
- 紧急联系: [紧急联系方式]

---
**重要提醒**: 这份清单必须在部署前完全执行，确保系统安全！
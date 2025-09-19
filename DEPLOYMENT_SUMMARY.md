# 📋 部署总结指南

## 🎯 快速选择部署方案

### 1. 检查系统兼容性
```bash
python3 system_check.py
```

### 2. 根据系统选择部署脚本

| 操作系统 | 部署脚本 | 配置文件 | 快速修复 |
|---------|---------|---------|---------|
| Ubuntu/Debian | `deploy.sh` | `DEPLOYMENT_GUIDE.md` | `QUICK_FIX.md` |
| CentOS/RHEL | `deploy_centos.sh` | `CENTOS_DEPLOYMENT.md` | `QUICK_FIX_CENTOS.md` |
| macOS | 手动部署 | `README.md` | 开发环境 |
| Windows | WSL/Docker | `README.md` | 不推荐 |

## 🚨 部署前必须完成的安全修复

### 立即执行（所有系统通用）

```bash
# 1. 安全检查
python3 security_check.py

# 2. 快速修复
cp .env.example .env
python3 -c "from django.core.management.utils import get_random_secret_key; print('DJANGO_SECRET_KEY=' + get_random_secret_key())" >> .env
chmod 600 .env
python3 create_admin_secure.py
rm create_admin.py create_teacher_user.py

# 3. 验证修复
python3 security_check.py
```

### CentOS系统额外步骤

```bash
# SELinux配置
sudo setsebool -P httpd_can_network_connect 1

# 防火墙配置
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 🚀 一键部署命令

### Ubuntu/Debian系统
```bash
# 完整部署流程
python3 system_check.py && \
python3 security_check.py && \
sudo ./deploy.sh
```

### CentOS/RHEL系统
```bash
# 完整部署流程
python3 system_check.py && \
python3 security_check.py && \
sudo ./deploy_centos.sh
```

## 📁 项目文件说明

### 核心文件
- `manage.py` - Django管理脚本
- `requirements.txt` - Python依赖列表
- `pyproject.toml` - 项目配置

### 配置文件
- `biostatistics_course/settings.py` - 开发环境配置
- `biostatistics_course/settings_production.py` - 生产环境配置
- `.env.example` - 环境变量模板
- `.env` - 实际环境变量（需要创建）

### 部署脚本
- `deploy.sh` - Ubuntu/Debian自动部署
- `deploy_centos.sh` - CentOS/RHEL自动部署
- `system_check.py` - 系统兼容性检查
- `security_check.py` - 安全问题检查

### 用户管理脚本
- `create_admin_secure.py` - 安全创建管理员
- `create_teacher_secure.py` - 安全创建教师
- ~~`create_admin.py`~~ - 不安全，已删除
- ~~`create_teacher_user.py`~~ - 不安全，已删除

### 文档
- `README.md` - 项目总体介绍
- `DEPLOYMENT_GUIDE.md` - Ubuntu/Debian部署指南
- `CENTOS_DEPLOYMENT.md` - CentOS/RHEL部署指南
- `SECURITY_CHECKLIST.md` - 安全检查清单
- `QUICK_FIX.md` - Ubuntu快速修复
- `QUICK_FIX_CENTOS.md` - CentOS快速修复

## 🔒 安全检查清单

### 部署前检查
- [ ] 运行 `python3 security_check.py`
- [ ] 所有高危问题已修复
- [ ] `.env` 文件已正确配置
- [ ] 默认密码已全部更改
- [ ] 不安全文件已删除

### 部署后验证
- [ ] 网站可正常访问
- [ ] 管理后台可登录
- [ ] 静态文件加载正常
- [ ] 用户注册登录正常
- [ ] 所有功能模块正常

### 生产环境安全
- [ ] HTTPS已配置
- [ ] 防火墙已设置
- [ ] 备份系统已配置
- [ ] 监控系统已设置
- [ ] 日志记录正常

## 🛠️ 常用维护命令

### 服务管理
```bash
# 查看服务状态
sudo systemctl status biostatistics-django
sudo systemctl status nginx
# 检查SQLite数据库状态
ls -la db.sqlite3

# 重启服务
sudo systemctl restart biostatistics-django
sudo systemctl restart nginx

# 查看日志
sudo journalctl -u biostatistics-django -f
tail -f /var/www/biostatistics-django/logs/django.log
```

### 数据库管理
```bash
# 数据库迁移
python manage.py migrate --settings=biostatistics_course.settings_production

# 创建超级用户
python create_admin_secure.py

# 数据库备份
./backup.sh
```

### 静态文件管理
```bash
# 收集静态文件
python manage.py collectstatic --settings=biostatistics_course.settings_production

# 清理静态文件
rm -rf staticfiles/*
```

## 🔧 故障排除

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
   sudo systemctl status postgresql
   sudo -u postgres psql -l
   ```

4. **权限问题**
   ```bash
   sudo chown -R www-data:www-data /var/www/biostatistics-django  # Ubuntu
   sudo chown -R nginx:nginx /var/www/biostatistics-django        # CentOS
   ```

### 系统特定问题

**CentOS系统**:
- SELinux策略问题
- 防火墙端口未开放
- Python版本过低

**Ubuntu系统**:
- UFW防火墙配置
- AppArmor策略问题
- 包依赖冲突

## 📊 性能优化建议

### 系统级优化
```bash
# 调整文件描述符限制
echo "* soft nofile 65535" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65535" | sudo tee -a /etc/security/limits.conf

# 调整内核参数
echo "net.core.somaxconn = 65535" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 应用级优化
- 使用Redis缓存
- 配置CDN加速
- 数据库查询优化
- 静态文件压缩

## 📞 技术支持

### 获取帮助
1. 查看相关文档
2. 运行诊断脚本
3. 检查系统日志
4. 联系技术支持

### 诊断命令
```bash
# 系统诊断
python3 system_check.py

# 安全诊断
python3 security_check.py

# Django诊断
python manage.py check --deploy --settings=biostatistics_course.settings_production
```

---

**🎉 部署成功标志**:
- ✅ 网站可通过域名访问
- ✅ HTTPS证书正常工作
- ✅ 所有功能模块正常
- ✅ 安全检查无高危问题
- ✅ 备份和监控系统运行正常

**记住**: 部署只是开始，定期维护和安全更新同样重要！
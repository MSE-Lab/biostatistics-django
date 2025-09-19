# 🚨 CentOS系统紧急安全修复指南

## 立即执行（5分钟内完成）

### 1. 系统检查

```bash
# 检查系统兼容性
python3 system_check.py

# 检查安全问题
python3 security_check.py
```

### 2. 创建安全的环境配置

```bash
# 复制环境配置模板
cp .env.example .env

# 生成新的SECRET_KEY并添加到.env
python3 -c "
from django.core.management.utils import get_random_secret_key
import os
key = get_random_secret_key()
with open('.env', 'a') as f:
    f.write(f'DJANGO_SECRET_KEY={key}\n')
    f.write('DJANGO_DEBUG=False\n')
    f.write('DJANGO_ALLOWED_HOSTS=your-domain.com,your-server-ip\n')
print('✅ 安全配置已生成')
"
```

### 3. 设置文件权限（CentOS特有）

```bash
# 设置安全的文件权限
chmod 600 .env
chmod 600 db.sqlite3 2>/dev/null || true

# 设置SELinux上下文（如果启用SELinux）
if command -v getenforce &> /dev/null && [ "$(getenforce)" = "Enforcing" ]; then
    # 为项目目录设置正确的SELinux上下文
    sudo semanage fcontext -a -t httpd_exec_t "$(pwd)/venv/bin/gunicorn" 2>/dev/null || true
    sudo restorecon -Rv $(pwd) 2>/dev/null || true
    echo "✅ SELinux上下文已设置"
fi

echo "✅ 文件权限已设置"
```

### 4. 删除不安全的文件

```bash
# 重命名包含硬编码密码的文件
mv create_admin.py create_admin.py.unsafe 2>/dev/null || true
mv create_teacher_user.py create_teacher_user.py.unsafe 2>/dev/null || true

echo "✅ 不安全的文件已重命名"
```

### 5. 创建安全的管理员账户

```bash
# 使用安全脚本创建管理员
python3 create_admin_secure.py
```

### 6. 验证修复

```bash
# 运行安全检查
python3 security_check.py

# 如果仍有高危问题，请手动修复
```

## CentOS系统一键修复脚本

```bash
#!/bin/bash
# CentOS系统一键安全修复脚本

echo "🚨 开始CentOS系统紧急安全修复..."

# 检测CentOS版本
if [ -f /etc/redhat-release ]; then
    CENTOS_VERSION=$(rpm -q --queryformat '%{VERSION}' centos-release 2>/dev/null || echo "unknown")
    echo "检测到CentOS版本: $CENTOS_VERSION"
else
    echo "⚠️  未检测到CentOS系统，继续执行..."
fi

# 1. 创建.env文件
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ 创建.env文件"
fi

# 2. 生成SECRET_KEY
python3 -c "
from django.core.management.utils import get_random_secret_key
import os
key = get_random_secret_key()
with open('.env', 'w') as f:
    f.write(f'DJANGO_SECRET_KEY={key}\n')
    f.write('DJANGO_DEBUG=False\n')
    f.write('DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1\n')
print('✅ 安全配置已生成')
"

# 3. 设置权限
chmod 600 .env
chmod 600 db.sqlite3 2>/dev/null || true

# 4. 配置SELinux（如果启用）
if command -v getenforce &> /dev/null && [ "$(getenforce)" = "Enforcing" ]; then
    echo "🔒 配置SELinux..."
    
    # 设置布尔值
    sudo setsebool -P httpd_can_network_connect 1 2>/dev/null || true
    sudo setsebool -P httpd_can_network_relay 1 2>/dev/null || true
    sudo setsebool -P httpd_execmem 1 2>/dev/null || true
    
    # 设置文件上下文
    sudo semanage fcontext -a -t httpd_exec_t "$(pwd)/venv/bin/gunicorn" 2>/dev/null || true
    sudo restorecon -Rv $(pwd) 2>/dev/null || true
    
    echo "✅ SELinux配置完成"
fi

# 5. 配置防火墙（如果启用）
if systemctl is-active --quiet firewalld; then
    echo "🔥 配置防火墙..."
    sudo firewall-cmd --permanent --add-service=http 2>/dev/null || true
    sudo firewall-cmd --permanent --add-service=https 2>/dev/null || true
    sudo firewall-cmd --reload 2>/dev/null || true
    echo "✅ 防火墙配置完成"
fi

# 6. 重命名不安全文件
mv create_admin.py create_admin.py.unsafe 2>/dev/null || true
mv create_teacher_user.py create_teacher_user.py.unsafe 2>/dev/null || true

echo "🔒 CentOS安全修复完成！"
echo "📋 下一步："
echo "1. 编辑.env文件，设置正确的ALLOWED_HOSTS"
echo "2. 运行: python3 create_admin_secure.py"
echo "3. 运行: python3 security_check.py"
echo "4. 运行: sudo ./deploy_centos.sh"
```

## CentOS特有配置

### SELinux配置

```bash
# 检查SELinux状态
getenforce

# 如果是Enforcing模式，配置策略
if [ "$(getenforce)" = "Enforcing" ]; then
    # 允许HTTP连接
    sudo setsebool -P httpd_can_network_connect 1
    sudo setsebool -P httpd_can_network_relay 1
    sudo setsebool -P httpd_execmem 1
    
    # 设置文件上下文
    sudo semanage fcontext -a -t httpd_exec_t "/var/www/biostatistics-django/venv/bin/gunicorn"
    sudo restorecon -Rv /var/www/biostatistics-django/
    
    echo "✅ SELinux策略配置完成"
fi
```

### 防火墙配置

```bash
# 检查防火墙状态
sudo systemctl status firewalld

# 开放必要端口
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=8000/tcp  # 开发环境
sudo firewall-cmd --reload

# 查看开放的服务
sudo firewall-cmd --list-all
```

### 包管理器配置

```bash
# CentOS 7
sudo yum update -y
sudo yum install -y epel-release

# CentOS 8/9
sudo dnf update -y
sudo dnf install -y epel-release

# 安装Python 3.9+
# CentOS 7
sudo yum install -y python39 python39-pip python39-devel

# CentOS 8/9
sudo dnf install -y python39 python39-pip python39-devel

# 设置Python3默认版本
sudo alternatives --install /usr/bin/python3 python3 /usr/bin/python3.9 1
```

## 验证修复结果

```bash
# 1. 系统检查
python3 system_check.py

# 2. 安全检查
python3 security_check.py

# 3. 检查SELinux状态
if command -v getenforce &> /dev/null; then
    echo "SELinux状态: $(getenforce)"
fi

# 4. 检查防火墙状态
if systemctl is-active --quiet firewalld; then
    echo "防火墙状态: 运行中"
    sudo firewall-cmd --list-services
else
    echo "防火墙状态: 未运行"
fi

# 5. 检查Python版本
python3 --version

# 6. 测试应用启动
python3 manage.py check --deploy --settings=biostatistics_course.settings_production
```

## 常见CentOS问题解决

### 1. Python版本过低

```bash
# 安装Python 3.9
sudo yum install -y python39 python39-pip python39-devel
sudo alternatives --install /usr/bin/python3 python3 /usr/bin/python3.9 1

# 验证版本
python3 --version
```

### 2. SELinux阻止访问

```bash
# 查看SELinux拒绝日志
sudo ausearch -m AVC -ts recent

# 生成并安装策略
sudo audit2allow -M myapp < /var/log/audit/audit.log
sudo semodule -i myapp.pp

# 或者临时关闭SELinux（不推荐）
sudo setenforce 0
```

### 3. 防火墙阻止连接

```bash
# 检查端口是否开放
sudo ss -tlnp | grep :80
sudo ss -tlnp | grep :8000

# 开放端口
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### 4. 权限问题

```bash
# 检查文件所有者
ls -la /var/www/biostatistics-django/

# 修复权限
sudo chown -R nginx:nginx /var/www/biostatistics-django/
sudo chmod -R 755 /var/www/biostatistics-django/
sudo chmod 600 /var/www/biostatistics-django/.env
```

### 5. 数据库连接问题

```bash
# 检查PostgreSQL状态
sudo systemctl status postgresql

# 启动PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 测试连接
sudo -u postgres psql -l
```

## 部署后验证

```bash
# 1. 检查服务状态
sudo systemctl status biostatistics-django
sudo systemctl status nginx
sudo systemctl status postgresql

# 2. 检查端口监听
sudo ss -tlnp | grep :80
sudo ss -tlnp | grep :8000

# 3. 测试网站访问
curl -I http://localhost

# 4. 检查日志
sudo journalctl -u biostatistics-django -f
tail -f /var/www/biostatistics-django/logs/django.log
```

---

**⚠️ CentOS特别提醒**：
- CentOS 7将于2024年6月30日停止支持
- 建议迁移到Rocky Linux或AlmaLinux
- SELinux和防火墙配置是CentOS部署的关键
- 定期更新系统和安全补丁
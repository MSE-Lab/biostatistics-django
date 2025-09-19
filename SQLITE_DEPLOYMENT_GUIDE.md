# 🗄️ SQLite部署指南

## 概述

biostatistics-django项目使用SQLite数据库，这是一个轻量级、无服务器的数据库，非常适合中小型项目。

## SQLite的优势

✅ **无需额外配置** - 数据库文件自动创建  
✅ **零维护成本** - 无需数据库服务器  
✅ **高性能** - 对于中小型应用性能优异  
✅ **可靠性** - 经过广泛测试，稳定可靠  
✅ **便携性** - 单个文件包含整个数据库  

## 部署步骤

### 1. 环境配置

```bash
# .env文件配置（SQLite无需数据库配置）
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=your-domain.com,your-server-ip
```

### 2. 数据库迁移

```bash
# 激活虚拟环境
source venv/bin/activate

# 执行数据库迁移
python manage.py migrate --settings=biostatistics_course.settings_production

# 创建管理员用户
python create_admin_secure.py
```

### 3. 文件权限设置

```bash
# 设置数据库文件权限
chmod 644 db.sqlite3
chown www-data:www-data db.sqlite3  # Ubuntu/Debian
# 或
chown nginx:nginx db.sqlite3        # CentOS

# 设置项目目录权限
chmod 755 /var/www/biostatistics-django
```

## 数据库管理

### 备份数据库

```bash
# 方法1：直接复制文件
cp db.sqlite3 backup/db_$(date +%Y%m%d_%H%M%S).sqlite3

# 方法2：使用Django命令
python manage.py dumpdata > backup/data_$(date +%Y%m%d_%H%M%S).json
```

### 恢复数据库

```bash
# 方法1：恢复文件
cp backup/db_20241201_120000.sqlite3 db.sqlite3

# 方法2：从JSON恢复
python manage.py loaddata backup/data_20241201_120000.json
```

### 数据库维护

```bash
# 检查数据库完整性
python manage.py dbshell --settings=biostatistics_course.settings_production
# 在SQLite shell中执行：
# PRAGMA integrity_check;

# 优化数据库
# VACUUM;

# 查看数据库信息
# .schema
# .tables
# .quit
```

## 监控和故障排除

### 检查数据库状态

```bash
# 检查数据库文件
ls -la db.sqlite3
file db.sqlite3

# 检查文件权限
stat db.sqlite3

# 测试数据库连接
python manage.py check --settings=biostatistics_course.settings_production
```

### 常见问题解决

#### 1. 数据库文件权限错误

```bash
# 错误：database is locked
sudo chown www-data:www-data db.sqlite3
sudo chmod 644 db.sqlite3
```

#### 2. 数据库文件不存在

```bash
# 重新创建数据库
python manage.py migrate --settings=biostatistics_course.settings_production
```

#### 3. 磁盘空间不足

```bash
# 检查磁盘空间
df -h

# 清理日志文件
sudo find /var/log -name "*.log" -mtime +7 -delete
```

## 性能优化

### SQLite配置优化

在`settings_production.py`中已包含以下优化：

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
        'OPTIONS': {
            'timeout': 20,
            'check_same_thread': False,
        }
    }
}
```

### 系统级优化

```bash
# 1. 使用SSD存储
# 2. 定期备份数据库
# 3. 监控磁盘空间
# 4. 设置合适的文件权限
```

## 迁移到PostgreSQL（可选）

如果将来需要迁移到PostgreSQL：

```bash
# 1. 导出数据
python manage.py dumpdata > data_export.json

# 2. 安装PostgreSQL
sudo apt install postgresql postgresql-contrib

# 3. 创建数据库和用户
sudo -u postgres createdb biostatistics_course
sudo -u postgres createuser biostatistics_user

# 4. 修改settings配置
# 5. 执行迁移
python manage.py migrate

# 6. 导入数据
python manage.py loaddata data_export.json
```

## 总结

SQLite是biostatistics-django项目的理想选择：
- 适合教学环境的中小型用户量
- 零配置，易于部署和维护
- 性能满足课程平台需求
- 备份和恢复简单直接

对于生物统计学课程平台这样的教学应用，SQLite提供了完美的平衡：简单性、可靠性和足够的性能。
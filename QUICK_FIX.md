# 🚨 紧急安全修复指南

## 立即执行（5分钟内完成）

### 1. 创建安全的环境配置

```bash
# 复制环境配置模板
cp .env.example .env

# 生成新的SECRET_KEY并添加到.env
python -c "
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

### 2. 修改settings.py使用环境变量

```bash
# 备份原始设置文件
cp biostatistics_course/settings.py biostatistics_course/settings.py.backup

# 创建安全的设置文件
cat > biostatistics_course/settings.py << 'EOF'
import os
from pathlib import Path

# 从环境变量读取配置
BASE_DIR = Path(__file__).resolve().parent.parent

# 安全配置
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'CHANGE-THIS-IN-PRODUCTION')
DEBUG = os.environ.get('DJANGO_DEBUG', 'False').lower() == 'true'
ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', '').split(',')

# 其他配置保持不变...
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "core",
    "simulators",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "biostatistics_course.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "biostatistics_course.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "zh-hans"
TIME_ZONE = "Asia/Shanghai"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = 'core.User'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
LOGIN_URL = '/login/'
LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/'
EOF

echo "✅ settings.py已更新为安全版本"
```

### 3. 设置文件权限

```bash
# 设置安全的文件权限
chmod 600 .env
chmod 600 db.sqlite3
chmod 644 biostatistics_course/settings.py

echo "✅ 文件权限已设置"
```

### 4. 删除不安全的文件

```bash
# 重命名包含硬编码密码的文件
mv create_admin.py create_admin.py.unsafe
mv create_teacher_user.py create_teacher_user.py.unsafe

echo "✅ 不安全的文件已重命名"
```

### 5. 创建安全的管理员账户

```bash
# 使用安全脚本创建管理员
python create_admin_secure.py
```

### 6. 验证修复

```bash
# 运行安全检查
python security_check.py

# 如果仍有高危问题，请手动修复
```

## 完整修复脚本（一键执行）

```bash
#!/bin/bash
# 一键安全修复脚本

echo "🚨 开始紧急安全修复..."

# 1. 创建.env文件
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ 创建.env文件"
fi

# 2. 生成SECRET_KEY
python -c "
from django.core.management.utils import get_random_secret_key
import os
key = get_random_secret_key()
with open('.env', 'w') as f:
    f.write(f'DJANGO_SECRET_KEY={key}\n')
    f.write('DJANGO_DEBUG=False\n')
    f.write('DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1\n')
print('✅ 安全配置已生成')
"

# 3. 备份并更新settings.py
cp biostatistics_course/settings.py biostatistics_course/settings.py.backup

# 4. 设置权限
chmod 600 .env
chmod 600 db.sqlite3 2>/dev/null || true

# 5. 重命名不安全文件
mv create_admin.py create_admin.py.unsafe 2>/dev/null || true
mv create_teacher_user.py create_teacher_user.py.unsafe 2>/dev/null || true

echo "🔒 安全修复完成！"
echo "📋 下一步："
echo "1. 编辑.env文件，设置正确的ALLOWED_HOSTS"
echo "2. 运行: python create_admin_secure.py"
echo "3. 运行: python security_check.py"
```

## 验证修复结果

```bash
# 1. 检查环境变量
source .env
echo "SECRET_KEY: ${DJANGO_SECRET_KEY:0:20}..."
echo "DEBUG: $DJANGO_DEBUG"
echo "ALLOWED_HOSTS: $DJANGO_ALLOWED_HOSTS"

# 2. 运行安全检查
python security_check.py

# 3. 测试应用启动
python manage.py check --deploy
```

## 如果仍有问题

1. **SECRET_KEY问题**：确保.env文件中的DJANGO_SECRET_KEY已设置
2. **ALLOWED_HOSTS问题**：在.env中设置正确的域名和IP
3. **权限问题**：运行 `chmod 600 .env db.sqlite3`
4. **导入错误**：确保已安装所有依赖 `pip install -r requirements.txt`

---

**⚠️ 重要提醒**：
- 修复后立即运行 `python security_check.py` 验证
- 在生产环境中使用 `settings_production.py`
- 定期更新密码和密钥
- 监控访问日志
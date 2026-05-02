#!/usr/bin/env python
"""创建管理员账户脚本"""
import os
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biostatistics_course.settings')
django.setup()

from core.models import User

# 创建管理员账户
admin_user, created = User.objects.get_or_create(
    username='admin',
    defaults={
        'real_name': '系统管理员',
        'user_type': 'admin',
        'is_staff': True,
        'is_superuser': True,
        'email': 'admin@biostatistics.edu.cn'
    }
)

if created:
    admin_user.set_password('Zxy&429-')
    admin_user.save()
    print("✅ 管理员账户创建成功！")
    print(f"用户名: {admin_user.username}")
    print("密码: Zxy&429-")
else:
    print("⚠️ 管理员账户已存在")
    # 更新密码以防万一
    admin_user.set_password('Zxy&429-')
    admin_user.save()
    print("✅ 管理员密码已更新")
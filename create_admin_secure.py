#!/usr/bin/env python
"""
安全的管理员账户创建脚本
使用方法: python create_admin_secure.py
"""
import os
import sys
import django
import getpass
from django.core.management.utils import get_random_secret_key

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biostatistics_course.settings')
django.setup()

from core.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

def create_admin_user():
    """安全地创建管理员账户"""
    
    print("🔐 创建管理员账户")
    print("=" * 50)
    
    # 检查是否已有管理员
    existing_admin = User.objects.filter(username='admin').first()
    if existing_admin:
        print("⚠️  管理员账户已存在")
        choice = input("是否要重置密码? (y/N): ").lower().strip()
        if choice != 'y':
            print("操作已取消")
            return
        user = existing_admin
    else:
        # 获取管理员信息
        username = input("管理员用户名 [admin]: ").strip() or 'admin'
        real_name = input("真实姓名 [系统管理员]: ").strip() or '系统管理员'
        email = input("邮箱地址: ").strip()
        
        if not email:
            print("❌ 邮箱地址不能为空")
            return
        
        # 创建用户
        user = User(
            username=username,
            real_name=real_name,
            user_type='admin',
            is_staff=True,
            is_superuser=True,
            email=email
        )
    
    # 设置密码
    while True:
        password = getpass.getpass("请输入管理员密码: ")
        if not password:
            print("❌ 密码不能为空")
            continue
            
        password_confirm = getpass.getpass("请确认密码: ")
        if password != password_confirm:
            print("❌ 两次输入的密码不一致")
            continue
        
        # 验证密码强度
        try:
            validate_password(password, user)
            break
        except ValidationError as e:
            print("❌ 密码不符合要求:")
            for error in e.messages:
                print(f"   - {error}")
            continue
    
    # 保存用户
    user.set_password(password)
    user.save()
    
    if existing_admin:
        print("✅ 管理员密码重置成功！")
    else:
        print("✅ 管理员账户创建成功！")
    
    print(f"   用户名: {user.username}")
    print(f"   姓名: {user.real_name}")
    print(f"   邮箱: {user.email}")
    print("\n🔒 请妥善保管登录信息，不要与他人分享！")

def generate_secret_key():
    """生成新的SECRET_KEY"""
    print("\n🔑 生成新的SECRET_KEY")
    print("=" * 50)
    new_key = get_random_secret_key()
    print("请将以下SECRET_KEY添加到您的环境变量或.env文件中:")
    print(f"DJANGO_SECRET_KEY={new_key}")
    print("\n⚠️  请立即更新配置文件并重启服务！")

if __name__ == '__main__':
    try:
        create_admin_user()
        
        # 询问是否生成新的SECRET_KEY
        choice = input("\n是否生成新的SECRET_KEY? (y/N): ").lower().strip()
        if choice == 'y':
            generate_secret_key()
            
    except KeyboardInterrupt:
        print("\n\n操作已取消")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 发生错误: {str(e)}")
        sys.exit(1)
#!/usr/bin/env python
"""
安全的教师用户创建脚本
使用方法: python create_teacher_secure.py
"""
import os
import sys
import django
import getpass

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biostatistics_course.settings')
django.setup()

from core.models import User, TeacherProfile
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

def create_teacher_user():
    """安全地创建教师用户"""
    
    print("👨‍🏫 创建教师账户")
    print("=" * 50)
    
    # 显示现有教师
    existing_teachers = User.objects.filter(user_type='teacher')
    if existing_teachers.exists():
        print("现有教师用户:")
        for teacher in existing_teachers:
            print(f"  - {teacher.username} ({teacher.real_name})")
        print()
    
    # 获取教师基本信息
    username = input("教师用户名: ").strip()
    if not username:
        print("❌ 用户名不能为空")
        return
    
    # 检查用户名是否已存在
    if User.objects.filter(username=username).exists():
        print(f"❌ 用户名 '{username}' 已存在")
        return
    
    real_name = input("真实姓名: ").strip()
    if not real_name:
        print("❌ 真实姓名不能为空")
        return
    
    email = input("邮箱地址: ").strip()
    if not email:
        print("❌ 邮箱地址不能为空")
        return
    
    # 获取教师详细信息
    title = input("职称 [讲师]: ").strip() or '讲师'
    degree = input("学位 [硕士]: ").strip() or '硕士'
    major = input("专业 [生物统计学]: ").strip() or '生物统计学'
    research_direction = input("研究方向: ").strip()
    bio = input("个人简介: ").strip()
    
    # 创建用户对象（用于密码验证）
    user = User(
        username=username,
        real_name=real_name,
        email=email,
        user_type='teacher'
    )
    
    # 设置密码
    while True:
        password = getpass.getpass("请输入教师密码: ")
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
    
    try:
        # 创建用户
        teacher = User.objects.create_user(
            username=username,
            password=password,
            real_name=real_name,
            email=email,
            user_type='teacher'
        )
        
        # 创建教师详细信息
        TeacherProfile.objects.create(
            user=teacher,
            title=title,
            degree=degree,
            major=major,
            research_direction=research_direction,
            bio=bio
        )
        
        print("\n✅ 教师账户创建成功！")
        print(f"   用户名: {teacher.username}")
        print(f"   姓名: {teacher.real_name}")
        print(f"   邮箱: {teacher.email}")
        print(f"   职称: {title}")
        print("\n🔒 请妥善保管登录信息，不要与他人分享！")
        
    except Exception as e:
        print(f"❌ 创建教师用户失败: {str(e)}")

if __name__ == '__main__':
    try:
        create_teacher_user()
    except KeyboardInterrupt:
        print("\n\n操作已取消")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 发生错误: {str(e)}")
        sys.exit(1)
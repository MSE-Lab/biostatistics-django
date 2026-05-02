#!/usr/bin/env python
"""
创建教师用户的脚本
运行方式: python create_teacher_user.py
"""

import os
import sys
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biostatistics_course.settings')
django.setup()

from core.models import User, TeacherProfile

def create_teacher_user():
    """创建教师用户"""
    
    # 检查是否已有教师用户
    existing_teachers = User.objects.filter(user_type='teacher')
    print(f"当前教师用户数量: {existing_teachers.count()}")
    
    if existing_teachers.exists():
        print("现有教师用户:")
        for teacher in existing_teachers:
            print(f"  - {teacher.username} ({teacher.real_name})")
        return
    
    # 创建教师用户
    teacher_data = {
        'username': 'teacher001',
        'real_name': '张教授',
        'email': 'teacher@example.com',
        'user_type': 'teacher'
    }
    
    try:
        # 创建用户
        teacher = User.objects.create_user(
            username=teacher_data['username'],
            password='teacher123',  # 默认密码
            real_name=teacher_data['real_name'],
            email=teacher_data['email'],
            user_type=teacher_data['user_type']
        )
        
        # 创建教师详细信息
        TeacherProfile.objects.create(
            user=teacher,
            title='教授',
            degree='博士',
            major='生物统计学',
            research_direction='生物统计学方法研究',
            bio='专注于生物统计学教学和研究多年，具有丰富的教学经验。'
        )
        
        print(f"✅ 成功创建教师用户:")
        print(f"   用户名: {teacher.username}")
        print(f"   密码: teacher123")
        print(f"   姓名: {teacher.real_name}")
        print(f"   邮箱: {teacher.email}")
        print(f"\n🎯 现在可以使用此账号登录并测试教学班管理功能！")
        
    except Exception as e:
        print(f"❌ 创建教师用户失败: {str(e)}")

if __name__ == '__main__':
    print("🚀 检查和创建教师用户...")
    create_teacher_user()
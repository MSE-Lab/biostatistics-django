#!/usr/bin/env python
"""
创建初始专业班级数据的脚本
运行方式: python create_initial_classes.py
"""

import os
import sys
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biostatistics_course.settings')
django.setup()

from core.models import Class

def create_initial_classes():
    """创建初始的专业班级"""
    classes_data = [
        {
            'name': 'bio_elite',
            'description': '生物科学拔尖计划2.0基地班，培养生物科学领域的拔尖创新人才'
        },
        {
            'name': 'bio_base',
            'description': '国家生物学基地班，培养生物学基础研究人才'
        },
        {
            'name': 'biotech_base',
            'description': '国家生命科学与技术基地班，培养生物技术应用人才'
        },
        {
            'name': 'bio_science',
            'description': '生物科学专业，培养生物科学基础人才'
        },
        {
            'name': 'bio_technology',
            'description': '生物技术专业，培养生物技术应用人才'
        }
    ]
    
    created_count = 0
    for class_data in classes_data:
        class_obj, created = Class.objects.get_or_create(
            name=class_data['name'],
            defaults={'description': class_data['description']}
        )
        if created:
            created_count += 1
            print(f"✅ 创建专业班级: {class_obj.get_name_display()}")
        else:
            print(f"ℹ️  专业班级已存在: {class_obj.get_name_display()}")
    
    print(f"\n🎉 完成！共创建了 {created_count} 个专业班级")
    print(f"📊 当前总共有 {Class.objects.count()} 个专业班级")

if __name__ == '__main__':
    create_initial_classes()
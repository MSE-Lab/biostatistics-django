#!/usr/bin/env python
"""
创建讨论区初始分类数据的脚本
运行方式: python create_forum_categories.py
"""

import os
import sys
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biostatistics_course.settings')
django.setup()

from core.models import ForumCategory

def create_forum_categories():
    """创建讨论区分类"""
    categories = [
        {
            'name': '课程讨论',
            'description': '关于生物统计学课程内容的讨论，包括概念理解、习题解答等',
            'icon': '📚',
            'order': 1
        },
        {
            'name': '作业答疑',
            'description': '课程作业相关问题的讨论和答疑',
            'icon': '✏️',
            'order': 2
        },
        {
            'name': 'R语言编程',
            'description': 'R语言编程技巧、代码分享和问题解决',
            'icon': '💻',
            'order': 3
        },
        {
            'name': '统计软件',
            'description': 'SPSS、SAS、Python等统计软件的使用交流',
            'icon': '🔧',
            'order': 4
        },
        {
            'name': '学习资源',
            'description': '分享有用的学习资料、参考书籍、在线资源等',
            'icon': '📖',
            'order': 5
        },
        {
            'name': '考试复习',
            'description': '期中期末考试复习资料分享和讨论',
            'icon': '📝',
            'order': 6
        },
        {
            'name': '实际应用',
            'description': '生物统计学在实际研究中的应用案例分享',
            'icon': '🔬',
            'order': 7
        },
        {
            'name': '闲聊灌水',
            'description': '轻松愉快的日常交流，分享学习生活中的趣事',
            'icon': '💬',
            'order': 8
        }
    ]
    
    created_count = 0
    for category_data in categories:
        category, created = ForumCategory.objects.get_or_create(
            name=category_data['name'],
            defaults=category_data
        )
        if created:
            created_count += 1
            print(f"✅ 创建分类: {category.name}")
        else:
            print(f"⚠️  分类已存在: {category.name}")
    
    print(f"\n🎉 完成！共创建了 {created_count} 个新分类")
    print(f"📊 当前总分类数: {ForumCategory.objects.count()}")

if __name__ == '__main__':
    print("🚀 开始创建讨论区分类...")
    create_forum_categories()
#!/usr/bin/env python
"""
项目安全检查脚本
检查常见的安全问题和配置错误
"""
import os
import re
import sys
from pathlib import Path

class SecurityChecker:
    def __init__(self):
        self.issues = []
        self.warnings = []
        self.project_root = Path(__file__).parent
    
    def add_issue(self, severity, file_path, line_num, message):
        """添加安全问题"""
        self.issues.append({
            'severity': severity,
            'file': file_path,
            'line': line_num,
            'message': message
        })
    
    def add_warning(self, file_path, line_num, message):
        """添加警告"""
        self.warnings.append({
            'file': file_path,
            'line': line_num,
            'message': message
        })
    
    def check_hardcoded_secrets(self):
        """检查硬编码的密钥和密码"""
        print("🔍 检查硬编码的密钥和密码...")
        
        patterns = [
            (r'SECRET_KEY\s*=\s*["\']django-insecure-.*["\']', '硬编码的SECRET_KEY'),
            (r'password\s*=\s*["\'][^"\']+["\']', '硬编码的密码'),
            (r'PASSWORD\s*=\s*["\'][^"\']+["\']', '硬编码的密码'),
            (r'set_password\(["\'][^"\']+["\']\)', '硬编码的密码'),
            (r'api_key\s*=\s*["\'][^"\']+["\']', '硬编码的API密钥'),
            (r'token\s*=\s*["\'][^"\']+["\']', '硬编码的令牌'),
        ]
        
        for py_file in self.project_root.rglob('*.py'):
            if '.venv' in str(py_file) or '__pycache__' in str(py_file):
                continue
                
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    
                for line_num, line in enumerate(lines, 1):
                    for pattern, description in patterns:
                        if re.search(pattern, line, re.IGNORECASE):
                            self.add_issue('HIGH', py_file, line_num, f'{description}: {line.strip()}')
            except Exception as e:
                self.add_warning(py_file, 0, f'无法读取文件: {e}')
    
    def check_debug_settings(self):
        """检查调试设置"""
        print("🔍 检查调试设置...")
        
        settings_files = list(self.project_root.rglob('settings*.py'))
        
        for settings_file in settings_files:
            try:
                with open(settings_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    
                for line_num, line in enumerate(lines, 1):
                    if re.search(r'DEBUG\s*=\s*True', line):
                        if 'production' not in str(settings_file):
                            self.add_issue('MEDIUM', settings_file, line_num, 
                                         'DEBUG=True 在生产环境中应设为False')
                    
                    if re.search(r'ALLOWED_HOSTS\s*=\s*\[\s*\]', line):
                        self.add_issue('HIGH', settings_file, line_num, 
                                     'ALLOWED_HOSTS为空，允许任何主机访问')
            except Exception as e:
                self.add_warning(settings_file, 0, f'无法读取文件: {e}')
    
    def check_sql_injection(self):
        """检查潜在的SQL注入风险"""
        print("🔍 检查SQL注入风险...")
        
        dangerous_patterns = [
            (r'\.raw\s*\(.*%.*\)', 'raw SQL查询可能存在注入风险'),
            (r'\.extra\s*\(.*%.*\)', 'extra查询可能存在注入风险'),
            (r'cursor\.execute\s*\(.*%.*\)', '直接SQL执行可能存在注入风险'),
        ]
        
        for py_file in self.project_root.rglob('*.py'):
            if '.venv' in str(py_file) or '__pycache__' in str(py_file):
                continue
                
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    
                for line_num, line in enumerate(lines, 1):
                    for pattern, description in dangerous_patterns:
                        if re.search(pattern, line):
                            self.add_issue('MEDIUM', py_file, line_num, f'{description}: {line.strip()}')
            except Exception as e:
                self.add_warning(py_file, 0, f'无法读取文件: {e}')
    
    def check_xss_risks(self):
        """检查XSS风险"""
        print("🔍 检查XSS风险...")
        
        for html_file in self.project_root.rglob('*.html'):
            try:
                with open(html_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    lines = content.split('\n')
                    
                for line_num, line in enumerate(lines, 1):
                    # 检查未转义的变量输出
                    if re.search(r'\{\{\s*[^|]*\s*\}\}', line) and '|safe' not in line:
                        if any(var in line.lower() for var in ['user_input', 'comment', 'message', 'content']):
                            self.add_warning(html_file, line_num, 
                                           f'可能的XSS风险，未转义的用户输入: {line.strip()}')
            except Exception as e:
                self.add_warning(html_file, 0, f'无法读取文件: {e}')
    
    def check_file_permissions(self):
        """检查文件权限"""
        print("🔍 检查文件权限...")
        
        sensitive_files = [
            'manage.py',
            'settings.py',
            'settings_production.py',
            '.env',
            'db.sqlite3'
        ]
        
        for file_name in sensitive_files:
            file_path = self.project_root / file_name
            if file_path.exists():
                stat = file_path.stat()
                mode = oct(stat.st_mode)[-3:]
                
                if file_name == '.env' and mode != '600':
                    self.add_issue('HIGH', file_path, 0, f'.env文件权限过于宽松: {mode}')
                elif file_name == 'db.sqlite3' and mode[2] != '0':
                    self.add_issue('MEDIUM', file_path, 0, f'数据库文件对其他用户可读: {mode}')
    
    def check_environment_config(self):
        """检查环境配置"""
        print("🔍 检查环境配置...")
        
        env_file = self.project_root / '.env'
        if not env_file.exists():
            self.add_issue('HIGH', env_file, 0, '.env文件不存在，可能使用默认配置')
        else:
            try:
                with open(env_file, 'r') as f:
                    content = f.read()
                    
                if 'your-very-long-and-random-secret-key-here' in content:
                    self.add_issue('HIGH', env_file, 0, '.env文件包含示例SECRET_KEY')
                
                if 'your-database-password' in content:
                    self.add_issue('HIGH', env_file, 0, '.env文件包含示例数据库密码')
                    
            except Exception as e:
                self.add_warning(env_file, 0, f'无法读取.env文件: {e}')
    
    def run_all_checks(self):
        """运行所有安全检查"""
        print("🛡️  开始安全检查...")
        print("=" * 60)
        
        self.check_hardcoded_secrets()
        self.check_debug_settings()
        self.check_sql_injection()
        self.check_xss_risks()
        self.check_file_permissions()
        self.check_environment_config()
        
        self.print_results()
    
    def print_results(self):
        """打印检查结果"""
        print("\n" + "=" * 60)
        print("🛡️  安全检查结果")
        print("=" * 60)
        
        if not self.issues and not self.warnings:
            print("✅ 未发现安全问题！")
            return
        
        # 打印高危问题
        high_issues = [i for i in self.issues if i['severity'] == 'HIGH']
        if high_issues:
            print("\n🚨 高危安全问题:")
            for issue in high_issues:
                print(f"   📁 {issue['file']}")
                if issue['line']:
                    print(f"   📍 第{issue['line']}行")
                print(f"   ❌ {issue['message']}")
                print()
        
        # 打印中危问题
        medium_issues = [i for i in self.issues if i['severity'] == 'MEDIUM']
        if medium_issues:
            print("\n⚠️  中危安全问题:")
            for issue in medium_issues:
                print(f"   📁 {issue['file']}")
                if issue['line']:
                    print(f"   📍 第{issue['line']}行")
                print(f"   ⚠️  {issue['message']}")
                print()
        
        # 打印警告
        if self.warnings:
            print("\n💡 警告信息:")
            for warning in self.warnings:
                print(f"   📁 {warning['file']}")
                if warning['line']:
                    print(f"   📍 第{warning['line']}行")
                print(f"   💡 {warning['message']}")
                print()
        
        # 统计
        total_issues = len(self.issues)
        total_warnings = len(self.warnings)
        
        print(f"\n📊 检查统计:")
        print(f"   🚨 高危问题: {len(high_issues)}")
        print(f"   ⚠️  中危问题: {len(medium_issues)}")
        print(f"   💡 警告信息: {total_warnings}")
        print(f"   📋 总计: {total_issues + total_warnings}")
        
        if high_issues:
            print(f"\n🔥 请立即修复 {len(high_issues)} 个高危安全问题！")
            return 1
        elif medium_issues:
            print(f"\n⚠️  建议修复 {len(medium_issues)} 个中危安全问题")
            return 0
        else:
            print("\n✅ 未发现严重安全问题")
            return 0

if __name__ == '__main__':
    checker = SecurityChecker()
    exit_code = checker.run_all_checks()
    sys.exit(exit_code)
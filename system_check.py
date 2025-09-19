#!/usr/bin/env python3
"""
系统兼容性检查脚本
检查当前系统环境并推荐合适的部署方案
"""

import os
import sys
import subprocess
import platform
import shutil
from pathlib import Path

class SystemChecker:
    def __init__(self):
        self.os_info = {}
        self.python_info = {}
        self.recommendations = []
        self.warnings = []
        self.errors = []
    
    def detect_os(self):
        """检测操作系统"""
        print("🔍 检测操作系统...")
        
        system = platform.system()
        self.os_info['system'] = system
        
        if system == 'Linux':
            # 检测Linux发行版
            if os.path.exists('/etc/os-release'):
                with open('/etc/os-release', 'r') as f:
                    content = f.read()
                    
                if 'Ubuntu' in content:
                    self.os_info['distro'] = 'Ubuntu'
                    # 获取Ubuntu版本
                    try:
                        result = subprocess.run(['lsb_release', '-r'], 
                                              capture_output=True, text=True)
                        if result.returncode == 0:
                            version = result.stdout.split('\t')[1].strip()
                            self.os_info['version'] = version
                    except:
                        pass
                        
                elif 'Debian' in content:
                    self.os_info['distro'] = 'Debian'
                    
                elif 'CentOS' in content or 'Red Hat' in content:
                    self.os_info['distro'] = 'CentOS/RHEL'
                    # 获取CentOS版本
                    if os.path.exists('/etc/redhat-release'):
                        with open('/etc/redhat-release', 'r') as f:
                            release = f.read().strip()
                            self.os_info['version'] = release
                            
                elif 'Rocky' in content:
                    self.os_info['distro'] = 'Rocky Linux'
                    
                elif 'AlmaLinux' in content:
                    self.os_info['distro'] = 'AlmaLinux'
                    
                else:
                    self.os_info['distro'] = 'Unknown Linux'
            else:
                self.os_info['distro'] = 'Unknown Linux'
                
        elif system == 'Darwin':
            self.os_info['distro'] = 'macOS'
            self.os_info['version'] = platform.mac_ver()[0]
            
        elif system == 'Windows':
            self.os_info['distro'] = 'Windows'
            self.os_info['version'] = platform.win32_ver()[1]
            
        else:
            self.os_info['distro'] = 'Unknown'
    
    def check_python(self):
        """检查Python版本"""
        print("🐍 检查Python环境...")
        
        self.python_info['version'] = sys.version
        self.python_info['version_info'] = sys.version_info
        
        # 检查Python版本是否满足要求
        if sys.version_info >= (3, 9):
            self.python_info['compatible'] = True
        else:
            self.python_info['compatible'] = False
            self.errors.append(f"Python版本过低: {sys.version_info}, 需要3.9+")
    
    def check_commands(self):
        """检查必要的命令"""
        print("🔧 检查系统命令...")
        
        required_commands = {
            'git': '版本控制',
            'pip3': 'Python包管理器',
        }
        
        optional_commands = {
            'nginx': 'Web服务器',
            'postgresql': '数据库服务器',
            'systemctl': '系统服务管理',
            'firewall-cmd': '防火墙管理 (CentOS)',
            'ufw': '防火墙管理 (Ubuntu)',
            'certbot': 'SSL证书管理',
        }
        
        self.commands = {'required': {}, 'optional': {}}
        
        # 检查必需命令
        for cmd, desc in required_commands.items():
            if shutil.which(cmd):
                self.commands['required'][cmd] = True
            else:
                self.commands['required'][cmd] = False
                self.errors.append(f"缺少必需命令: {cmd} ({desc})")
        
        # 检查可选命令
        for cmd, desc in optional_commands.items():
            if shutil.which(cmd):
                self.commands['optional'][cmd] = True
            else:
                self.commands['optional'][cmd] = False
                self.warnings.append(f"建议安装: {cmd} ({desc})")
    
    def check_ports(self):
        """检查端口占用"""
        print("🌐 检查端口占用...")
        
        important_ports = [80, 443, 8000, 5432]
        self.ports = {}
        
        for port in important_ports:
            try:
                result = subprocess.run(['ss', '-tlnp'], 
                                      capture_output=True, text=True)
                if result.returncode == 0:
                    if f':{port} ' in result.stdout:
                        self.ports[port] = 'occupied'
                        if port in [80, 443]:
                            self.warnings.append(f"端口{port}已被占用，可能需要停止现有Web服务")
                    else:
                        self.ports[port] = 'free'
                else:
                    self.ports[port] = 'unknown'
            except:
                self.ports[port] = 'unknown'
    
    def check_permissions(self):
        """检查权限"""
        print("🔒 检查权限...")
        
        self.permissions = {}
        
        # 检查是否有sudo权限
        try:
            result = subprocess.run(['sudo', '-n', 'true'], 
                                  capture_output=True, text=True)
            self.permissions['sudo'] = result.returncode == 0
        except:
            self.permissions['sudo'] = False
        
        if not self.permissions['sudo']:
            self.errors.append("需要sudo权限进行系统级安装")
        
        # 检查当前用户
        self.permissions['user'] = os.getenv('USER', 'unknown')
        if self.permissions['user'] == 'root':
            self.warnings.append("不建议使用root用户直接运行应用")
    
    def generate_recommendations(self):
        """生成推荐方案"""
        print("💡 生成推荐方案...")
        
        distro = self.os_info.get('distro', 'Unknown')
        
        if distro in ['Ubuntu', 'Debian']:
            self.recommendations.append({
                'title': '推荐使用Ubuntu/Debian部署脚本',
                'command': 'sudo ./deploy.sh',
                'description': '自动安装所有依赖并配置服务'
            })
            
        elif distro in ['CentOS/RHEL', 'Rocky Linux', 'AlmaLinux']:
            self.recommendations.append({
                'title': '推荐使用CentOS部署脚本',
                'command': 'sudo ./deploy_centos.sh',
                'description': '针对Red Hat系列系统优化的部署脚本'
            })
            
        elif distro == 'macOS':
            self.recommendations.append({
                'title': '开发环境设置',
                'command': 'python manage.py runserver',
                'description': 'macOS适合开发环境，不建议用于生产部署'
            })
            
        elif distro == 'Windows':
            self.recommendations.append({
                'title': '使用WSL或Docker',
                'command': 'wsl --install',
                'description': 'Windows建议使用WSL2或Docker进行部署'
            })
            
        else:
            self.recommendations.append({
                'title': '手动部署',
                'command': '参考DEPLOYMENT_GUIDE.md',
                'description': '未识别的系统，请参考手动部署指南'
            })
        
        # 添加安全检查推荐
        self.recommendations.append({
            'title': '安全检查',
            'command': 'python security_check.py',
            'description': '部署前必须运行安全检查并修复所有高危问题'
        })
    
    def print_results(self):
        """打印检查结果"""
        print("\n" + "="*60)
        print("🖥️  系统兼容性检查结果")
        print("="*60)
        
        # 系统信息
        print(f"\n📋 系统信息:")
        print(f"   操作系统: {self.os_info.get('system', 'Unknown')}")
        print(f"   发行版: {self.os_info.get('distro', 'Unknown')}")
        if 'version' in self.os_info:
            print(f"   版本: {self.os_info['version']}")
        
        # Python信息
        print(f"\n🐍 Python信息:")
        print(f"   版本: {self.python_info['version_info']}")
        if self.python_info['compatible']:
            print("   ✅ 版本兼容")
        else:
            print("   ❌ 版本不兼容")
        
        # 权限信息
        print(f"\n🔒 权限信息:")
        print(f"   当前用户: {self.permissions.get('user', 'unknown')}")
        if self.permissions.get('sudo', False):
            print("   ✅ 具有sudo权限")
        else:
            print("   ❌ 缺少sudo权限")
        
        # 端口信息
        print(f"\n🌐 端口状态:")
        for port, status in self.ports.items():
            status_icon = "✅" if status == "free" else "⚠️" if status == "occupied" else "❓"
            print(f"   端口{port}: {status_icon} {status}")
        
        # 命令检查
        print(f"\n🔧 命令检查:")
        print("   必需命令:")
        for cmd, available in self.commands['required'].items():
            icon = "✅" if available else "❌"
            print(f"     {cmd}: {icon}")
        
        print("   可选命令:")
        for cmd, available in self.commands['optional'].items():
            icon = "✅" if available else "⚠️"
            print(f"     {cmd}: {icon}")
        
        # 错误和警告
        if self.errors:
            print(f"\n❌ 错误 ({len(self.errors)}):")
            for error in self.errors:
                print(f"   • {error}")
        
        if self.warnings:
            print(f"\n⚠️  警告 ({len(self.warnings)}):")
            for warning in self.warnings:
                print(f"   • {warning}")
        
        # 推荐方案
        print(f"\n💡 推荐方案:")
        for i, rec in enumerate(self.recommendations, 1):
            print(f"   {i}. {rec['title']}")
            print(f"      命令: {rec['command']}")
            print(f"      说明: {rec['description']}")
            print()
        
        # 总结
        print("📊 检查总结:")
        if not self.errors:
            print("   ✅ 系统环境检查通过")
        else:
            print(f"   ❌ 发现 {len(self.errors)} 个错误，需要修复")
        
        if self.warnings:
            print(f"   ⚠️  有 {len(self.warnings)} 个警告")
        
        print(f"\n🚀 下一步:")
        if self.errors:
            print("   1. 修复所有错误")
            print("   2. 重新运行系统检查")
        else:
            print("   1. 运行安全检查: python security_check.py")
            print("   2. 选择合适的部署方案")
        
        return len(self.errors)
    
    def run_all_checks(self):
        """运行所有检查"""
        print("🔍 开始系统兼容性检查...")
        print("="*60)
        
        self.detect_os()
        self.check_python()
        self.check_commands()
        self.check_ports()
        self.check_permissions()
        self.generate_recommendations()
        
        return self.print_results()

def main():
    """主函数"""
    checker = SystemChecker()
    exit_code = checker.run_all_checks()
    
    if exit_code > 0:
        print(f"\n❌ 系统检查失败，发现 {exit_code} 个错误")
        sys.exit(1)
    else:
        print(f"\n✅ 系统检查通过，可以继续部署")
        sys.exit(0)

if __name__ == '__main__':
    main()
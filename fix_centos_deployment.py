#!/usr/bin/env python3
"""
CentOS部署问题修复脚本
运行方法: python3 fix_centos_deployment.py
"""

import os
import sys
import subprocess
from pathlib import Path

def run_command(command, shell=False):
    """运行命令并返回结果"""
    try:
        result = subprocess.run(command, shell=shell, capture_output=True, text=True, check=True)
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"命令执行失败: {command}")
        print(f"错误信息: {e.stderr}")
        return None

def check_env_file():
    """检查并创建.env文件"""
    env_file = Path('.env')
    env_example = Path('.env.example')

    if not env_file.exists():
        print("❌ .env文件不存在")

        if env_example.exists():
            print("📋 复制.env.example到.env...")
            run_command('cp .env.example .env')
        else:
            print("📋 创建.env文件...")
            secret_key = run_command('python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"')
            if secret_key:
                with open('.env', 'w') as f:
                    f.write(f'DJANGO_SECRET_KEY={secret_key.strip()}\n')
                    f.write('DJANGO_DEBUG=False\n')
                    f.write('DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1\n')

        # 设置文件权限
        run_command('chmod 600 .env')
        print("✅ .env文件已创建")
    else:
        print("✅ .env文件已存在")

def check_python_version():
    """检查Python版本"""
    version = run_command('python3 --version')
    if version:
        print(f"📋 Python版本: {version.strip()}")

        # 检查是否为Python 3.9+
        if '3.9' not in version and '3.10' not in version and '3.11' not in version:
            print("⚠️ 建议使用Python 3.9或更高版本")
            return False
    return True

def check_system_dependencies():
    """检查系统依赖"""
    print("📦 检查系统依赖...")

    # 检查必要的命令
    required_commands = ['git', 'nginx', 'gcc', 'python3']
    missing_commands = []

    for cmd in required_commands:
        if not run_command(f'which {cmd}'):
            missing_commands.append(cmd)

    if missing_commands:
        print(f"❌ 缺少命令: {', '.join(missing_commands)}")
        print("请手动安装这些依赖")
        return False

    print("✅ 系统依赖检查通过")
    return True

def fix_selinux():
    """修复SELinux配置"""
    print("🔒 配置SELinux...")

    # 检查SELinux状态
    selinux_status = run_command('getenforce')
    if not selinux_status:
        print("ℹ️ SELinux未启用或未安装")
        return True

    print(f"SELinux状态: {selinux_status.strip()}")

    if 'Enforcing' in selinux_status:
        # 设置SELinux布尔值
        run_command('sudo setsebool -P httpd_can_network_connect 1', shell=True)
        run_command('sudo setsebool -P httpd_can_network_relay 1', shell=True)

        # 设置文件上下文（如果semanage可用）
        if run_command('which semanage'):
            project_dir = Path.cwd()
            run_command(f'sudo semanage fcontext -a -t httpd_sys_content_t "{project_dir}(/.*)?"', shell=True)
            run_command(f'sudo restorecon -Rv {project_dir}', shell=True)

        print("✅ SELinux配置完成")
    else:
        print("ℹ️ SELinux未启用，跳过配置")

    return True

def fix_firewall():
    """修复防火墙配置"""
    print("🔥 配置防火墙...")

    # 检查防火墙状态
    firewall_status = run_command('sudo systemctl is-active firewalld', shell=True)
    if not firewall_status or 'inactive' in firewall_status:
        print("ℹ️ 防火墙未运行，跳过配置")
        return True

    # 开放必要端口
    run_command('sudo firewall-cmd --permanent --add-service=http', shell=True)
    run_command('sudo firewall-cmd --permanent --add-service=https', shell=True)
    run_command('sudo firewall-cmd --reload', shell=True)

    print("✅ 防火墙配置完成")
    return True

def fix_file_permissions():
    """修复文件权限"""
    print("🔒 设置文件权限...")

    project_dir = Path.cwd()

    # 设置基本权限
    run_command(f'sudo chown -R nginx:nginx {project_dir}', shell=True)
    run_command(f'sudo chmod -R 755 {project_dir}', shell=True)

    # 设置敏感文件权限
    if Path('.env').exists():
        run_command('chmod 600 .env', shell=True)

    if Path('db.sqlite3').exists():
        run_command('chmod 644 db.sqlite3', shell=True)

    print("✅ 文件权限设置完成")
    return True

def main():
    """主函数"""
    print("🚀 开始CentOS部署修复...")
    print("=" * 50)

    # 检查是否为CentOS系统
    if not Path('/etc/redhat-release').exists():
        print("⚠️ 此脚本专为CentOS/RHEL系统设计")
        print("继续执行...")

    # 执行修复步骤
    checks = [
        (".env文件检查", check_env_file),
        ("Python版本检查", check_python_version),
        ("系统依赖检查", check_system_dependencies),
        ("SELinux配置", fix_selinux),
        ("防火墙配置", fix_firewall),
        ("文件权限修复", fix_file_permissions),
    ]

    all_passed = True
    for name, check_func in checks:
        print(f"\n🔍 {name}...")
        try:
            if not check_func():
                all_passed = False
        except Exception as e:
            print(f"❌ {name}失败: {e}")
            all_passed = False

    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 修复完成！")
        print("\n📋 下一步操作：")
        print("1. 编辑.env文件，设置正确的DJANGO_ALLOWED_HOSTS")
        print("2. 运行: python3 create_admin_secure.py")
        print("3. 运行: sudo ./deploy_centos.sh")
    else:
        print("❌ 部分修复失败，请手动检查上述错误")
        sys.exit(1)

if __name__ == "__main__":
    main()

#!/bin/bash

# 网站访问诊断脚本
# 使用方法: chmod +x diagnose_web_access.sh && sudo ./diagnose_web_access.sh

echo "🔍 开始诊断网站访问问题..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/var/www/biostatistics-django"

echo "=========================================="
echo "1. 检查服务状态"
echo "=========================================="

echo "Django服务状态:"
systemctl status biostatistics-django --no-pager -l

echo ""
echo "Nginx服务状态:"
systemctl status nginx --no-pager -l

echo ""
echo "=========================================="
echo "2. 检查端口监听"
echo "=========================================="

echo "检查8000端口 (Django):"
ss -tlnp | grep :8000 || echo -e "${RED}❌ 端口8000未监听${NC}"

echo ""
echo "检查80端口 (Nginx):"
ss -tlnp | grep :80 || echo -e "${RED}❌ 端口80未监听${NC}"

echo ""
echo "检查8001端口 (Nginx远程访问):"
ss -tlnp | grep :8001 || echo -e "${RED}❌ 端口8001未监听${NC}"

echo ""
echo "=========================================="
echo "3. 检查防火墙状态"
echo "=========================================="

if systemctl is-active --quiet firewalld; then
    echo "防火墙状态: 运行中"
    echo "开放的端口:"
    firewall-cmd --list-ports
    echo "开放的服务:"
    firewall-cmd --list-services
else
    echo "防火墙状态: 未运行"
fi

echo ""
echo "=========================================="
echo "4. 测试本地连接"
echo "=========================================="

echo "测试Django服务 (127.0.0.1:8000):"
curl -I http://127.0.0.1:8000 2>/dev/null || echo -e "${RED}❌ Django服务无响应${NC}"

echo ""
echo "测试Nginx本地 (localhost:80):"
curl -I http://localhost 2>/dev/null || echo -e "${RED}❌ Nginx本地无响应${NC}"

echo ""
echo "测试Nginx远程端口 (localhost:8001):"
curl -I http://localhost:8001 2>/dev/null || echo -e "${RED}❌ Nginx 8001端口无响应${NC}"

echo ""
echo "=========================================="
echo "5. 检查Nginx配置"
echo "=========================================="

echo "Nginx配置测试:"
nginx -t

echo ""
echo "Nginx配置文件内容:"
if [ -f /etc/nginx/conf.d/biostatistics-django.conf ]; then
    echo "配置文件存在: /etc/nginx/conf.d/biostatistics-django.conf"
    cat /etc/nginx/conf.d/biostatistics-django.conf
else
    echo -e "${RED}❌ 配置文件不存在${NC}"
fi

echo ""
echo "=========================================="
echo "6. 检查Django日志"
echo "=========================================="

if [ -f "$PROJECT_DIR/logs/django.log" ]; then
    echo "Django日志 (最后20行):"
    tail -20 "$PROJECT_DIR/logs/django.log"
else
    echo -e "${YELLOW}⚠️ Django日志文件不存在${NC}"
fi

echo ""
echo "=========================================="
echo "7. 检查systemd日志"
echo "=========================================="

echo "Django服务日志 (最后10行):"
journalctl -u biostatistics-django --no-pager -n 10

echo ""
echo "Nginx服务日志 (最后5行):"
journalctl -u nginx --no-pager -n 5

echo ""
echo "=========================================="
echo "8. 手动测试建议"
echo "=========================================="

echo -e "${YELLOW}如果上述检查发现问题，可以尝试以下手动测试:${NC}"
echo ""
echo "1. 手动启动Django:"
echo "   cd $PROJECT_DIR"
echo "   source venv/bin/activate"
echo "   python manage.py runserver 0.0.0.0:8000 --settings=biostatistics_course.settings_production"
echo ""
echo "2. 手动启动gunicorn:"
echo "   cd $PROJECT_DIR"
echo "   source venv/bin/activate"
echo "   gunicorn --bind 127.0.0.1:8000 biostatistics_course.wsgi:application"
echo ""
echo "3. 检查Django配置:"
echo "   cd $PROJECT_DIR"
echo "   source venv/bin/activate"
echo "   python manage.py check --settings=biostatistics_course.settings_production"
echo ""
echo "4. 重启所有服务:"
echo "   sudo systemctl restart biostatistics-django"
echo "   sudo systemctl restart nginx"

echo ""
echo "=========================================="
echo "9. 访问地址"
echo "=========================================="

echo "应该可以访问的地址:"
echo "- 本地: http://localhost"
echo "- 本地8001: http://localhost:8001"
echo "- 远程: http://10.50.0.198:8001"
echo ""
echo "如果都无法访问，请检查上述诊断结果中的错误信息。"

echo ""
echo -e "${GREEN}🔍 诊断完成！${NC}"
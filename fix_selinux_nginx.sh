#!/bin/bash

echo "🔧 修复SELinux和Nginx端口权限问题..."

# 检查SELinux状态
echo "📊 检查SELinux状态..."
sestatus

# 允许Nginx绑定到8001端口
echo "🔓 允许Nginx绑定到8001端口..."
sudo setsebool -P httpd_can_network_connect 1
sudo semanage port -a -t http_port_t -p tcp 8001 2>/dev/null || sudo semanage port -m -t http_port_t -p tcp 8001

# 检查端口是否已添加到SELinux策略
echo "🔍 检查SELinux端口策略..."
sudo semanage port -l | grep http_port_t | grep 8001

# 重新启动Nginx
echo "🔄 重启Nginx服务..."
sudo systemctl restart nginx

# 检查Nginx状态
echo "📊 检查Nginx状态..."
sudo systemctl status nginx --no-pager -l

# 检查端口监听
echo "🔍 检查端口监听..."
sudo ss -tlnp | grep -E ':(80|8001)'

# 测试连接
echo "🧪 测试连接..."
echo "测试80端口:"
curl -I http://localhost 2>/dev/null | head -1

echo "测试8001端口:"
curl -I http://localhost:8001 2>/dev/null | head -1

echo ""
echo "🎉 修复完成！"
echo "如果Nginx启动成功，现在应该可以通过以下地址访问："
echo "   - 本地: http://localhost"
echo "   - 远程: http://10.50.0.198:8001"
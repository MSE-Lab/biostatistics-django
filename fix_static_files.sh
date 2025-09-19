#!/bin/bash

echo "🎨 修复静态文件配置..."

# 进入项目目录
cd /var/www/biostatistics-django

# 收集静态文件
echo "📦 收集静态文件..."
sudo -u $(stat -c '%U' .) bash -c "source venv/bin/activate && python manage.py collectstatic --noinput --settings=biostatistics_course.settings_production"

# 设置静态文件目录权限
echo "🔐 设置静态文件权限..."
sudo chown -R nginx:nginx staticfiles/
sudo chmod -R 755 staticfiles/

# 设置媒体文件权限
echo "🖼️设置媒体文件权限..."
sudo chown -R nginx:nginx media/
sudo chmod -R 755 media/

# 检查静态文件目录
echo "📁 检查静态文件目录..."
ls -la staticfiles/ | head -10

# 配置SELinux上下文
echo "🔒 配置SELinux上下文..."
sudo setsebool -P httpd_can_network_connect 1
sudo semanage fcontext -a -t httpd_exec_t "/var/www/biostatistics-django/staticfiles(/.*)?" 2>/dev/null || true
sudo semanage fcontext -a -t httpd_exec_t "/var/www/biostatistics-django/media(/.*)?" 2>/dev/null || true
sudo restorecon -R /var/www/biostatistics-django/staticfiles/
sudo restorecon -R /var/www/biostatistics-django/media/

# 重启Nginx
echo "🔄 重启Nginx..."
sudo systemctl restart nginx

# 测试静态文件访问
echo "🧪 测试静态文件访问..."
echo "测试CSS文件:"
curl -I http://localhost:8001/static/css/style.css 2>/dev/null | head -1

echo "测试主页:"
curl -I http://localhost:8001/ 2>/dev/null | head -1

echo ""
echo "🎉 静态文件修复完成！"
echo "现在访问 http://10.50.0.198:8001 应该能看到完整的样式了"
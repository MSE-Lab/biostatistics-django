#!/bin/bash

echo "🔧 修复Nginx配置..."

# 创建biostatistics站点配置
sudo tee /etc/nginx/conf.d/biostatistics.conf > /dev/null << 'EOF'
# Biostatistics Django 应用配置

# 80端口 - 本地访问
server {
    listen 80;
    server_name localhost 127.0.0.1;
    
    # 静态文件
    location /static/ {
        alias /var/www/biostatistics-django/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # 媒体文件
    location /media/ {
        alias /var/www/biostatistics-django/media/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Django应用
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}

# 8001端口 - 远程访问
server {
    listen 8001;
    server_name 10.50.0.198 localhost 127.0.0.1;
    
    # 静态文件
    location /static/ {
        alias /var/www/biostatistics-django/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # 媒体文件
    location /media/ {
        alias /var/www/biostatistics-django/media/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Django应用
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
EOF

echo "✅ Nginx配置文件已创建"

# 测试配置
echo "🧪 测试Nginx配置..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx配置测试通过"
    
    # 重启Nginx
    echo "🔄 重启Nginx服务..."
    sudo systemctl restart nginx
    
    # 检查服务状态
    echo "📊 检查Nginx状态..."
    sudo systemctl status nginx --no-pager -l
    
    # 检查端口监听
    echo "🔍 检查端口监听..."
    sudo ss -tlnp | grep -E ':(80|8001)'
    
    echo ""
    echo "🎉 修复完成！现在应该可以通过以下地址访问："
    echo "   - 本地: http://localhost"
    echo "   - 远程: http://10.50.0.198:8001"
    
else
    echo "❌ Nginx配置测试失败，请检查配置文件"
    exit 1
fi
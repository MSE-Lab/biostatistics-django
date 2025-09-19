#!/bin/bash

# 快速启动脚本 - 适用于已安装Docker的环境

echo "🚀 Biostatistics Django 快速启动"
echo "================================"

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先运行: ./deploy-docker.sh"
    exit 1
fi

# 检查Docker Compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先运行: ./deploy-docker.sh"
    exit 1
fi

# 创建环境文件（如果不存在）
if [[ ! -f .env ]]; then
    echo "📝 创建环境配置..."
    SECRET_KEY=$(openssl rand -base64 32 2>/dev/null || date +%s | sha256sum | base64 | head -c 32)
    SERVER_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")
    
    cat > .env << EOF
DJANGO_SECRET_KEY=${SECRET_KEY}
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,${SERVER_IP}
EOF
    echo "✅ 环境配置创建完成"
fi

# 构建并启动
echo "🔨 构建应用..."
docker-compose build

echo "🚀 启动服务..."
docker-compose up -d

# 等待启动
echo "⏳ 等待服务启动..."
sleep 15

# 检查状态
if docker-compose ps | grep -q "Up"; then
    echo "✅ 启动成功！"
    echo
    echo "🌐 访问地址:"
    echo "   http://localhost:8000"
    echo "   http://$(hostname -I | awk '{print $1}'):8000"
    echo
    echo "🔑 管理后台: /admin (admin/admin123)"
    echo
    echo "📋 管理命令:"
    echo "   查看状态: docker-compose ps"
    echo "   查看日志: docker-compose logs -f"
    echo "   停止服务: docker-compose down"
else
    echo "❌ 启动失败，查看日志:"
    docker-compose logs
fi
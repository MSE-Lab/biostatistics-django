#!/bin/bash

# Biostatistics Django 项目 Docker 一键部署脚本
# 适用于 Ubuntu/CentOS/Debian 等 Linux 系统

set -e

echo "🚀 Biostatistics Django Docker 一键部署脚本"
echo "================================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        echo -e "${YELLOW}警告: 检测到root用户，建议使用普通用户运行${NC}"
        read -p "是否继续? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 检测操作系统
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        echo -e "${RED}无法检测操作系统${NC}"
        exit 1
    fi
    echo -e "${BLUE}检测到操作系统: $OS $VER${NC}"
}

# 安装Docker
install_docker() {
    echo -e "${BLUE}检查Docker安装状态...${NC}"
    
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}Docker已安装${NC}"
        docker --version
    else
        echo -e "${YELLOW}正在安装Docker...${NC}"
        
        # 安装Docker官方脚本
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        
        # 将当前用户添加到docker组
        sudo usermod -aG docker $USER
        
        # 启动Docker服务
        sudo systemctl start docker
        sudo systemctl enable docker
        
        echo -e "${GREEN}Docker安装完成${NC}"
        rm -f get-docker.sh
    fi
}

# 安装Docker Compose
install_docker_compose() {
    echo -e "${BLUE}检查Docker Compose安装状态...${NC}"
    
    if command -v docker-compose &> /dev/null; then
        echo -e "${GREEN}Docker Compose已安装${NC}"
        docker-compose --version
    else
        echo -e "${YELLOW}正在安装Docker Compose...${NC}"
        
        # 下载最新版本的Docker Compose
        COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
        sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        
        echo -e "${GREEN}Docker Compose安装完成${NC}"
    fi
}

# 配置环境变量
setup_environment() {
    echo -e "${BLUE}配置环境变量...${NC}"
    
    if [[ ! -f .env ]]; then
        echo -e "${YELLOW}创建环境配置文件...${NC}"
        
        # 生成随机密钥
        SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())' 2>/dev/null || openssl rand -base64 32)
        
        # 获取多种IP地址
        echo -e "${BLUE}检测服务器IP地址...${NC}"
        
        # 获取公网IP（多种方式尝试）
        PUBLIC_IP=""
        for service in "ifconfig.me" "ipinfo.io/ip" "icanhazip.com" "ident.me"; do
            PUBLIC_IP=$(curl -s --connect-timeout 5 $service 2>/dev/null)
            if [[ -n "$PUBLIC_IP" && "$PUBLIC_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                echo -e "${GREEN}检测到公网IP: ${PUBLIC_IP}${NC}"
                break
            fi
        done
        
        # 获取内网IP
        PRIVATE_IP=$(hostname -I | awk '{print $1}' 2>/dev/null)
        if [[ -n "$PRIVATE_IP" ]]; then
            echo -e "${GREEN}检测到内网IP: ${PRIVATE_IP}${NC}"
        fi
        
        # 构建ALLOWED_HOSTS
        ALLOWED_HOSTS="localhost,127.0.0.1"
        if [[ -n "$PRIVATE_IP" ]]; then
            ALLOWED_HOSTS="${ALLOWED_HOSTS},${PRIVATE_IP}"
        fi
        if [[ -n "$PUBLIC_IP" ]]; then
            ALLOWED_HOSTS="${ALLOWED_HOSTS},${PUBLIC_IP}"
        fi
        
        cat > .env << EOF
# Django配置
DJANGO_SECRET_KEY=${SECRET_KEY}
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=${ALLOWED_HOSTS}

# 服务器IP信息
# 公网IP: ${PUBLIC_IP:-"未检测到"}
# 内网IP: ${PRIVATE_IP:-"未检测到"}

# 如果有域名，请添加到上面的DJANGO_ALLOWED_HOSTS中
# 例如: DJANGO_ALLOWED_HOSTS=${ALLOWED_HOSTS},yourdomain.com,www.yourdomain.com
EOF
        
        echo -e "${GREEN}环境配置文件创建完成${NC}"
        if [[ -n "$PUBLIC_IP" ]]; then
            echo -e "${YELLOW}公网访问地址: http://${PUBLIC_IP}:8000${NC}"
        fi
        if [[ -n "$PRIVATE_IP" ]]; then
            echo -e "${YELLOW}内网访问地址: http://${PRIVATE_IP}:8000${NC}"
        fi
        echo -e "${YELLOW}如果有域名，请编辑 .env 文件添加域名到 DJANGO_ALLOWED_HOSTS${NC}"
    else
        echo -e "${GREEN}环境配置文件已存在${NC}"
        # 显示当前配置的IP
        if grep -q "DJANGO_ALLOWED_HOSTS" .env; then
            CURRENT_HOSTS=$(grep "DJANGO_ALLOWED_HOSTS" .env | cut -d'=' -f2)
            echo -e "${BLUE}当前允许的主机: ${CURRENT_HOSTS}${NC}"
        fi
    fi
}

# 构建和启动服务
deploy_application() {
    echo -e "${BLUE}构建和部署应用...${NC}"
    
    # 构建镜像
    echo -e "${YELLOW}构建Docker镜像...${NC}"
    docker-compose build
    
    # 启动服务
    echo -e "${YELLOW}启动服务...${NC}"
    docker-compose up -d
    
    # 等待服务启动
    echo -e "${YELLOW}等待服务启动...${NC}"
    sleep 10
    
    # 检查服务状态
    if docker-compose ps | grep -q "Up"; then
        echo -e "${GREEN}✅ 部署成功！${NC}"
        echo
        
        # 重新获取IP信息用于显示
        PUBLIC_IP=$(curl -s --connect-timeout 3 ifconfig.me 2>/dev/null)
        PRIVATE_IP=$(hostname -I | awk '{print $1}' 2>/dev/null)
        
        echo -e "${GREEN}🌐 应用访问地址:${NC}"
        echo -e "   http://localhost:8000 (本地访问)"
        
        if [[ -n "$PRIVATE_IP" ]]; then
            echo -e "   http://${PRIVATE_IP}:8000 (内网访问)"
        fi
        
        if [[ -n "$PUBLIC_IP" ]]; then
            echo -e "   ${YELLOW}http://${PUBLIC_IP}:8000 (公网访问)${NC}"
        fi
        
        echo
        echo -e "${GREEN}🔑 管理后台:${NC}"
        echo -e "   路径: /admin"
        echo -e "   用户名: admin"
        echo -e "   密码: admin123"
        
        if [[ -n "$PUBLIC_IP" ]]; then
            echo -e "   ${YELLOW}公网管理后台: http://${PUBLIC_IP}:8000/admin${NC}"
        fi
        
        echo
        echo -e "${BLUE}📋 常用管理命令:${NC}"
        echo -e "   查看服务状态: docker-compose ps"
        echo -e "   查看实时日志: docker-compose logs -f"
        echo -e "   停止服务: docker-compose down"
        echo -e "   重启服务: docker-compose restart"
        echo -e "   更新应用: git pull && docker-compose up -d --build"
        
        echo
        echo -e "${BLUE}🔧 网络配置提醒:${NC}"
        echo -e "   1. 确保云服务器安全组已开放8000端口"
        echo -e "   2. 如果无法访问，请检查防火墙设置"
        echo -e "   3. 生产环境建议配置域名和SSL证书"
        echo -e "   4. 详细配置请参考: CLOUD_SERVER_SETUP.md"
        
    else
        echo -e "${RED}❌ 部署失败，请检查日志${NC}"
        docker-compose logs
        exit 1
    fi
}

# 主函数
main() {
    check_root
    detect_os
    install_docker
    install_docker_compose
    setup_environment
    deploy_application
}

# 运行主函数
main "$@"
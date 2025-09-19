#!/bin/bash

# IP地址更新脚本
# 当云服务器IP变化时，快速更新Django配置

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔄 更新Django IP配置"
echo "===================="

# 获取当前IP地址
get_current_ips() {
    echo -e "${BLUE}检测当前IP地址...${NC}"
    
    # 获取公网IP
    PUBLIC_IP=""
    for service in "ifconfig.me" "ipinfo.io/ip" "icanhazip.com"; do
        IP=$(curl -s --connect-timeout 5 "$service" 2>/dev/null)
        if [[ -n "$IP" && "$IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            PUBLIC_IP="$IP"
            echo -e "${GREEN}公网IP: $PUBLIC_IP${NC}"
            break
        fi
    done
    
    # 获取内网IP
    PRIVATE_IP=$(hostname -I | awk '{print $1}' 2>/dev/null)
    if [[ -n "$PRIVATE_IP" ]]; then
        echo -e "${GREEN}内网IP: $PRIVATE_IP${NC}"
    fi
    
    if [[ -z "$PUBLIC_IP" && -z "$PRIVATE_IP" ]]; then
        echo -e "${RED}❌ 无法检测到IP地址${NC}"
        exit 1
    fi
}

# 更新.env文件
update_env_file() {
    echo -e "${BLUE}更新环境配置文件...${NC}"
    
    if [[ ! -f .env ]]; then
        echo -e "${RED}❌ .env文件不存在，请先运行 ./deploy-docker.sh${NC}"
        exit 1
    fi
    
    # 备份原文件
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${YELLOW}已备份原配置文件${NC}"
    
    # 构建新的ALLOWED_HOSTS
    ALLOWED_HOSTS="localhost,127.0.0.1"
    if [[ -n "$PRIVATE_IP" ]]; then
        ALLOWED_HOSTS="${ALLOWED_HOSTS},${PRIVATE_IP}"
    fi
    if [[ -n "$PUBLIC_IP" ]]; then
        ALLOWED_HOSTS="${ALLOWED_HOSTS},${PUBLIC_IP}"
    fi
    
    # 检查是否有自定义域名
    CURRENT_HOSTS=$(grep "DJANGO_ALLOWED_HOSTS" .env | cut -d'=' -f2)
    CUSTOM_DOMAINS=""
    
    # 提取可能的域名（不是IP地址的部分）
    IFS=',' read -ra HOSTS_ARRAY <<< "$CURRENT_HOSTS"
    for host in "${HOSTS_ARRAY[@]}"; do
        host=$(echo "$host" | xargs) # 去除空格
        if [[ ! "$host" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && [[ "$host" != "localhost" ]] && [[ "$host" != "127.0.0.1" ]]; then
            if [[ -n "$CUSTOM_DOMAINS" ]]; then
                CUSTOM_DOMAINS="${CUSTOM_DOMAINS},${host}"
            else
                CUSTOM_DOMAINS="$host"
            fi
        fi
    done
    
    # 如果有自定义域名，添加到ALLOWED_HOSTS
    if [[ -n "$CUSTOM_DOMAINS" ]]; then
        ALLOWED_HOSTS="${ALLOWED_HOSTS},${CUSTOM_DOMAINS}"
        echo -e "${GREEN}保留自定义域名: $CUSTOM_DOMAINS${NC}"
    fi
    
    # 更新ALLOWED_HOSTS
    sed -i.bak "s/DJANGO_ALLOWED_HOSTS=.*/DJANGO_ALLOWED_HOSTS=${ALLOWED_HOSTS}/" .env
    
    echo -e "${GREEN}✓ 配置文件更新完成${NC}"
    echo -e "${BLUE}新的ALLOWED_HOSTS: ${ALLOWED_HOSTS}${NC}"
}

# 重启Docker服务
restart_services() {
    echo -e "${BLUE}重启Docker服务...${NC}"
    
    if docker-compose ps &>/dev/null; then
        docker-compose restart
        echo -e "${GREEN}✓ 服务重启完成${NC}"
        
        # 等待服务启动
        echo -e "${YELLOW}等待服务启动...${NC}"
        sleep 10
        
        # 检查服务状态
        if docker-compose ps | grep -q "Up"; then
            echo -e "${GREEN}✅ 服务运行正常${NC}"
        else
            echo -e "${RED}❌ 服务启动异常${NC}"
            docker-compose logs --tail=20
        fi
    else
        echo -e "${YELLOW}Docker服务未运行，请手动启动: docker-compose up -d${NC}"
    fi
}

# 显示访问信息
show_access_info() {
    echo
    echo -e "${GREEN}🌐 更新后的访问地址:${NC}"
    echo -e "   http://localhost:8000"
    
    if [[ -n "$PRIVATE_IP" ]]; then
        echo -e "   http://${PRIVATE_IP}:8000 (内网)"
    fi
    
    if [[ -n "$PUBLIC_IP" ]]; then
        echo -e "   ${YELLOW}http://${PUBLIC_IP}:8000 (公网)${NC}"
    fi
    
    echo
    echo -e "${GREEN}🔑 管理后台:${NC}"
    if [[ -n "$PUBLIC_IP" ]]; then
        echo -e "   ${YELLOW}http://${PUBLIC_IP}:8000/admin${NC}"
    else
        echo -e "   http://localhost:8000/admin"
    fi
    
    echo
    echo -e "${BLUE}📋 验证步骤:${NC}"
    echo -e "   1. 检查服务状态: docker-compose ps"
    echo -e "   2. 测试访问: curl http://localhost:8000"
    if [[ -n "$PUBLIC_IP" ]]; then
        echo -e "   3. 测试公网访问: curl http://${PUBLIC_IP}:8000"
    fi
    echo -e "   4. 运行网络检查: ./check-network.sh"
}

# 主函数
main() {
    # 检查是否在项目目录
    if [[ ! -f "docker-compose.yml" ]]; then
        echo -e "${RED}❌ 请在项目根目录运行此脚本${NC}"
        exit 1
    fi
    
    get_current_ips
    echo
    update_env_file
    echo
    restart_services
    echo
    show_access_info
    
    echo
    echo -e "${GREEN}✅ IP配置更新完成！${NC}"
}

# 运行主函数
main "$@"
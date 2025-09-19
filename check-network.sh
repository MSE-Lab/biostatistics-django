#!/bin/bash

# 网络配置检查脚本
# 用于验证云服务器网络配置和IP地址设置

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔍 云服务器网络配置检查"
echo "=========================="

# 检查公网IP
check_public_ip() {
    echo -e "${BLUE}检查公网IP地址...${NC}"
    
    PUBLIC_IPS=()
    SERVICES=("ifconfig.me" "ipinfo.io/ip" "icanhazip.com" "ident.me")
    
    for service in "${SERVICES[@]}"; do
        IP=$(curl -s --connect-timeout 5 "$service" 2>/dev/null)
        if [[ -n "$IP" && "$IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            PUBLIC_IPS+=("$IP")
            echo -e "${GREEN}✓ $service: $IP${NC}"
        else
            echo -e "${RED}✗ $service: 无法获取${NC}"
        fi
    done
    
    if [[ ${#PUBLIC_IPS[@]} -gt 0 ]]; then
        # 取最常见的IP
        MOST_COMMON_IP=$(printf '%s\n' "${PUBLIC_IPS[@]}" | sort | uniq -c | sort -nr | head -1 | awk '{print $2}')
        echo -e "${GREEN}检测到公网IP: ${MOST_COMMON_IP}${NC}"
        PUBLIC_IP="$MOST_COMMON_IP"
    else
        echo -e "${RED}❌ 无法检测到公网IP${NC}"
        PUBLIC_IP=""
    fi
}

# 检查内网IP
check_private_ip() {
    echo -e "${BLUE}检查内网IP地址...${NC}"
    
    # 获取所有网络接口
    INTERFACES=$(ip addr show | grep -E "inet [0-9]" | grep -v "127.0.0.1" | awk '{print $2}' | cut -d'/' -f1)
    
    if [[ -n "$INTERFACES" ]]; then
        echo -e "${GREEN}检测到的内网IP:${NC}"
        while IFS= read -r ip; do
            echo -e "  • $ip"
        done <<< "$INTERFACES"
        
        # 取第一个作为主要内网IP
        PRIVATE_IP=$(echo "$INTERFACES" | head -1)
        echo -e "${GREEN}主要内网IP: ${PRIVATE_IP}${NC}"
    else
        echo -e "${RED}❌ 无法检测到内网IP${NC}"
        PRIVATE_IP=""
    fi
}

# 检查端口监听状态
check_port_listening() {
    echo -e "${BLUE}检查端口监听状态...${NC}"
    
    PORTS=("22" "80" "443" "8000")
    
    for port in "${PORTS[@]}"; do
        if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            SERVICE=$(netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f2 | head -1)
            echo -e "${GREEN}✓ 端口 $port: 正在监听 ($SERVICE)${NC}"
        else
            echo -e "${YELLOW}○ 端口 $port: 未监听${NC}"
        fi
    done
}

# 检查防火墙状态
check_firewall() {
    echo -e "${BLUE}检查防火墙状态...${NC}"
    
    # 检查UFW (Ubuntu/Debian)
    if command -v ufw &> /dev/null; then
        UFW_STATUS=$(sudo ufw status 2>/dev/null | head -1)
        echo -e "${BLUE}UFW状态: $UFW_STATUS${NC}"
        
        if [[ "$UFW_STATUS" == *"active"* ]]; then
            echo -e "${YELLOW}UFW规则:${NC}"
            sudo ufw status numbered | grep -E "(22|80|443|8000)" || echo -e "${RED}  未找到相关端口规则${NC}"
        fi
    fi
    
    # 检查firewalld (CentOS/RHEL)
    if command -v firewall-cmd &> /dev/null; then
        if systemctl is-active --quiet firewalld; then
            echo -e "${GREEN}firewalld: 运行中${NC}"
            echo -e "${YELLOW}开放的端口:${NC}"
            sudo firewall-cmd --list-ports 2>/dev/null || echo -e "${RED}  无法获取端口列表${NC}"
        else
            echo -e "${YELLOW}firewalld: 未运行${NC}"
        fi
    fi
    
    # 检查iptables
    if command -v iptables &> /dev/null; then
        IPTABLES_RULES=$(sudo iptables -L INPUT -n 2>/dev/null | grep -E "(22|80|443|8000)" | wc -l)
        if [[ $IPTABLES_RULES -gt 0 ]]; then
            echo -e "${GREEN}iptables: 发现 $IPTABLES_RULES 条相关规则${NC}"
        else
            echo -e "${YELLOW}iptables: 未发现相关端口规则${NC}"
        fi
    fi
}

# 检查云服务商安全组
check_cloud_security() {
    echo -e "${BLUE}检查云服务商信息...${NC}"
    
    # 检查是否在阿里云
    if curl -s --connect-timeout 3 http://100.100.100.200/latest/meta-data/instance-id &>/dev/null; then
        echo -e "${GREEN}检测到阿里云ECS实例${NC}"
        INSTANCE_ID=$(curl -s http://100.100.100.200/latest/meta-data/instance-id 2>/dev/null)
        echo -e "  实例ID: $INSTANCE_ID"
        echo -e "${YELLOW}  请检查ECS安全组是否开放8000端口${NC}"
    fi
    
    # 检查是否在腾讯云
    if curl -s --connect-timeout 3 http://metadata.tencentyun.com/latest/meta-data/instance-id &>/dev/null; then
        echo -e "${GREEN}检测到腾讯云CVM实例${NC}"
        INSTANCE_ID=$(curl -s http://metadata.tencentyun.com/latest/meta-data/instance-id 2>/dev/null)
        echo -e "  实例ID: $INSTANCE_ID"
        echo -e "${YELLOW}  请检查CVM安全组是否开放8000端口${NC}"
    fi
    
    # 检查是否在AWS
    if curl -s --connect-timeout 3 http://169.254.169.254/latest/meta-data/instance-id &>/dev/null; then
        echo -e "${GREEN}检测到AWS EC2实例${NC}"
        INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null)
        echo -e "  实例ID: $INSTANCE_ID"
        echo -e "${YELLOW}  请检查EC2安全组是否开放8000端口${NC}"
    fi
}

# 测试网络连通性
test_connectivity() {
    echo -e "${BLUE}测试网络连通性...${NC}"
    
    # 测试DNS解析
    if nslookup google.com &>/dev/null; then
        echo -e "${GREEN}✓ DNS解析正常${NC}"
    else
        echo -e "${RED}✗ DNS解析异常${NC}"
    fi
    
    # 测试外网连接
    if curl -s --connect-timeout 5 http://www.baidu.com &>/dev/null; then
        echo -e "${GREEN}✓ 外网连接正常${NC}"
    else
        echo -e "${RED}✗ 外网连接异常${NC}"
    fi
    
    # 如果Docker正在运行，测试应用连接
    if docker-compose ps 2>/dev/null | grep -q "Up"; then
        echo -e "${BLUE}测试应用连接...${NC}"
        
        # 测试本地连接
        if curl -s --connect-timeout 5 http://localhost:8000 &>/dev/null; then
            echo -e "${GREEN}✓ 本地应用连接正常${NC}"
        else
            echo -e "${RED}✗ 本地应用连接失败${NC}"
        fi
        
        # 测试内网IP连接
        if [[ -n "$PRIVATE_IP" ]]; then
            if curl -s --connect-timeout 5 "http://$PRIVATE_IP:8000" &>/dev/null; then
                echo -e "${GREEN}✓ 内网IP应用连接正常${NC}"
            else
                echo -e "${RED}✗ 内网IP应用连接失败${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}○ 应用未运行，跳过应用连接测试${NC}"
    fi
}

# 生成配置建议
generate_recommendations() {
    echo -e "${BLUE}配置建议:${NC}"
    echo
    
    if [[ -n "$PUBLIC_IP" ]]; then
        echo -e "${GREEN}✓ 公网IP配置正确: $PUBLIC_IP${NC}"
        echo -e "  应用访问地址: http://$PUBLIC_IP:8000"
        echo -e "  管理后台: http://$PUBLIC_IP:8000/admin"
    else
        echo -e "${RED}✗ 未检测到公网IP${NC}"
        echo -e "  建议: 为云服务器配置弹性公网IP"
    fi
    
    echo
    echo -e "${YELLOW}安全组/防火墙配置检查:${NC}"
    echo -e "  1. 确保开放端口: 22(SSH), 8000(应用)"
    echo -e "  2. 生产环境建议开放: 80(HTTP), 443(HTTPS)"
    echo -e "  3. 限制SSH访问来源IP"
    
    echo
    echo -e "${YELLOW}Django配置检查:${NC}"
    if [[ -f .env ]]; then
        ALLOWED_HOSTS=$(grep "DJANGO_ALLOWED_HOSTS" .env 2>/dev/null | cut -d'=' -f2)
        echo -e "  当前ALLOWED_HOSTS: $ALLOWED_HOSTS"
        
        if [[ -n "$PUBLIC_IP" ]] && [[ "$ALLOWED_HOSTS" != *"$PUBLIC_IP"* ]]; then
            echo -e "${RED}  ⚠️  建议将公网IP添加到ALLOWED_HOSTS${NC}"
        fi
    else
        echo -e "${RED}  ⚠️  .env文件不存在，请先运行部署脚本${NC}"
    fi
    
    echo
    echo -e "${BLUE}下一步操作建议:${NC}"
    echo -e "  1. 如果是首次部署: ./deploy-docker.sh"
    echo -e "  2. 如果需要重启应用: docker-compose restart"
    echo -e "  3. 查看应用日志: docker-compose logs -f"
    echo -e "  4. 配置域名和SSL: 参考 CLOUD_SERVER_SETUP.md"
}

# 主函数
main() {
    check_public_ip
    echo
    check_private_ip
    echo
    check_port_listening
    echo
    check_firewall
    echo
    check_cloud_security
    echo
    test_connectivity
    echo
    generate_recommendations
}

# 运行检查
main "$@"
# 云服务器固定IP配置指南

## 🌐 主流云服务商固定IP配置

### 1. 阿里云 ECS

#### 购买弹性公网IP (EIP)
```bash
# 1. 登录阿里云控制台
# 2. 进入 ECS 管理控制台
# 3. 左侧菜单选择 "网络与安全" > "弹性公网IP"
# 4. 点击 "申请弹性公网IP"
```

**配置步骤：**
1. **申请EIP**
   - 计费方式：按流量或按带宽
   - 带宽：建议5Mbps以上
   - 线路类型：BGP（多线）

2. **绑定到ECS实例**
   ```bash
   # 在EIP列表中找到申请的IP
   # 点击 "绑定资源"
   # 选择要绑定的ECS实例
   ```

3. **安全组配置**
   ```bash
   # 进入ECS实例 > 安全组
   # 添加规则：
   # - 端口范围：8000/8000
   # - 授权对象：0.0.0.0/0
   # - 协议类型：TCP
   ```

### 2. 腾讯云 CVM

#### 购买弹性公网IP
```bash
# 1. 登录腾讯云控制台
# 2. 进入 "云服务器" 控制台
# 3. 左侧菜单 "弹性公网IP"
# 4. 点击 "申请"
```

**配置步骤：**
1. **申请弹性IP**
   - 计费模式：按流量计费
   - 带宽上限：根据需求选择
   - 数量：1个

2. **绑定实例**
   ```bash
   # 在弹性IP列表中
   # 点击 "绑定" 选择CVM实例
   ```

3. **安全组设置**
   ```bash
   # CVM实例 > 安全组
   # 入站规则添加：
   # - 协议端口：TCP:8000
   # - 来源：0.0.0.0/0
   ```

### 3. AWS EC2

#### 分配弹性IP地址
```bash
# 1. 登录AWS控制台
# 2. 进入EC2服务
# 3. 左侧菜单 "弹性IP"
# 4. 点击 "分配弹性IP地址"
```

**配置步骤：**
1. **分配弹性IP**
   ```bash
   # 网络边界组：选择区域
   # 公有IPv4地址池：Amazon池
   ```

2. **关联实例**
   ```bash
   # 选择分配的弹性IP
   # 操作 > 关联弹性IP地址
   # 选择EC2实例
   ```

3. **安全组配置**
   ```bash
   # EC2实例 > 安全组
   # 入站规则：
   # - 类型：自定义TCP
   # - 端口：8000
   # - 来源：0.0.0.0/0
   ```

### 4. 华为云 ECS

#### 购买弹性公网IP
```bash
# 1. 登录华为云控制台
# 2. 进入 "弹性云服务器ECS"
# 3. 左侧 "弹性公网IP"
# 4. 点击 "购买弹性公网IP"
```

## 🔧 服务器网络配置

### 检查当前IP配置
```bash
# 查看公网IP
curl ifconfig.me
curl ipinfo.io/ip

# 查看网络接口
ip addr show
ifconfig

# 查看路由表
ip route show
route -n
```

### 防火墙配置

#### Ubuntu/Debian (UFW)
```bash
# 启用防火墙
sudo ufw enable

# 允许SSH (重要！)
sudo ufw allow 22

# 允许HTTP
sudo ufw allow 80

# 允许HTTPS
sudo ufw allow 443

# 允许Django应用端口
sudo ufw allow 8000

# 查看状态
sudo ufw status
```

#### CentOS/RHEL (firewalld)
```bash
# 启动防火墙
sudo systemctl start firewalld
sudo systemctl enable firewalld

# 添加端口规则
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp

# 重载配置
sudo firewall-cmd --reload

# 查看状态
sudo firewall-cmd --list-all
```

## 🐳 Docker配置更新

### 自动检测和配置IP地址

更新 `.env` 文件配置：
```bash
# 获取公网IP
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null)

# 获取内网IP
PRIVATE_IP=$(hostname -I | awk '{print $1}')

# 更新环境变量
cat > .env << EOF
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,${PRIVATE_IP},${PUBLIC_IP}
EOF
```

### Docker Compose网络配置

如果需要自定义网络：
```yaml
# docker-compose.yml
version: '3.8'

networks:
  biostatistics_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

services:
  web:
    build: .
    networks:
      - biostatistics_network
    ports:
      - "8000:8000"
    # ... 其他配置
```

## 🔒 SSL证书配置（推荐）

### 使用Let's Encrypt免费SSL

#### 1. 安装Certbot
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx
```

#### 2. 获取SSL证书
```bash
# 替换为你的域名
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### 3. 更新Nginx配置
```nginx
# nginx-ssl.conf
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # 其他配置...
    location / {
        proxy_pass http://web:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📋 完整部署检查清单

### 部署前检查
- [ ] 云服务器已购买并启动
- [ ] 弹性公网IP已申请并绑定
- [ ] 安全组/防火墙规则已配置
- [ ] SSH密钥已配置
- [ ] 域名已解析（如果使用域名）

### 部署过程
```bash
# 1. 连接服务器
ssh user@your-public-ip

# 2. 上传项目
scp -r biostatistics-django user@your-public-ip:/home/user/

# 3. 执行部署
cd biostatistics-django
./deploy-docker.sh

# 4. 验证部署
curl http://your-public-ip:8000
```

### 部署后验证
- [ ] 应用可以通过公网IP访问
- [ ] 管理后台正常工作
- [ ] 静态文件加载正常
- [ ] 媒体文件上传正常
- [ ] SSL证书配置正确（如果使用）

## 🚨 常见问题解决

### 1. 无法访问应用
```bash
# 检查服务状态
docker-compose ps

# 检查端口监听
sudo netstat -tlnp | grep :8000

# 检查防火墙
sudo ufw status
sudo firewall-cmd --list-all
```

### 2. IP地址变化
```bash
# 更新环境变量
NEW_IP=$(curl -s ifconfig.me)
sed -i "s/DJANGO_ALLOWED_HOSTS=.*/DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,$NEW_IP/" .env

# 重启服务
docker-compose restart
```

### 3. SSL证书问题
```bash
# 检查证书状态
sudo certbot certificates

# 续期证书
sudo certbot renew

# 测试续期
sudo certbot renew --dry-run
```

## 💡 最佳实践建议

1. **使用域名**：购买域名并配置DNS解析，比直接使用IP更专业
2. **启用SSL**：使用HTTPS加密，提高安全性和SEO排名
3. **配置CDN**：使用云服务商的CDN加速静态资源
4. **监控告警**：配置服务器监控和告警通知
5. **定期备份**：设置自动备份策略
6. **安全加固**：定期更新系统，配置fail2ban等安全工具

---

按照这个指南配置后，您的biostatistics-django项目就能通过固定IP稳定访问了！
# Biostatistics Django Docker 部署指南

## 🚀 一键部署（推荐）

### 在云服务器上部署

1. **上传项目到服务器**
   ```bash
   # 方式1: 使用git克隆
   git clone <your-repo-url>
   cd biostatistics-django
   
   # 方式2: 直接上传项目文件夹
   scp -r biostatistics-django user@your-server:/home/user/
   ```

2. **运行一键部署脚本**
   ```bash
   chmod +x deploy-docker.sh
   ./deploy-docker.sh
   ```

3. **访问应用**
   - 应用地址: `http://your-server-ip:8000`
   - 管理后台: `http://your-server-ip:8000/admin`
   - 默认管理员: `admin` / `admin123`

## 🔧 手动部署

### 前置要求
- Docker
- Docker Compose

### 部署步骤

1. **安装Docker和Docker Compose**
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   
   # 安装Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，设置你的域名和密钥
   ```

3. **构建和启动**
   ```bash
   # 构建镜像
   docker-compose build
   
   # 启动服务
   docker-compose up -d
   ```

## 🌐 生产环境部署（带Nginx）

如果需要使用Nginx反向代理（推荐生产环境）：

```bash
# 启动包含Nginx的完整服务
docker-compose --profile production up -d
```

这将在80端口提供服务，并自动处理静态文件。

## 📋 常用管理命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 更新应用
docker-compose pull
docker-compose up -d

# 进入容器执行Django命令
docker-compose exec web python manage.py shell
docker-compose exec web python manage.py createsuperuser

# 备份数据库
docker-compose exec web python manage.py dumpdata > backup.json

# 恢复数据库
docker-compose exec web python manage.py loaddata backup.json
```

## 🔒 安全配置

### 生产环境建议

1. **修改默认管理员密码**
   ```bash
   docker-compose exec web python manage.py changepassword admin
   ```

2. **配置防火墙**
   ```bash
   # Ubuntu UFW
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS (如果使用SSL)
   sudo ufw enable
   ```

3. **配置SSL证书（可选）**
   - 使用Let's Encrypt获取免费SSL证书
   - 修改nginx.conf添加SSL配置

## 🔧 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 检查端口占用
   sudo netstat -tlnp | grep :8000
   
   # 修改docker-compose.yml中的端口映射
   ports:
     - "8001:8000"  # 改为其他端口
   ```

2. **权限问题**
   ```bash
   # 确保当前用户在docker组中
   sudo usermod -aG docker $USER
   # 重新登录或执行
   newgrp docker
   ```

3. **内存不足**
   ```bash
   # 检查系统资源
   free -h
   df -h
   
   # 清理Docker资源
   docker system prune -a
   ```

4. **查看详细错误日志**
   ```bash
   docker-compose logs web
   ```

## 📊 监控和维护

### 健康检查
```bash
# 检查应用健康状态
curl http://localhost:8000/

# 检查容器健康状态
docker-compose ps
```

### 数据备份
```bash
# 创建备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T web python manage.py dumpdata > backup_$DATE.json
cp db.sqlite3 db_backup_$DATE.sqlite3
tar -czf backup_$DATE.tar.gz backup_$DATE.json db_backup_$DATE.sqlite3 media/
echo "备份完成: backup_$DATE.tar.gz"
EOF

chmod +x backup.sh
./backup.sh
```

## 🎯 性能优化

### 生产环境优化建议

1. **增加Gunicorn工作进程**
   ```yaml
   # 在docker-compose.yml中修改
   command: ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "biostatistics_course.wsgi:application"]
   ```

2. **配置Redis缓存**（可选）
   ```yaml
   # 添加Redis服务到docker-compose.yml
   redis:
     image: redis:alpine
     restart: unless-stopped
   ```

3. **数据库优化**
   - 考虑升级到PostgreSQL（大型应用）
   - 定期清理日志文件
   - 配置数据库备份策略

---

## 📞 技术支持

如果遇到问题，请检查：
1. Docker和Docker Compose版本
2. 系统资源（内存、磁盘空间）
3. 网络连接和防火墙设置
4. 应用日志：`docker-compose logs -f`
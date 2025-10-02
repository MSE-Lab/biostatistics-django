# 生物统计学课程平台

## 项目简介

生物统计学课程平台是一个基于Django开发的在线教学平台，专为云南大学生命科学学院生物统计学课程设计。平台集成了课程管理、作业系统、讨论区、统计模拟器等功能，为师生提供完整的在线教学解决方案。

## 主要功能

### 🎓 课程管理
- 完整的课程内容展示（14个章节）
- 教材信息和购买链接
- 课程资源下载
- 教学班级管理

### 📝 作业系统
- 教师创建和管理作业
- 学生在线答题
- 自动评分和成绩统计
- 作业结果分析

### 💬 讨论区
- 分类讨论区（公开讨论、私信）
- 帖子发布和回复
- 未读消息提醒
- 教师-学生互动

### 🧮 统计模拟器
- 概率分布计算器
- 假设检验模拟器
- 置信区间计算
- Galton板演示
- 抽样分布模拟

### 👥 用户管理
- 多角色用户系统（管理员、教师、学生）
- 用户注册和认证
- 个人资料管理
- 权限控制

## 技术栈

- **后端**: Django 4.2.24
- **数据库**: SQLite3
- **前端**: HTML5, CSS3, JavaScript
- **图像处理**: Pillow
- **Python版本**: >=3.9

## 项目结构

```
biostatistics-django/
├── biostatistics_course/     # Django项目配置
│   ├── settings.py          # 项目设置
│   ├── urls.py             # 主URL配置
│   └── wsgi.py             # WSGI配置
├── core/                   # 核心应用
│   ├── models.py           # 数据模型
│   ├── views.py            # 视图函数
│   ├── forms.py            # 表单定义
│   ├── urls.py             # URL路由
│   └── migrations/         # 数据库迁移
├── simulators/             # 模拟器应用
│   ├── views.py            # 模拟器视图
│   ├── urls.py             # 模拟器路由
│   └── templates/          # 模拟器模板
├── templates/              # 全局模板
│   ├── base.html           # 基础模板
│   └── core/               # 核心应用模板
├── static/                 # 静态文件
│   ├── css/                # 样式文件
│   ├── js/                 # JavaScript文件
│   └── images/             # 图片资源
├── media/                  # 媒体文件
└── manage.py               # Django管理脚本
```

## 安装和部署

### 环境要求

- Python 3.9+
- pip 或 uv (推荐)

### 本地开发环境

1. **克隆项目**
```bash
git clone <repository-url>
cd biostatistics-django
```

2. **安装依赖**
```bash
# 使用uv (推荐)
uv sync

# 或使用pip
pip install django>=4.2.24 pillow>=11.3.0
```

3. **数据库迁移**
```bash
python manage.py migrate
```

4. **创建超级用户**
```bash
python manage.py createsuperuser
```

5. **初始化数据**
- 本机开发环境：
```bash
# 创建管理员（建议使用更安全的 secure 版本，会提示输入并做校验）
python create_admin_secure.py

# 创建教师用户（或使用 create_teacher_secure.py 提供更多校验）
python create_teacher_user.py

# 初始化专业班/教学班
python create_initial_classes.py

# 初始化讨论区分类
python create_forum_categories.py
```

- Docker 开发/测试环境（容器内执行以上脚本）：
```bash
cd docker
docker compose exec web python create_admin_secure.py
docker compose exec web python create_teacher_user.py
docker compose exec web python create_initial_classes.py
docker compose exec web python create_forum_categories.py
```

说明：
- create_* 脚本用于开发/测试阶段快速初始化数据，便于登录 /admin/ 和演示主要功能
- 生产环境不建议使用这些脚本直接改账户，请通过 /admin/ 后台或规范流程进行管理

6. **启动开发服务器**
```bash
python manage.py runserver
```

访问 http://127.0.0.1:8000 查看应用。

### Docker Compose 部署（推荐）

本项目提供基于 Docker Compose 的生产部署方案（CentOS 8.5 验证通过），通过 Nginx 反向代理对外开放 8001 端口，不修改项目代码。

一、部署文件清单
- docker/docker-compose.yml
- docker/nginx.conf
- docker/web/entrypoint.sh
- docker/Dockerfile（备用构建文件）
- .env.production（项目根目录）

二、准备与环境变量
1) 在项目根目录准备持久化目录与数据库文件（首次部署可先创建空文件/目录）
- mkdir -p media staticfiles
- touch db.sqlite3
2) 编辑 .env.production（务必设置强随机秘钥）
- 生成并写入强随机密钥（注意写入 .env.production，而不是 .env）：
  ```bash
  python -c "from django.core.management.utils import get_random_secret_key; print('DJANGO_SECRET_KEY=' + get_random_secret_key())" >> .env.production
  ```
- 若已存在该键，请确保只保留一行 DJANGO_SECRET_KEY，避免重复冲突
- 其他推荐项：
  - DEBUG=0
  - 可选：TZ=Asia/Shanghai
  - 可选：LANG=C.UTF-8、LC_ALL=C.UTF-8（用于消除容器 locale 警告）

说明：无需在 settings 中改 ALLOWED_HOSTS。Nginx 已将请求头统一为 Host=localhost，并同步 Referer/Origin，避免 DisallowedHost 与 CSRF 校验问题。

三、启动与防火墙
1) 放行 8001 端口
- firewall-cmd --permanent --add-port=8001/tcp; firewall-cmd --reload
2) 启动
- cd docker
- docker compose up -d --build
若出现 web 容器找不到 entrypoint.sh，可将 docker-compose.yml 的 build 切换到 docker/Dockerfile 后重试。

四、初始化管理员
- docker compose exec web python manage.py createsuperuser --settings=biostatistics_course.settings_production

五、访问与验证
- 前台与后台： http://你的服务器IP:8001/ 和 http://你的服务器IP:8001/admin/
- 查看日志：
  - docker compose logs -f web
  - docker compose logs -f nginx

六、数据持久化与备份
- 持久化目录：db.sqlite3、media/、staticfiles/（staticfiles 可随时通过 collectstatic 重建）
- 建议定期备份 db.sqlite3 与 media/ 目录

七、常见问题
- 502/Bad Gateway：检查 web 是否正常（docker compose logs -f web）
- 静态不加载：检查 staticfiles 是否生成、Nginx 路径是否指向 /var/www/staticfiles
- CSRF 失败：已在 Nginx 统一 Host/Referer/Origin；若仍失败，清理浏览器 Cookie 后重试或检查 Nginx 配置是否最新
- 用户已存在：使用 changepassword 或提升现有用户为管理员

#### HTTPS 部署

生产上建议启用 HTTPS（TLS 终止在 Nginx，后端仍走 HTTP）。无需修改项目代码，仅为 Nginx 挂载证书并新增 443 server。

方案A：使用已有正式证书（推荐）
1) 准备证书文件
   - 将证书放到项目 docker/certs/ 目录（示例）：
     - docker/certs/fullchain.pem
     - docker/certs/privkey.pem
   - 或直接将宿主证书目录挂载到容器 /etc/nginx/certs

2) 在 docker/docker-compose.yml 中为 nginx 服务挂载证书目录
   volumes:
     - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
     - ../staticfiles:/var/www/staticfiles:ro
     - ../media:/var/www/media:ro
     - ./certs:/etc/nginx/certs:ro   # 新增

3) 在 docker/nginx.conf 增加 443 server（示例）
   你可以在文件末尾添加如下配置（80 跳转到 443，443 终止 TLS 并转发到 web:8000）：
   ```
   # 可选：HTTP 全部跳转到 HTTPS
   server {
       listen 80;
       server_name _;
       return 301 https://$host$request_uri;
   }

   # 443 HTTPS
   server {
       listen 443 ssl http2;
       server_name _;

       ssl_certificate     /etc/nginx/certs/fullchain.pem;
       ssl_certificate_key /etc/nginx/certs/privkey.pem;

       client_max_body_size 100M;

       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;

       location /static/ {
           alias /var/www/staticfiles/;
           expires 30d;
           add_header Cache-Control "public, immutable";
       }

       location /media/ {
           alias /var/www/media/;
           expires 30d;
           add_header Cache-Control "public, immutable";
       }

       location / {
           proxy_pass http://web:8000;

           # 统一后端看到的来源，避免 DisallowedHost/CSRF
           proxy_set_header Host localhost;
           proxy_set_header Referer https://localhost$uri$is_args$args;
           proxy_set_header Origin https://localhost;

           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto https;

           proxy_connect_timeout 60s;
           proxy_send_timeout 60s;
           proxy_read_timeout 60s;
       }
   }
   ```

4) 端口映射
   - 如希望对外仍使用 8001 提供 HTTPS：将 nginx 的端口映射从 "8001:80" 改为 "8001:443"
   - 或开放标准 443：映射为 "443:443" 并在防火墙放行 443/tcp

5) 重载
   - cd docker && docker compose up -d --build

方案B：自签名证书（仅测试）
1) 生成自签名证书
   ```
   cd docker
   mkdir -p certs
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout certs/privkey.pem -out certs/fullchain.pem \
     -subj "/CN=localhost"
   ```
2) 参照方案A的挂载与 nginx.conf 配置，重启后通过 https 访问（浏览器会提示不受信任）

可选的 Django 安全项（当前无需改代码也可工作）
- 如允许后续改 settings_production，可开启：
  - SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
  - SESSION_COOKIE_SECURE = True
  - CSRF_COOKIE_SECURE = True
  - SECURE_SSL_REDIRECT = True

## 主要模块说明

### 用户系统
- 扩展Django用户模型，支持多角色
- 自定义注册表单和认证流程
- 中文姓名处理和显示

### 作业系统
- 支持多种题型（选择题、填空题等）
- 自动评分算法
- 成绩统计和分析

### 讨论区
- 分层回复系统
- 消息通知机制
- 权限控制（公开/私密）

### 统计模拟器
- 交互式统计计算工具
- 可视化图表展示
- 教学演示功能

## 开发指南

### 添加新的模拟器

1. 在`simulators/views.py`中添加视图函数
2. 在`simulators/urls.py`中添加URL路由
3. 创建对应的HTML模板
4. 编写JavaScript交互逻辑

### 自定义样式

- 主要样式文件: `static/css/style.css`
- 模拟器样式: `static/css/simulators.css`
- 响应式设计已集成

### 数据库模型扩展

- 用户模型: `core/models.py` - User类
- 作业模型: Assignment, Question, StudentSubmission
- 论坛模型: ForumPost, ForumReply

## 常见问题

### Q: 如何重置管理员密码？
A: 运行 `python manage.py changepassword admin`

### Q: 如何备份数据库？
A: 运行 `python manage.py dumpdata > backup.json`

### Q: 如何添加新的课程内容？
A: 修改 `core/views.py` 中的 `get_courses_data()` 函数

### Q: 模拟器页面显示异常怎么办？
A: 检查浏览器控制台错误，确保JavaScript文件正确加载

## 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

- 项目负责人: 职晓阳
- 邮箱: xyzhi@ynu.edu.cn
- 机构: 云南大学生命科学学院

## 更新日志

### v0.1.0 (2024-12-19)
- 初始版本发布
- 完整的课程管理系统
- 作业和讨论区功能
- 14个统计模拟器
- 用户认证和权限管理

---

© 2024 云南大学生命科学学院生物统计学课程平台. 保留所有权利.
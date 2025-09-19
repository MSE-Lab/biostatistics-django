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
```bash
# 创建论坛分类
python create_forum_categories.py

# 创建教学班级
python create_initial_classes.py

# 创建教师用户
python create_teacher_user.py
```

6. **启动开发服务器**
```bash
python manage.py runserver
```

访问 http://127.0.0.1:8000 查看应用。

### 生产环境部署

⚠️ **重要安全提醒**: 在部署到生产环境前，请务必完成安全修复！

#### 支持的操作系统
- **Ubuntu/Debian**: 使用 `deploy.sh`
- **CentOS/RHEL**: 使用 `deploy_centos.sh`
- **其他Linux发行版**: 参考手动部署指南

#### 快速部署

**Ubuntu/Debian系统**:
```bash
# 1. 完成安全修复
python security_check.py
# 2. 自动部署
sudo ./deploy.sh
```

**CentOS/RHEL系统**:
```bash
# 1. 完成安全修复
python security_check.py
# 2. 自动部署
sudo ./deploy_centos.sh
```

#### 部署前必须完成的安全修复

1. **立即修复高危安全问题**:
```bash
# 快速安全修复
cp .env.example .env
python -c "from django.core.management.utils import get_random_secret_key; print('DJANGO_SECRET_KEY=' + get_random_secret_key())" >> .env
chmod 600 .env
python create_admin_secure.py
rm create_admin.py create_teacher_user.py
```

2. **使用生产环境配置**:
   - 使用 `settings_production.py`
   - 配置SQLite数据库（无需额外配置）
   - 设置正确的ALLOWED_HOSTS

3. **Web服务器配置**:
   - 使用Nginx + Gunicorn
   - 配置SSL证书
   - 设置防火墙规则

#### 详细部署指南
- Ubuntu/Debian: 参考 `DEPLOYMENT_GUIDE.md`
- CentOS/RHEL: 参考 `CENTOS_DEPLOYMENT.md`
- 安全检查: 参考 `SECURITY_CHECKLIST.md`

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
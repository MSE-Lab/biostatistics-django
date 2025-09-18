from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.utils import timezone

class User(AbstractUser):
    """扩展用户模型"""
    USER_TYPE_CHOICES = [
        ('admin', '管理员'),
        ('teacher', '教师'),
        ('student', '学生'),
    ]
    
    user_type = models.CharField(
        max_length=10,
        choices=USER_TYPE_CHOICES,
        default='student',
        verbose_name='用户类型'
    )
    
    real_name = models.CharField(
        max_length=50,
        verbose_name='真实姓名'
    )
    
    class Meta:
        verbose_name = '用户'
        verbose_name_plural = '用户'
    
    def get_unread_private_messages_count(self):
        """获取教师未读私信数量"""
        if self.user_type != 'teacher':
            return 0
        
        # 获取该教师任课的教学班
        teaching_classes = self.teachingclass_set.all()
        
        # 统计未回复的私信帖子（reply_count=0表示没有任何回复）
        unread_count = 0
        for teaching_class in teaching_classes:
            unread_count += teaching_class.forumpost_set.filter(
                visibility='teacher_only',
                reply_count=0
            ).count()
        
        return unread_count
    
    def get_unread_replies_count(self):
        """获取学生未读回复数量"""
        if self.user_type != 'student':
            return 0
        
        try:
            # 获取学生发布的所有帖子
            student_posts = self.forumpost_set.all()
            
            unread_count = 0
            for post in student_posts:
                # 获取该帖子的总回复数
                total_replies = post.reply_count
                
                # 获取学生已读的回复数（通过PostReadStatus记录）
                try:
                    read_status = PostReadStatus.objects.get(user=self, post=post)
                    read_replies = read_status.read_replies_count
                except PostReadStatus.DoesNotExist:
                    read_replies = 0
                
                # 未读回复数 = 总回复数 - 已读回复数
                post_unread = max(0, total_replies - read_replies)
                unread_count += post_unread
            
            return unread_count
        except Exception:
            # 如果数据库表不存在或其他错误，返回0
            return 0
    
    def get_pending_assignments_count(self):
        """获取学生未完成作业数量"""
        if self.user_type != 'student':
            return 0
        
        try:
            # 获取学生的教学班
            student_profile = self.studentprofile
            teaching_class = student_profile.teaching_class
            
            if not teaching_class:
                return 0
            
            # 获取该教学班的所有已发布作业
            published_assignments = Assignment.objects.filter(
                teaching_class=teaching_class,
                status='published'
            )
            
            # 统计未提交的作业数量
            pending_count = 0
            for assignment in published_assignments:
                # 检查学生是否已提交该作业
                has_submitted = StudentSubmission.objects.filter(
                    assignment=assignment,
                    student=self
                ).exists()
                
                if not has_submitted:
                    pending_count += 1
            
            return pending_count
        except Exception:
            return 0

class Class(models.Model):
    """专业班级模型"""
    CLASS_CHOICES = [
        ('bio_elite', '生物科学（拔尖计划2.0基地班）'),
        ('bio_base', '生物科学（国家生物学基地班）'),
        ('biotech_base', '生物技术（国家生命科学与技术基地班）'),
        ('bio_science', '生物科学'),
        ('bio_technology', '生物技术'),
    ]
    
    name = models.CharField(
        max_length=20,
        choices=CLASS_CHOICES,
        unique=True,
        verbose_name='专业班级'
    )
    
    description = models.TextField(
        blank=True,
        verbose_name='班级描述'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    
    class Meta:
        verbose_name = '专业班级'
        verbose_name_plural = '专业班级'
        
    def __str__(self):
        return self.get_name_display()

class TeacherProfile(models.Model):
    """教师详细信息"""
    TITLE_CHOICES = [
        ('professor', '教授'),
        ('associate_professor', '副教授'),
        ('researcher', '研究员'),
        ('associate_researcher', '副研究员'),
        ('lecturer', '讲师'),
        ('assistant', '助教'),
    ]
    
    DEGREE_CHOICES = [
        ('phd', '博士'),
        ('master', '硕士'),
        ('bachelor', '学士'),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={'user_type': 'teacher'},
        verbose_name='用户'
    )
    
    title = models.CharField(
        max_length=20,
        choices=TITLE_CHOICES,
        verbose_name='职称'
    )
    
    degree = models.CharField(
        max_length=10,
        choices=DEGREE_CHOICES,
        verbose_name='学位'
    )
    
    major = models.CharField(
        max_length=100,
        verbose_name='专业'
    )
    
    research_direction = models.TextField(
        verbose_name='研究方向'
    )
    
    photo = models.ImageField(
        upload_to='teacher_photos/',
        blank=True,
        null=True,
        verbose_name='形象照'
    )
    
    bio = models.TextField(
        blank=True,
        verbose_name='个人简介'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    
    class Meta:
        verbose_name = '教师信息'
        verbose_name_plural = '教师信息'
        
    def __str__(self):
        return f"{self.user.real_name} - {self.get_title_display()}"

class StudentProfile(models.Model):
    """学生详细信息"""
    GENDER_CHOICES = [
        ('male', '男'),
        ('female', '女'),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={'user_type': 'student'},
        verbose_name='用户'
    )
    
    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES,
        verbose_name='性别'
    )
    
    student_id = models.CharField(
        max_length=20,
        unique=True,
        validators=[
            RegexValidator(
                regex=r'^\d{10,20}$',
                message='学号必须是10-20位数字'
            )
        ],
        verbose_name='学号'
    )
    
    grade = models.CharField(
        max_length=4,
        default='2024',
        validators=[
            RegexValidator(
                regex=r'^20\d{2}$',
                message='年级必须是4位年份格式，如2022'
            )
        ],
        verbose_name='年级'
    )
    
    student_class = models.ForeignKey(
        Class,
        on_delete=models.CASCADE,
        verbose_name='专业班级'
    )
    
    teaching_class = models.ForeignKey(
        'TeachingClass',
        on_delete=models.CASCADE,
        verbose_name='教学班'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    
    class Meta:
        verbose_name = '学生信息'
        verbose_name_plural = '学生信息'
        
    def __str__(self):
        return f"{self.user.real_name} - {self.student_id}"

class VideoResource(models.Model):
    """视频学习资源"""
    CATEGORY_CHOICES = [
        ('lecture', '课程讲座'),
        ('tutorial', '教程演示'),
        ('case_study', '案例分析'),
        ('software', '软件操作'),
        ('other', '其他'),
    ]
    
    title = models.CharField(
        max_length=200,
        verbose_name='视频标题'
    )
    
    description = models.TextField(
        verbose_name='视频描述'
    )
    
    thumbnail = models.ImageField(
        upload_to='video_thumbnails/',
        verbose_name='视频缩略图'
    )
    
    video_url = models.URLField(
        verbose_name='视频链接',
        help_text='支持YouTube、Bilibili等视频平台链接'
    )
    
    embed_url = models.URLField(
        blank=True,
        verbose_name='嵌入播放链接',
        help_text='用于模态框播放的嵌入链接'
    )
    
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='lecture',
        verbose_name='视频分类'
    )
    
    duration = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='视频时长',
        help_text='格式：mm:ss 或 hh:mm:ss'
    )
    
    view_count = models.PositiveIntegerField(
        default=0,
        verbose_name='观看次数'
    )
    
    is_featured = models.BooleanField(
        default=False,
        verbose_name='是否推荐'
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={'user_type': 'admin'},
        verbose_name='创建者'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )
    
    class Meta:
        verbose_name = '视频资源'
        verbose_name_plural = '视频资源'
        ordering = ['-created_at']
        
    def __str__(self):
        return self.title
    
    def increment_view_count(self):
        """增加观看次数"""
        self.view_count += 1
        self.save(update_fields=['view_count'])


class ForumCategory(models.Model):
    """讨论区分类"""
    name = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='分类名称'
    )
    
    description = models.TextField(
        blank=True,
        verbose_name='分类描述'
    )
    
    icon = models.CharField(
        max_length=50,
        default='💬',
        verbose_name='分类图标'
    )
    
    order = models.PositiveIntegerField(
        default=0,
        verbose_name='排序'
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name='是否启用'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    
    class Meta:
        verbose_name = '讨论区分类'
        verbose_name_plural = '讨论区分类'
        ordering = ['order', 'name']
        
    def __str__(self):
        return self.name


class ForumPost(models.Model):
    """讨论帖子"""
    POST_TYPE_CHOICES = [
        ('discussion', '讨论帖'),
        ('question', '问答帖'),
        ('announcement', '公告帖'),
    ]
    
    VISIBILITY_CHOICES = [
        ('public', '完全开放'),
        ('class_only', '教学班内可见'),
        ('teacher_only', '私信给教师'),
    ]
    
    title = models.CharField(
        max_length=200,
        verbose_name='标题'
    )
    
    content = models.TextField(
        verbose_name='内容'
    )
    
    post_type = models.CharField(
        max_length=20,
        choices=POST_TYPE_CHOICES,
        default='discussion',
        verbose_name='帖子类型'
    )
    
    visibility = models.CharField(
        max_length=20,
        choices=VISIBILITY_CHOICES,
        default='public',
        verbose_name='可见性',
        help_text='完全开放：所有注册用户可见；教学班内可见：同教学班学生和任课教师可见；私信给教师：仅作者和任课教师可见'
    )
    
    category = models.ForeignKey(
        ForumCategory,
        on_delete=models.CASCADE,
        verbose_name='分类'
    )
    
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name='作者'
    )
    
    teaching_class = models.ForeignKey(
        'TeachingClass',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name='关联教学班',
        help_text='学生发帖时自动关联其所在教学班，用于权限控制'
    )
    
    is_pinned = models.BooleanField(
        default=False,
        verbose_name='是否置顶'
    )
    
    is_locked = models.BooleanField(
        default=False,
        verbose_name='是否锁定'
    )
    
    view_count = models.PositiveIntegerField(
        default=0,
        verbose_name='浏览次数'
    )
    
    reply_count = models.PositiveIntegerField(
        default=0,
        verbose_name='回复数量'
    )
    
    last_reply_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='最后回复时间'
    )
    
    last_reply_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='last_replies',
        verbose_name='最后回复者'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )
    
    class Meta:
        verbose_name = '讨论帖子'
        verbose_name_plural = '讨论帖子'
        ordering = ['-is_pinned', '-last_reply_at', '-created_at']
        
    def __str__(self):
        return self.title
    
    def increment_view_count(self):
        """增加浏览次数"""
        self.view_count += 1
        self.save(update_fields=['view_count'])
    
    def can_view(self, user):
        """检查用户是否可以查看此帖子"""
        if not user.is_authenticated:
            return False
        
        # 作者总是可以查看自己的帖子
        if self.author == user:
            return True
        
        # 管理员可以查看所有帖子
        if user.user_type == 'admin':
            return True
        
        # 根据可见性级别判断
        if self.visibility == 'public':
            # 完全开放：所有注册用户可见
            return True
        elif self.visibility == 'class_only':
            # 教学班内可见：同教学班学生和任课教师可见
            if user.user_type == 'teacher':
                # 教师：检查是否是该教学班的任课教师
                return self.teaching_class and self.teaching_class.created_by == user
            elif user.user_type == 'student':
                # 学生：检查是否在同一个教学班
                try:
                    student_profile = user.studentprofile
                    return student_profile.teaching_class == self.teaching_class
                except:
                    return False
        elif self.visibility == 'teacher_only':
            # 私信给教师：仅作者和任课教师可见
            if user.user_type == 'teacher':
                return self.teaching_class and self.teaching_class.created_by == user
        
        return False
    
    def can_reply(self, user):
        """检查用户是否可以回复此帖子"""
        if not user.is_authenticated or self.is_locked:
            return False
        
        # 首先检查是否可以查看
        if not self.can_view(user):
            return False
        
        # 管理员可以回复所有可见帖子
        if user.user_type == 'admin':
            return True
        
        # 作者可以回复自己的帖子
        if self.author == user:
            return True
        
        # 根据可见性级别判断回复权限
        if self.visibility == 'public':
            return True
        elif self.visibility == 'class_only':
            # 教学班内可见的帖子，同班学生和任课教师可以回复
            if user.user_type == 'teacher':
                return self.teaching_class and self.teaching_class.created_by == user
            elif user.user_type == 'student':
                try:
                    student_profile = user.studentprofile
                    return student_profile.teaching_class == self.teaching_class
                except:
                    return False
        elif self.visibility == 'teacher_only':
            # 私信给教师的帖子，只有任课教师可以回复
            if user.user_type == 'teacher':
                return self.teaching_class and self.teaching_class.created_by == user
        
        return False


class ForumReply(models.Model):
    """帖子回复"""
    post = models.ForeignKey(
        ForumPost,
        on_delete=models.CASCADE,
        related_name='replies',
        verbose_name='帖子'
    )
    
    content = models.TextField(
        verbose_name='回复内容'
    )
    
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name='回复者'
    )
    
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='父回复'
    )
    
    is_best_answer = models.BooleanField(
        default=False,
        verbose_name='是否为最佳答案'
    )
    
    like_count = models.PositiveIntegerField(
        default=0,
        verbose_name='点赞数'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )
    
    class Meta:
        verbose_name = '帖子回复'
        verbose_name_plural = '帖子回复'
        ordering = ['-is_best_answer', 'created_at']
        
    def __str__(self):
        return f'{self.post.title} - {self.author.real_name}'
    
    def save(self, *args, **kwargs):
        """保存时更新帖子的回复统计"""
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            # 更新帖子的回复数量和最后回复信息
            self.post.reply_count = self.post.replies.count()
            self.post.last_reply_at = self.created_at
            self.post.last_reply_by = self.author
            self.post.save(update_fields=['reply_count', 'last_reply_at', 'last_reply_by'])


class ForumLike(models.Model):
    """点赞记录"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name='用户'
    )
    
    reply = models.ForeignKey(
        ForumReply,
        on_delete=models.CASCADE,
        verbose_name='回复'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='点赞时间'
    )
    
    class Meta:
        verbose_name = '点赞记录'
        verbose_name_plural = '点赞记录'
        unique_together = ['user', 'reply']
        
    def __str__(self):
        return f'{self.user.real_name} 点赞了 {self.reply}'


class PostReadStatus(models.Model):
    """帖子阅读状态模型"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name='用户'
    )
    
    post = models.ForeignKey(
        ForumPost,
        on_delete=models.CASCADE,
        verbose_name='帖子'
    )
    
    read_replies_count = models.PositiveIntegerField(
        default=0,
        verbose_name='已读回复数量',
        help_text='用户最后一次查看该帖子时的回复总数'
    )
    
    last_read_at = models.DateTimeField(
        auto_now=True,
        verbose_name='最后阅读时间'
    )
    
    class Meta:
        verbose_name = '帖子阅读状态'
        verbose_name_plural = '帖子阅读状态'
        unique_together = ['user', 'post']
        
    def __str__(self):
        return f'{self.user.real_name} - {self.post.title}'
    
    def mark_as_read(self):
        """标记为已读，更新已读回复数量为当前帖子的总回复数"""
        self.read_replies_count = self.post.reply_count
        self.save(update_fields=['read_replies_count', 'last_read_at'])


class TeachingClass(models.Model):
    """教学班模型"""
    TEACHING_STATUS_CHOICES = [
        ('open', '开课'),
        ('in_progress', '进行中'),
        ('finished', '结课'),
    ]
    
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name='教学班编号',
        help_text='例如：202420241YN301018000701'
    )
    
    description = models.TextField(
        blank=True,
        verbose_name='教学班描述'
    )
    
    class_time = models.CharField(
        max_length=200,
        default='待安排',
        verbose_name='上课时间',
        help_text='例如：周二 8:00-10:00, 周四 14:00-16:00'
    )
    
    class_location = models.CharField(
        max_length=100,
        default='待安排',
        verbose_name='上课地点',
        help_text='例如：生科楼201教室'
    )
    
    start_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='开课日期'
    )
    
    end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='结课日期'
    )
    
    max_students = models.PositiveIntegerField(
        default=50,
        verbose_name='选课人数',
        help_text='该教学班的最大学生容量'
    )
    
    teaching_status = models.CharField(
        max_length=20,
        choices=TEACHING_STATUS_CHOICES,
        default='open',
        verbose_name='教学状态'
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={'user_type': 'teacher'},
        verbose_name='创建教师'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )
    
    class Meta:
        verbose_name = '教学班'
        verbose_name_plural = '教学班'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.name} - {self.get_teaching_status_display()}"
    
    @property
    def registered_students_count(self):
        """已注册学生数量"""
        return self.studentprofile_set.count()
    
    @property
    def is_full(self):
        """是否已满员"""
        return self.registered_students_count >= self.max_students
    
    @property
    def can_register(self):
        """是否可以注册"""
        return self.teaching_status == 'open' and not self.is_full
    
    def update_status_if_full(self):
        """如果已满员且状态为开课，则更新为进行中"""
        if self.teaching_status == 'open' and self.is_full:
            self.teaching_status = 'in_progress'
            self.save(update_fields=['teaching_status', 'updated_at'])
            return True
        return False
    
    def check_auto_finish(self):
        """检查是否应该自动结课"""
        if self.teaching_status == 'in_progress' and timezone.now().date() > self.end_date:
            self.teaching_status = 'finished'
            self.save(update_fields=['teaching_status', 'updated_at'])
            return True
        return False


# ==================== 作业系统模型 ====================

class Assignment(models.Model):
    """作业模型"""
    STATUS_CHOICES = [
        ('draft', '草稿'),
        ('published', '已发布'),
        ('closed', '已截止'),
        ('archived', '已归档'),
    ]
    
    title = models.CharField(
        max_length=200,
        verbose_name='作业标题'
    )
    
    description = models.TextField(
        verbose_name='作业描述',
        help_text='作业的详细说明和要求'
    )
    
    teaching_class = models.ForeignKey(
        TeachingClass,
        on_delete=models.CASCADE,
        verbose_name='教学班',
        help_text='作业分发的目标教学班'
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={'user_type': 'teacher'},
        verbose_name='创建教师'
    )
    
    chapter = models.IntegerField(
        verbose_name='所属章节',
        help_text='对应课程的第几章',
        null=True,
        blank=True
    )
    
    publish_time = models.DateTimeField(
        verbose_name='发布时间',
        help_text='作业对学生可见的时间'
    )
    
    due_time = models.DateTimeField(
        verbose_name='截止时间',
        help_text='学生提交作业的最后期限'
    )
    
    total_score = models.IntegerField(
        default=100,
        verbose_name='总分',
        help_text='作业的满分分值'
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name='状态'
    )
    
    allow_late_submission = models.BooleanField(
        default=False,
        verbose_name='允许逾期提交',
        help_text='是否允许学生在截止时间后提交'
    )
    
    max_attempts = models.IntegerField(
        default=1,
        verbose_name='最大提交次数',
        help_text='学生可以提交的最大次数，0表示无限制'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )
    
    class Meta:
        verbose_name = '作业'
        verbose_name_plural = '作业'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.title} - {self.teaching_class.name}"
    
    @property
    def is_published(self):
        """是否已发布"""
        return self.status == 'published' and timezone.now() >= self.publish_time
    
    @property
    def is_due(self):
        """是否已截止"""
        return timezone.now() > self.due_time
    
    @property
    def can_submit(self):
        """是否可以提交"""
        if not self.is_published:
            return False
        if self.is_due and not self.allow_late_submission:
            return False
        return True
    
    @property
    def submission_count(self):
        """提交数量（仅统计正式提交）"""
        return self.studentsubmission_set.filter(is_submitted=True).count()
    
    @property
    def graded_count(self):
        """已批改数量"""
        return self.studentsubmission_set.filter(is_graded=True, is_submitted=True).count()
    
    def get_student_submission(self, student):
        """获取指定学生的提交记录"""
        try:
            # 优先返回正式提交的记录
            submitted = self.studentsubmission_set.filter(student=student, is_submitted=True).latest('submit_time')
            return submitted
        except StudentSubmission.DoesNotExist:
            try:
                # 如果没有正式提交，返回草稿
                draft = self.studentsubmission_set.filter(student=student, is_submitted=False).latest('submit_time')
                return draft
            except StudentSubmission.DoesNotExist:
                return None
    
    def can_student_submit(self, student):
        """检查学生是否可以提交"""
        if not self.can_submit:
            return False
        
        if self.max_attempts == 0:  # 无限制
            return True
        
        submission_count = self.studentsubmission_set.filter(student=student, is_submitted=True).count()
        return submission_count < self.max_attempts


class Question(models.Model):
    """题目模型"""
    TYPE_CHOICES = [
        ('single_choice', '单选题'),
        ('multiple_choice', '多选题'),
        ('fill_blank', '填空题'),
        ('short_answer', '简答题'),
        ('essay', '论述题'),
        ('true_false', '判断题'),
    ]
    
    DIFFICULTY_CHOICES = [
        ('easy', '基础'),
        ('medium', '中等'),
        ('hard', '困难'),
    ]
    
    assignment = models.ForeignKey(
        Assignment,
        on_delete=models.CASCADE,
        related_name='questions',
        verbose_name='所属作业'
    )
    
    content = models.TextField(
        verbose_name='题目内容',
        help_text='题目的具体描述'
    )
    
    question_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        verbose_name='题目类型'
    )
    
    difficulty = models.CharField(
        max_length=10,
        choices=DIFFICULTY_CHOICES,
        default='medium',
        verbose_name='难度等级'
    )
    
    options = models.JSONField(
        null=True,
        blank=True,
        verbose_name='选项',
        help_text='选择题的选项，JSON格式存储'
    )
    
    correct_answer = models.TextField(
        verbose_name='正确答案',
        help_text='题目的标准答案'
    )
    
    explanation = models.TextField(
        blank=True,
        verbose_name='答案解析',
        help_text='对正确答案的详细解释'
    )
    
    score = models.IntegerField(
        default=10,
        verbose_name='分值',
        help_text='该题目的分值'
    )
    
    order = models.IntegerField(
        default=0,
        verbose_name='排序',
        help_text='题目在作业中的显示顺序'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    
    class Meta:
        verbose_name = '题目'
        verbose_name_plural = '题目'
        ordering = ['assignment', 'order', 'id']
        
    def __str__(self):
        return f"{self.assignment.title} - 第{self.order}题"
    
    def get_options_list(self):
        """获取选项列表"""
        if self.options and isinstance(self.options, (list, dict)):
            if isinstance(self.options, dict):
                return [{'key': k, 'value': v} for k, v in self.options.items()]
            return self.options
        return []
    
    def is_correct_answer(self, student_answer):
        """检查学生答案是否正确（仅适用于客观题）"""
        if self.question_type in ['single_choice', 'multiple_choice']:
            if self.question_type == 'single_choice':
                return str(student_answer).strip() == str(self.correct_answer).strip()
            else:  # multiple_choice
                if isinstance(student_answer, str):
                    student_answer = student_answer.split(',')
                if isinstance(self.correct_answer, str):
                    correct_answers = self.correct_answer.split(',')
                else:
                    correct_answers = self.correct_answer
                return set(map(str.strip, student_answer)) == set(map(str.strip, correct_answers))
        elif self.question_type == 'fill_blank':
            # 填空题简单字符串匹配
            return str(student_answer).strip().lower() == str(self.correct_answer).strip().lower()
        
        # 主观题需要人工批改
        return None


class StudentSubmission(models.Model):
    """学生提交记录"""
    assignment = models.ForeignKey(
        Assignment,
        on_delete=models.CASCADE,
        verbose_name='作业'
    )
    
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={'user_type': 'student'},
        verbose_name='学生'
    )
    
    answers = models.JSONField(
        verbose_name='学生答案',
        help_text='学生对各题目的答案，JSON格式存储'
    )
    
    submit_time = models.DateTimeField(
        auto_now_add=True,
        verbose_name='提交时间'
    )
    
    score = models.FloatField(
        null=True,
        blank=True,
        verbose_name='得分',
        help_text='作业的总得分'
    )
    
    is_graded = models.BooleanField(
        default=False,
        verbose_name='是否已批改'
    )
    
    is_submitted = models.BooleanField(
        default=True,
        verbose_name='是否正式提交',
        help_text='False表示草稿状态，True表示正式提交'
    )
    
    is_late = models.BooleanField(
        default=False,
        verbose_name='是否逾期提交'
    )
    
    teacher_comments = models.TextField(
        blank=True,
        verbose_name='教师评语',
        help_text='教师对学生作业的整体评价'
    )
    
    graded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='graded_submissions',
        limit_choices_to={'user_type': 'teacher'},
        verbose_name='批改教师'
    )
    
    graded_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='批改时间'
    )
    
    class Meta:
        verbose_name = '学生提交记录'
        verbose_name_plural = '学生提交记录'
        ordering = ['-submit_time']
        unique_together = ['assignment', 'student', 'submit_time']
        
    def __str__(self):
        return f"{self.student.real_name} - {self.assignment.title}"
    
    def save(self, *args, **kwargs):
        # 检查是否逾期提交
        if not self.pk:  # 新提交
            self.is_late = timezone.now() > self.assignment.due_time
        super().save(*args, **kwargs)
    
    @property
    def score_percentage(self):
        """得分百分比"""
        if self.score is not None and self.assignment.total_score > 0:
            return round((self.score / self.assignment.total_score) * 100, 1)
        return None
    
    def get_answer(self, question_id):
        """获取指定题目的答案"""
        if isinstance(self.answers, dict):
            return self.answers.get(str(question_id), '')
        return ''
    
    def set_answer(self, question_id, answer):
        """设置指定题目的答案"""
        if not isinstance(self.answers, dict):
            self.answers = {}
        self.answers[str(question_id)] = answer


class QuestionScore(models.Model):
    """题目得分记录"""
    submission = models.ForeignKey(
        StudentSubmission,
        on_delete=models.CASCADE,
        related_name='question_scores',
        verbose_name='提交记录'
    )
    
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        verbose_name='题目'
    )
    
    score = models.FloatField(
        verbose_name='得分',
        help_text='该题目的得分'
    )
    
    teacher_comment = models.TextField(
        blank=True,
        verbose_name='教师评语',
        help_text='教师对该题目的具体评价'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    
    class Meta:
        verbose_name = '题目得分记录'
        verbose_name_plural = '题目得分记录'
        unique_together = ['submission', 'question']
        
    def __str__(self):
        return f"{self.submission.student.real_name} - {self.question} - {self.score}分"
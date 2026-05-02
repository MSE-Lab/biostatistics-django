from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, TeacherProfile, StudentProfile, Class, TeachingClass, VideoResource, ForumCategory, ForumPost, ForumReply, ForumLike, PostReadStatus, Assignment, Question, StudentSubmission

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """用户管理"""
    list_display = ('username', 'real_name', 'user_type', 'email', 'is_active', 'date_joined')
    list_filter = ('user_type', 'is_active', 'date_joined')
    search_fields = ('username', 'real_name', 'email')
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('扩展信息', {
            'fields': ('user_type', 'real_name')
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('扩展信息', {
            'fields': ('user_type', 'real_name', 'email')
        }),
    )

@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    """专业班级管理"""
    list_display = ('name', 'description', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at',)
    
    fieldsets = (
        ('基本信息', {
            'fields': ('name', 'description')
        }),
        ('创建信息', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(TeachingClass)
class TeachingClassAdmin(admin.ModelAdmin):
    """教学班管理"""
    list_display = ('name', 'teaching_status', 'class_time', 'class_location', 'max_students', 
                   'registered_students_count', 'created_by', 'start_date', 'end_date')
    list_filter = ('teaching_status', 'created_at', 'start_date', 'end_date', 'created_by')
    search_fields = ('name', 'description', 'class_location')
    list_editable = ('teaching_status',)
    readonly_fields = ('registered_students_count', 'created_at', 'updated_at')
    
    fieldsets = (
        ('基本信息', {
            'fields': ('name', 'description', 'created_by')
        }),
        ('教学安排', {
            'fields': ('class_time', 'class_location', 'start_date', 'end_date')
        }),
        ('容量设置', {
            'fields': ('max_students', 'teaching_status')
        }),
        ('统计信息', {
            'fields': ('registered_students_count', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def registered_students_count(self, obj):
        return obj.registered_students_count
    registered_students_count.short_description = '已注册人数'
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "created_by":
            kwargs["queryset"] = User.objects.filter(user_type='teacher')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

@admin.register(TeacherProfile)
class TeacherProfileAdmin(admin.ModelAdmin):
    """教师信息管理"""
    list_display = ('user', 'get_real_name', 'title', 'degree', 'major', 'photo_preview')
    list_filter = ('title', 'degree', 'created_at')
    search_fields = ('user__real_name', 'user__username', 'major', 'research_direction')
    
    def get_real_name(self, obj):
        return obj.user.real_name
    get_real_name.short_description = '姓名'
    
    def photo_preview(self, obj):
        if obj.photo:
            return format_html('<img src="{}" width="50" height="50" style="border-radius: 50%;" />', obj.photo.url)
        return "无照片"
    photo_preview.short_description = '头像预览'
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "user":
            kwargs["queryset"] = User.objects.filter(user_type='teacher')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    """学生信息管理"""
    list_display = ('get_real_name', 'student_id', 'get_username', 'gender', 'grade', 'student_class', 'teaching_class', 'get_teaching_status')
    list_filter = ('gender', 'grade', 'student_class', 'teaching_class', 'teaching_class__teaching_status', 'created_at')
    search_fields = ('user__real_name', 'user__username', 'student_id')
    list_editable = ('teaching_class',)  # 允许在列表页直接编辑教学班
    list_per_page = 50
    
    fieldsets = (
        ('学生基本信息', {
            'fields': ('user', 'student_id', 'gender', 'grade')
        }),
        ('班级信息', {
            'fields': ('student_class', 'teaching_class'),
            'description': '专业班级是学生的专业归属，教学班是具体的上课班级'
        }),
        ('创建信息', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at',)
    
    def get_real_name(self, obj):
        return obj.user.real_name
    get_real_name.short_description = '姓名'
    get_real_name.admin_order_field = 'user__real_name'
    
    def get_username(self, obj):
        return obj.user.username
    get_username.short_description = '用户名'
    get_username.admin_order_field = 'user__username'
    
    def get_teaching_status(self, obj):
        """显示教学班状态"""
        status_colors = {
            'open': '#34c759',      # 绿色 - 开课
            'in_progress': '#007aff', # 蓝色 - 进行中
            'finished': '#86868b'    # 灰色 - 结课
        }
        color = status_colors.get(obj.teaching_class.teaching_status, '#86868b')
        return format_html(
            '<span style="color: {}; font-weight: 500;">● {}</span>',
            color,
            obj.teaching_class.get_teaching_status_display()
        )
    get_teaching_status.short_description = '教学班状态'
    get_teaching_status.admin_order_field = 'teaching_class__teaching_status'
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "user":
            kwargs["queryset"] = User.objects.filter(user_type='student')
        elif db_field.name == "teaching_class":
            # 显示所有教学班，不仅仅是开放的
            kwargs["queryset"] = TeachingClass.objects.all().order_by('-created_at')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
    
    def get_queryset(self, request):
        """优化查询性能"""
        return super().get_queryset(request).select_related(
            'user', 'student_class', 'teaching_class'
        )
    
    # 批量操作
    actions = ['batch_change_teaching_class']
    
    def batch_change_teaching_class(self, request, queryset):
        """批量修改教学班"""
        from django.http import HttpResponseRedirect
        from django.urls import reverse
        from django.contrib import messages
        
        selected_ids = list(queryset.values_list('id', flat=True))
        request.session['selected_student_ids'] = selected_ids
        
        messages.info(request, f'已选择 {len(selected_ids)} 名学生，请在下一页选择目标教学班')
        return HttpResponseRedirect(reverse('admin:batch_change_teaching_class'))
    
    batch_change_teaching_class.short_description = "批量修改教学班"

@admin.register(VideoResource)
class VideoResourceAdmin(admin.ModelAdmin):
    """视频资源管理"""
    list_display = ('title', 'category', 'duration', 'view_count', 'is_featured', 'created_by', 'created_at')
    list_filter = ('category', 'is_featured', 'created_at')
    search_fields = ('title', 'description')
    readonly_fields = ('view_count', 'created_at', 'updated_at')
    
    fieldsets = (
        ('基本信息', {
            'fields': ('title', 'description', 'category', 'is_featured')
        }),
        ('视频信息', {
            'fields': ('thumbnail', 'video_url', 'embed_url', 'duration')
        }),
        ('统计信息', {
            'fields': ('view_count', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # 新建时设置创建者
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "created_by":
            kwargs["queryset"] = User.objects.filter(user_type='admin')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


# ==================== 讨论区管理 ====================

@admin.register(ForumCategory)
class ForumCategoryAdmin(admin.ModelAdmin):
    """讨论区分类管理"""
    list_display = ('name', 'icon', 'order', 'is_active', 'post_count', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'description')
    list_editable = ('order', 'is_active')
    ordering = ('order', 'name')
    
    def post_count(self, obj):
        return obj.forumpost_set.count()
    post_count.short_description = '帖子数量'


@admin.register(ForumPost)
class ForumPostAdmin(admin.ModelAdmin):
    """讨论帖子管理"""
    list_display = ('title', 'post_type', 'category', 'author', 'get_visibility_display', 'teaching_class',
                   'is_pinned', 'is_locked', 'view_count', 'reply_count', 'created_at')
    list_filter = ('post_type', 'category', 'visibility', 'teaching_class', 'is_pinned', 'is_locked', 'created_at')
    search_fields = ('title', 'content', 'author__real_name')
    list_editable = ('is_pinned', 'is_locked')
    readonly_fields = ('view_count', 'reply_count', 'last_reply_at', 'last_reply_by', 'created_at', 'updated_at')
    
    fieldsets = (
        ('基本信息', {
            'fields': ('title', 'content', 'post_type', 'category', 'author')
        }),
        ('权限设置', {
            'fields': ('visibility', 'teaching_class'),
            'description': '可见性设置：完全开放=所有用户可见，教学班内可见=同班学生和任课教师可见，私信给教师=仅作者和任课教师可见'
        }),
        ('状态设置', {
            'fields': ('is_pinned', 'is_locked')
        }),
        ('统计信息', {
            'fields': ('view_count', 'reply_count', 'last_reply_at', 'last_reply_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_visibility_display(self, obj):
        """显示可见性级别，带颜色标识"""
        visibility_colors = {
            'public': '#34c759',      # 绿色 - 完全开放
            'class_only': '#ff9500',  # 橙色 - 教学班内可见  
            'teacher_only': '#ff3b30' # 红色 - 私信教师
        }
        color = visibility_colors.get(obj.visibility, '#86868b')
        return format_html(
            '<span style="color: {}; font-weight: 500;">● {}</span>',
            color,
            obj.get_visibility_display()
        )
    get_visibility_display.short_description = '开放级别'
    get_visibility_display.admin_order_field = 'visibility'
    
    def save_model(self, request, obj, form, change):
        if not change:  # 新建时设置作者
            obj.author = request.user
        super().save_model(request, obj, form, change)


@admin.register(ForumReply)
class ForumReplyAdmin(admin.ModelAdmin):
    """帖子回复管理"""
    list_display = ('get_post_title', 'author', 'is_best_answer', 'like_count', 'created_at')
    list_filter = ('is_best_answer', 'created_at', 'post__category')
    search_fields = ('content', 'author__real_name', 'post__title')
    list_editable = ('is_best_answer',)
    readonly_fields = ('like_count', 'created_at', 'updated_at')
    
    def get_post_title(self, obj):
        return obj.post.title[:50] + ('...' if len(obj.post.title) > 50 else '')
    get_post_title.short_description = '所属帖子'
    
    fieldsets = (
        ('基本信息', {
            'fields': ('post', 'content', 'author', 'parent')
        }),
        ('状态设置', {
            'fields': ('is_best_answer',)
        }),
        ('统计信息', {
            'fields': ('like_count', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ForumLike)
class ForumLikeAdmin(admin.ModelAdmin):
    """点赞记录管理"""
    list_display = ('user', 'get_reply_content', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__real_name', 'reply__content')
    
    def get_reply_content(self, obj):
        return obj.reply.content[:50] + ('...' if len(obj.reply.content) > 50 else '')
    get_reply_content.short_description = '回复内容'


@admin.register(PostReadStatus)
class PostReadStatusAdmin(admin.ModelAdmin):
    """帖子阅读状态管理"""
    list_display = ('user', 'get_post_title', 'read_replies_count', 'get_total_replies', 'get_unread_count', 'last_read_at')
    list_filter = ('last_read_at', 'post__category', 'user__user_type')
    search_fields = ('user__real_name', 'post__title')
    readonly_fields = ('last_read_at',)
    
    def get_post_title(self, obj):
        return obj.post.title[:50] + ('...' if len(obj.post.title) > 50 else '')
    get_post_title.short_description = '帖子标题'
    
    def get_total_replies(self, obj):
        return obj.post.reply_count
    get_total_replies.short_description = '总回复数'
    
    def get_unread_count(self, obj):
        unread = max(0, obj.post.reply_count - obj.read_replies_count)
        if unread > 0:
            return format_html('<span style="color: #ff3b30; font-weight: 600;">{}</span>', unread)
        return unread
    get_unread_count.short_description = '未读回复数'
    
    fieldsets = (
        ('基本信息', {
            'fields': ('user', 'post')
        }),
        ('阅读状态', {
            'fields': ('read_replies_count', 'last_read_at')
        }),
    )


# ==================== 作业系统管理 ====================

@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    """作业管理"""
    list_display = ('title', 'teaching_class', 'chapter', 'status', 'total_score', 
                   'publish_time', 'due_time', 'submission_count', 'graded_count', 'created_by')
    list_filter = ('status', 'chapter', 'teaching_class', 'publish_time', 'due_time', 'created_by')
    search_fields = ('title', 'description')
    readonly_fields = ('submission_count', 'graded_count', 'created_at', 'updated_at')
    
    fieldsets = (
        ('基本信息', {
            'fields': ('title', 'description', 'teaching_class', 'chapter', 'created_by')
        }),
        ('时间设置', {
            'fields': ('publish_time', 'due_time', 'allow_late_submission')
        }),
        ('分数设置', {
            'fields': ('total_score', 'status')
        }),
        ('统计信息', {
            'fields': ('submission_count', 'graded_count', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def submission_count(self, obj):
        return obj.studentsubmission_set.count()
    submission_count.short_description = '提交人数'
    
    def graded_count(self, obj):
        return obj.studentsubmission_set.filter(is_graded=True).count()
    graded_count.short_description = '已批改'
    
    def save_model(self, request, obj, form, change):
        if not change:  # 新建时设置创建者
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


class QuestionInline(admin.TabularInline):
    """题目内联编辑"""
    model = Question
    extra = 1
    fields = ('content', 'question_type', 'score', 'order')
    readonly_fields = ('created_at',)


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    """题目管理"""
    list_display = ('get_assignment_title', 'question_type', 'score', 'order', 'created_at')
    list_filter = ('question_type', 'assignment__teaching_class', 'created_at')
    search_fields = ('content', 'assignment__title')
    
    fieldsets = (
        ('基本信息', {
            'fields': ('assignment', 'content', 'question_type', 'score', 'order')
        }),
        ('答案设置', {
            'fields': ('options', 'correct_answer')
        }),
        ('创建信息', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def get_assignment_title(self, obj):
        return obj.assignment.title[:30] + ('...' if len(obj.assignment.title) > 30 else '')
    get_assignment_title.short_description = '所属作业'


@admin.register(StudentSubmission)
class StudentSubmissionAdmin(admin.ModelAdmin):
    """学生提交管理"""
    list_display = ('get_assignment_title', 'get_student_name', 'submit_time', 'score', 
                   'is_graded', 'is_late', 'grade_display')
    list_filter = ('is_graded', 'is_late', 'assignment__teaching_class', 'submit_time')
    search_fields = ('student__real_name', 'student__username', 'assignment__title')
    readonly_fields = ('submit_time', 'is_late')
    
    fieldsets = (
        ('基本信息', {
            'fields': ('assignment', 'student', 'submit_time', 'is_late')
        }),
        ('答案内容', {
            'fields': ('answers',)
        }),
        ('批改信息', {
            'fields': ('score', 'is_graded', 'teacher_comments')
        }),

    )
    
    def get_assignment_title(self, obj):
        return obj.assignment.title[:30] + ('...' if len(obj.assignment.title) > 30 else '')
    get_assignment_title.short_description = '作业标题'
    
    def get_student_name(self, obj):
        return obj.student.real_name
    get_student_name.short_description = '学生姓名'
    
    def grade_display(self, obj):
        if not obj.is_graded:
            return format_html('<span style="color: #ff9500;">待批改</span>')
        
        # 计算百分比
        percentage = obj.score_percentage
        if percentage is None:
            return format_html('<span style="color: #86868b;">无分数</span>')
        
        # 根据百分比确定等级和颜色
        if percentage >= 90:
            grade_text = '优秀'
            color = '#34c759'
        elif percentage >= 80:
            grade_text = '良好'
            color = '#007aff'
        elif percentage >= 70:
            grade_text = '中等'
            color = '#ff9500'
        elif percentage >= 60:
            grade_text = '及格'
            color = '#ff9500'
        else:
            grade_text = '不及格'
            color = '#ff3b30'
        
        return format_html(
            '<span style="color: {}; font-weight: 500;">{} ({}%)</span>',
            color,
            grade_text,
            percentage
        )
    grade_display.short_description = '等级'
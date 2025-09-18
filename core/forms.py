from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.core.validators import RegexValidator
from django.db import models
from .models import User, StudentProfile, Class, TeachingClass

class StudentRegistrationForm(UserCreationForm):
    """学生注册表单"""
    real_name = forms.CharField(
        max_length=50,
        label='真实姓名',
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': '请输入您的真实姓名'
        })
    )
    
    email = forms.EmailField(
        label='邮箱地址',
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': '请输入邮箱地址'
        })
    )
    
    gender = forms.ChoiceField(
        choices=StudentProfile.GENDER_CHOICES,
        label='性别',
        widget=forms.Select(attrs={
            'class': 'form-control'
        })
    )
    
    student_id = forms.CharField(
        max_length=20,
        label='学号',
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': '请输入10-20位数字学号'
        })
    )
    
    grade = forms.CharField(
        max_length=4,
        label='年级',
        validators=[
            RegexValidator(
                regex=r'^20\d{2}$',
                message='年级必须是4位年份格式，如2022'
            )
        ],
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': '请输入年级，如2022'
        })
    )
    
    student_class = forms.ModelChoiceField(
        queryset=Class.objects.all(),
        label='专业班级',
        empty_label='请选择专业班级',
        widget=forms.Select(attrs={
            'class': 'form-control'
        }),
        help_text='选择您所属的专业班级'
    )
    
    teaching_class = forms.ModelChoiceField(
        queryset=TeachingClass.objects.none(),  # 初始为空，在__init__中设置
        label='教学班',
        empty_label='请选择教学班',
        widget=forms.Select(attrs={
            'class': 'form-control'
        }),
        help_text='只显示当前开放注册的教学班'
    )
    
    class Meta:
        model = User
        fields = ('username', 'real_name', 'email', 'password1', 'password2')
        widgets = {
            'username': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': '请输入用户名'
            }),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # 自定义密码字段样式
        self.fields['password1'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': '请输入密码'
        })
        self.fields['password2'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': '请再次输入密码'
        })
        
        # 设置可选择的教学班（只显示开放注册的教学班）
        self.fields['teaching_class'].queryset = TeachingClass.objects.filter(
            teaching_status='open'
        ).annotate(
            registered_count=models.Count('studentprofile')
        ).filter(
            registered_count__lt=models.F('max_students')
        ).order_by('name')
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.real_name = self.cleaned_data['real_name']
        user.email = self.cleaned_data['email']
        user.user_type = 'student'
        
        if commit:
            user.save()
            # 创建学生详细信息
            selected_student_class = self.cleaned_data['student_class']
            selected_teaching_class = self.cleaned_data['teaching_class']
            student_profile = StudentProfile.objects.create(
                user=user,
                gender=self.cleaned_data['gender'],
                student_id=self.cleaned_data['student_id'],
                grade=self.cleaned_data['grade'],
                student_class=selected_student_class,
                teaching_class=selected_teaching_class
            )
            
            # 检查教学班是否已满，如果满了则更新状态
            selected_teaching_class.update_status_if_full()
        
        return user

class LoginForm(forms.Form):
    """登录表单"""
    username = forms.CharField(
        max_length=150,
        label='用户名',
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': '请输入用户名'
        })
    )
    
    password = forms.CharField(
        label='密码',
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': '请输入密码'
        })
    )
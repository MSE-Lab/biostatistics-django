from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('', views.home, name='home'),
    path('courses/', views.courses, name='courses'),
    path('textbook/', views.textbook, name='textbook'),
    path('resources/', views.resources, name='resources'),
    path('about/', views.about, name='about'),
    path('register/', views.student_register, name='register'),
    path('login/', views.user_login, name='login'),
    path('logout/', views.user_logout, name='logout'),
    path('profile/', views.profile, name='profile'),
    
    # 讨论区相关URL
    path('forum/', views.forum_index, name='forum_index'),
    path('forum/category/<int:category_id>/', views.forum_category, name='forum_category'),
    path('forum/post/<int:post_id>/', views.forum_post_detail, name='forum_post_detail'),
    path('forum/new/', views.forum_new_post, name='forum_new_post'),
    path('forum/reply/<int:post_id>/', views.forum_reply, name='forum_reply'),
    
    # 教学班管理相关URL
    path('class-management/', views.class_management, name='class_management'),
    path('class/create/', views.create_class, name='create_class'),
    path('class/<int:class_id>/update-status/', views.update_class_status, name='update_class_status'),
    
    # 作业系统相关URL
    path('assignments/', views.assignment_index, name='assignment_index'),
    path('assignments/create/', views.assignment_create, name='assignment_create'),
    path('assignments/<int:assignment_id>/edit/', views.assignment_edit, name='assignment_edit'),
    path('assignments/<int:assignment_id>/take/', views.assignment_take, name='assignment_take'),
    path('assignments/<int:assignment_id>/result/', views.assignment_result, name='assignment_result'),
    path('assignments/<int:assignment_id>/grade/', views.assignment_grade, name='assignment_grade'),
    path('assignments/<int:assignment_id>/grade/<int:submission_id>/', views.assignment_grade_detail, name='assignment_grade_detail'),
    path('assignments/<int:assignment_id>/archive/', views.assignment_archive, name='assignment_archive'),
    
    # 作业导出相关URL
    path('assignments/<int:assignment_id>/export/', views.assignment_export_page, name='assignment_export_page'),
    path('assignments/<int:assignment_id>/export/excel/', views.assignment_export_excel, name='assignment_export_excel'),
    path('assignments/<int:assignment_id>/export/json/', views.assignment_export_json, name='assignment_export_json'),
    path('assignments/<int:assignment_id>/export/status/', views.assignment_export_status, name='assignment_export_status'),
]
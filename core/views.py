from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.utils import timezone
from django.db import models
from datetime import datetime
from .models import User, TeacherProfile, StudentProfile, Class, TeachingClass, VideoResource, ForumCategory, ForumPost, ForumReply, ForumLike, PostReadStatus, Assignment, Question, StudentSubmission, QuestionScore
from .forms import StudentRegistrationForm, LoginForm

def home(request):
    """首页视图"""
    # 获取课程数据的简化版本用于首页预览
    courses_preview = get_courses_data()[:6]  # 只显示前6个章节作为预览
    
    context = {
        'title': '生物统计学课程平台',
        'subtitle': '探索数据科学的奥秘，掌握统计分析的精髓',
        'course_code': 'YN3010180007',
        'courses_preview': courses_preview
    }
    return render(request, 'core/home.html', context)

def courses(request):
    """课程页面视图"""
    # 获取完整的课程数据
    courses_data = get_courses_data()
    
    context = {
        'title': '课程内容',
        'courses': courses_data
    }
    return render(request, 'core/courses.html', context)

def textbook(request):
    """教材页面视图"""
    context = {
        'title': '教材信息',
        'textbook': {
            'title': '《生物统计学原理》',
            'chief_editor': '职晓阳',
            'editors': ['桑舒平', '张旭东', '林国亮', '杨玲玲'],
            'publisher': '华中科技大学出版社',
            'isbn': '978-7-5772-1146-6',
            'publication_date': '2024年10月',
            'pages': '392页',
            'price': '¥78.00',
            'dangdang_url': 'https://product.dangdang.com/11869157214.html',
            'taobao_url': 'https://detail.tmall.com/item.htm?abbucket=17&id=855070435612&mi_id=0000c33CaxJAnD4dBwl1vq8J4SGsNJIAZ_hQdUymxy3YJnQ&ns=1&skuId=5660584917645&spm=a21n57.1.hoverItem.2&utparam=%7B%22aplus_abtest%22%3A%22f52cb0c2f03fb4b7bce99d22d77c75cb%22%7D&xxc=taobaoSearch',
            'cover_image': 'images/textbook-cover.jpg',
            'description': '“生物统计学”对于生物学专业的读者来说，常被归为不友好的一类课程。然而，现实是生物统计学在生物、生态、农林、医药、卫生等领域都有广泛的应用，尤其在各领域内的科学研究工作中有重要的支撑作用。因此，高校生物与医药等相关专业的生物统计学教学与教材建设理应得到重视和加强。\n本书写作的动力源自作者近年来在教学和科研工作中对统计学的学习感悟。针对包括生物学在内的非数学专业读者学习统计学的痛点，本书在内容上强调统计分析方法背后的数学原理。作者尽可能地提供了数学公式完整的推导过程，并附上必要的文字解释，填补文字和数学表达上的逻辑缺口，力求降低阅读和理解的难度。同时，结合应用的需要，本书介绍的每一个统计分析方法，都通过例题呈现了R软件的操作过程，旨在让读者了解统计分析方法流程的同时掌握方法背后的基本逻辑。...',

            'chapters': [
                '第1章 绪论',
                '第2章 描述性统计',
                '第3章 概率与概率分布',
                '第4章 抽样试验与抽样分布',
                '第5章 参数估计',
                '第6章 假设检验的理论基础',
                '第7章 单样本的假设检验',
                '第8章 双样本的假设检验',
                '第9章 方差分析',
                '第10章 回归分析',
                '第11章 相关分析',
                '第12章 协方差分析',
                '第13章 非参数检验',
                '第14章 抽样调查与试验设计',
                '第15章 R语言基础'
            ]
        }
    }
    return render(request, 'core/textbook.html', context)

def about(request):
    """关于我们页面视图 - 动态显示教师信息"""
    teachers = TeacherProfile.objects.select_related('user').all()
    
    context = {
        'teachers': teachers,
        'page_title': '关于我们',
        'department_info': {
            'name': '云南大学生命科学学院',
            'description': '云南大学生命科学学院拥有一支高水平的生物统计学教学团队，致力于培养具有扎实统计学基础和生物学背景的复合型人才。'
        }
    }
    
    return render(request, 'core/about.html', context)

def student_register(request):
    """学生注册视图"""
    if request.method == 'POST':
        form = StudentRegistrationForm(request.POST)
        if form.is_valid():
            try:
                user = form.save()
                selected_teaching_class = form.cleaned_data['teaching_class']
                selected_student_class = form.cleaned_data['student_class']
                messages.success(request, f'注册成功！您已加入专业班级 "{selected_student_class.name}" 和教学班 "{selected_teaching_class.name}"，请登录。')
                return redirect('core:login')
            except Exception as e:
                messages.error(request, f'注册失败：{str(e)}')
    else:
        form = StudentRegistrationForm()
    
    # 获取可用的教学班数量信息
    available_classes = TeachingClass.objects.filter(
        teaching_status='open'
    ).annotate(
        registered_count=models.Count('studentprofile')
    ).filter(
        registered_count__lt=models.F('max_students')
    )
    
    context = {
        'form': form,
        'available_classes_count': available_classes.count(),
        'title': '学生注册'
    }
    
    return render(request, 'core/register.html', context)

def user_login(request):
    """用户登录视图"""
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = authenticate(request, username=username, password=password)
            
            if user is not None:
                login(request, user)
                messages.success(request, f'欢迎回来，{user.real_name}！')
                
                # 根据用户类型重定向
                if user.user_type == 'admin':
                    return redirect('/admin/')
                elif user.user_type == 'teacher':
                    return redirect('core:courses')
                else:  # student
                    return redirect('core:courses')
            else:
                messages.error(request, '用户名或密码错误。')
    else:
        form = LoginForm()
    
    return render(request, 'core/login.html', {'form': form})

def user_logout(request):
    """用户登出视图"""
    logout(request)
    messages.success(request, '您已成功登出。')
    return redirect('core:home')

def resources(request):
    """资源页面视图"""
    # 获取所有视频资源，按分类和创建时间排序
    featured_videos = VideoResource.objects.filter(is_featured=True).order_by('-created_at')
    all_videos = VideoResource.objects.all().order_by('-created_at')
    
    # 按分类分组
    categories = VideoResource.CATEGORY_CHOICES
    videos_by_category = {}
    for category_code, category_name in categories:
        videos_by_category[category_name] = VideoResource.objects.filter(
            category=category_code
        ).order_by('-created_at')
    
    context = {
        'title': '学习资源',
        'featured_videos': featured_videos,
        'all_videos': all_videos,
        'videos_by_category': videos_by_category,
        'categories': categories
    }
    return render(request, 'core/resources.html', context)

@login_required
def profile(request):
    """用户个人资料视图"""
    return render(request, 'core/profile.html')

def get_courses_data():
    """获取课程数据的公共函数"""
    return [
        {
            'id': 1,
            'title': '绪论',
            'description': '生物统计学的基本概念、发展历史与重要术语',
            'content': '本章全面介绍生物统计学的基本概念和发展历程，从17世纪的古典记录统计学到现代推断统计学的演进，以及生物统计学在科学研究中的重要作用。重点讲解统计学的基本术语和概念，为后续学习奠定坚实基础。',
            'topics': [
                '生物统计学的定义与研究对象',
                '统计学发展简史：从古典到现代',
                '生物统计学在科学研究中的作用',
                '统计学的基本术语和概念',
                '总体与样本的关系',
                '参数与统计量的区别',
                '变量的类型与测量尺度',
                '统计推断的基本思想'
            ],
            'key_concepts': [
                {
                    'term': '总体 (Population)',
                    'definition': '研究对象的全体，是我们想要了解其特征的完整集合。'
                },
                {
                    'term': '样本 (Sample)',
                    'definition': '从总体中抽取的部分个体，用于推断总体特征。'
                },
                {
                    'term': '参数 (Parameter)',
                    'definition': '描述总体特征的数值，通常用希腊字母表示，如μ、σ。'
                },
                {
                    'term': '统计量 (Statistic)',
                    'definition': '描述样本特征的数值，通常用拉丁字母表示，如x̄、s。'
                },
                {
                    'term': '变量 (Variable)',
                    'definition': '研究中观测或测量的特征，可以取不同的值。'
                }
            ],
            'historical_figures': [
                'John Graunt (1620-1674) - 统计学先驱，死亡表的创始人',
                'Adolphe Quetelet (1796-1874) - 社会统计学奠基人',
                'Francis Galton (1822-1911) - 回归和相关概念的提出者',
                'Karl Pearson (1857-1936) - 现代统计学奠基人之一',
                'Ronald Fisher (1890-1962) - 现代统计推断理论的创立者'
            ],
            'materials': [
                {
                    'name': '第一章课件 - 绪论',
                    'type': 'pdf',
                    'url': '/static/chp1.slides.pdf',
                    'description': '生物统计学基本概念、发展历史和重要术语'
                }
            ]
        },
        {
            'id': 2,
            'title': '描述性统计',
            'description': '数据的收集、整理、分析和可视化方法',
            'content': '本章系统介绍描述性统计的基本方法，包括数据的收集与整理、集中趋势和离散程度的测量、数据分布的描述以及统计图表的制作。通过学习这些方法，能够有效地总结和展示数据的基本特征。',
            'topics': [
                '数据的收集方法与来源',
                '数据的分类与整理',
                '频数分布表的编制',
                '集中趋势的测量：均数、中位数、众数',
                '离散程度的测量：极差、方差、标准差',
                '分布形状的描述：偏度和峰度',
                '统计图表的制作与选择',
                '数据的标准化与标准分数'
            ],
            'key_concepts': [
                {
                    'term': '描述性统计 (Descriptive Statistics)',
                    'definition': '用于描述和总结数据基本特征的统计方法。'
                },
                {
                    'term': '集中趋势 (Central Tendency)',
                    'definition': '数据向某个中心值聚集的趋势，常用均数、中位数、众数表示。'
                },
                {
                    'term': '离散程度 (Variability)',
                    'definition': '数据分散程度的度量，反映数据的变异性。'
                },
                {
                    'term': '标准差 (Standard Deviation)',
                    'definition': '衡量数据离散程度的重要指标，是方差的平方根。'
                },
                {
                    'term': '频数分布 (Frequency Distribution)',
                    'definition': '将数据按一定规则分组，显示各组频数的分布情况。'
                }
            ],
            'historical_figures': [
                'Carl Friedrich Gauss (1777-1855) - 正态分布理论的发展者',
                'Adolphe Quetelet (1796-1874) - "平均人"概念的提出者',
                'Francis Galton (1822-1911) - 统计图表方法的先驱'
            ],
            'materials': [
                {
                    'name': '第二章课件 - 描述性统计',
                    'type': 'pdf',
                    'url': '/static/chp2.slides.pdf',
                    'description': '数据收集整理、集中趋势、离散程度测量方法'
                }
            ]
        },
        {
            'id': 3,
            'title': '概率与概率分布',
            'description': '概率基础、随机变量及其概率分布、常见概率分布、大数定律与中心极限定理',
            'content': '本章从概率的基本概念出发，系统介绍随机变量及其概率分布理论。重点讲解二项分布、泊松分布、正态分布等常见概率分布的性质和应用，以及大数定律和中心极限定理这两个统计学的重要理论基础。',
            'topics': [
                '概率的基本概念与性质',
                '条件概率与独立性',
                '随机变量的定义与分类',
                '离散型随机变量及其分布',
                '连续型随机变量及其分布',
                '二项分布与泊松分布',
                '正态分布的性质与应用',
                '大数定律与中心极限定理'
            ],
            'key_concepts': [
                {
                    'term': '概率 (Probability)',
                    'definition': '随机事件发生可能性大小的数值度量，取值范围为[0,1]。'
                },
                {
                    'term': '随机变量 (Random Variable)',
                    'definition': '将随机试验的结果映射为实数的函数。'
                },
                {
                    'term': '概率分布 (Probability Distribution)',
                    'definition': '描述随机变量取各个值的概率规律。'
                },
                {
                    'term': '正态分布 (Normal Distribution)',
                    'definition': '最重要的连续概率分布，具有钟形曲线特征。'
                },
                {
                    'term': '中心极限定理 (Central Limit Theorem)',
                    'definition': '样本均数的分布趋向于正态分布的重要定理。'
                }
            ],
            'historical_figures': [
                'Blaise Pascal (1623-1662) - 概率论的奠基人之一',
                'Pierre-Simon Laplace (1749-1827) - 概率论的系统化者',
                'Carl Friedrich Gauss (1777-1855) - 正态分布的发现者',
                'Siméon Denis Poisson (1781-1840) - 泊松分布的提出者'
            ],
            'materials': [
                {
                    'name': '第三章课件 - 概率与概率分布',
                    'type': 'pdf',
                    'url': '/static/chp3.slides.pdf',
                    'description': '概率基础理论、常见概率分布、大数定律与中心极限定理'
                }
            ]
        },
        {
            'id': 4,
            'title': '抽样试验与抽样分布',
            'description': '抽样试验的基本原理、单一总体和两个总体样本统计量的分布、抽样分布的分类',
            'content': '本章介绍抽样试验的基本原理和抽样分布理论，重点讲解样本均数、样本方差等统计量的分布规律，以及t分布、F分布、卡方分布等重要的抽样分布，为后续的参数估计和假设检验奠定理论基础。',
            'topics': [
                '抽样试验的基本概念',
                '简单随机抽样的性质',
                '样本均数的分布',
                '样本方差的分布',
                't分布的性质与应用',
                'F分布的性质与应用',
                '卡方分布的性质与应用',
                '两个总体的抽样分布'
            ],
            'key_concepts': [
                {
                    'term': '抽样分布 (Sampling Distribution)',
                    'definition': '统计量的概率分布，是统计推断的理论基础。'
                },
                {
                    'term': 't分布 (t Distribution)',
                    'definition': 'Gosset提出的连续概率分布，用于小样本推断。'
                },
                {
                    'term': 'F分布 (F Distribution)',
                    'definition': 'Fisher提出的连续概率分布，用于方差比较。'
                },
                {
                    'term': '卡方分布 (Chi-square Distribution)',
                    'definition': '用于方差检验和拟合优度检验的概率分布。'
                },
                {
                    'term': '自由度 (Degrees of Freedom)',
                    'definition': '统计量分布中的重要参数，影响分布的形状。'
                }
            ],
            'historical_figures': [
                'William S. Gosset (1876-1937) - t分布的发现者（笔名Student）',
                'Ronald Fisher (1890-1962) - F分布的创立者',
                'Karl Pearson (1857-1936) - 卡方分布的提出者'
            ],
            'materials': [
                {
                    'name': '第四章课件 - 抽样试验与抽样分布',
                    'type': 'pdf',
                    'url': '/static/chp4.slides.pdf',
                    'description': '抽样分布理论、t分布、F分布、卡方分布'
                }
            ]
        },
        {
            'id': 5,
            'title': '参数估计',
            'description': '点估计和区间估计的理论与方法，估计量的优良性评价',
            'content': '本章系统介绍参数估计的基本理论和方法，包括点估计的方法（矩估计法、最大似然估计法）、估计量的优良性标准，以及区间估计的原理和各种参数的置信区间构造方法。',
            'topics': [
                '参数估计的基本概念',
                '点估计的方法：矩估计法',
                '点估计的方法：最大似然估计法',
                '估计量的优良性：无偏性、有效性、一致性',
                '区间估计的基本原理',
                '总体均数的置信区间',
                '总体方差的置信区间',
                '总体比率的置信区间'
            ],
            'key_concepts': [
                {
                    'term': '参数估计 (Parameter Estimation)',
                    'definition': '利用样本信息对总体参数进行估计的统计方法。'
                },
                {
                    'term': '点估计 (Point Estimation)',
                    'definition': '用一个统计量的观测值作为总体参数的估计值。'
                },
                {
                    'term': '区间估计 (Interval Estimation)',
                    'definition': '用一个区间来估计总体参数的可能取值范围。'
                },
                {
                    'term': '置信区间 (Confidence Interval)',
                    'definition': '以一定概率包含总体参数真值的区间。'
                },
                {
                    'term': '最大似然估计 (Maximum Likelihood Estimation)',
                    'definition': '使样本出现概率最大的参数估计方法。'
                }
            ],
            'historical_figures': [
                'Ronald Fisher (1890-1962) - 最大似然估计法的创立者',
                'Jerzy Neyman (1894-1981) - 置信区间理论的发展者',
                'Karl Pearson (1857-1936) - 矩估计法的提出者'
            ],
            'materials': [
                {
                    'name': '第五章课件 - 参数估计',
                    'type': 'pdf',
                    'url': '/static/chp5.slides.pdf',
                    'description': '点估计、区间估计理论与方法'
                }
            ]
        },
        {
            'id': 6,
            'title': '假设检验的理论基础',
            'description': '假设检验的基本原理、两类错误、检验功效以及与区间估计的关系',
            'content': '本章介绍假设检验的基本理论框架，包括原假设和备择假设的建立、检验统计量的选择、显著性水平的确定、两类错误的概念以及检验功效的计算，同时阐述假设检验与区间估计的内在联系。',
            'topics': [
                '假设检验的基本概念与步骤',
                '原假设与备择假设的建立',
                '检验统计量与拒绝域',
                '显著性水平与临界值',
                '第一类错误与第二类错误',
                '检验功效与样本量',
                '单侧检验与双侧检验',
                '假设检验与区间估计的关系'
            ],
            'key_concepts': [
                {
                    'term': '假设检验 (Hypothesis Testing)',
                    'definition': '利用样本信息判断总体参数假设是否成立的统计方法。'
                },
                {
                    'term': '原假设 (Null Hypothesis)',
                    'definition': '待检验的假设，通常表示无差异或无效应，记为H₀。'
                },
                {
                    'term': '备择假设 (Alternative Hypothesis)',
                    'definition': '与原假设对立的假设，记为H₁或Hₐ。'
                },
                {
                    'term': '第一类错误 (Type I Error)',
                    'definition': '原假设为真时错误地拒绝原假设，其概率为α。'
                },
                {
                    'term': '第二类错误 (Type II Error)',
                    'definition': '原假设为假时错误地接受原假设，其概率为β。'
                },
                {
                    'term': '检验功效 (Power of Test)',
                    'definition': '正确拒绝错误原假设的概率，等于1-β。'
                }
            ],
            'historical_figures': [
                'Ronald Fisher (1890-1962) - 显著性检验理论的创立者',
                'Jerzy Neyman (1894-1981) - 假设检验理论的发展者',
                'Egon Pearson (1895-1980) - Neyman-Pearson理论的共同创立者'
            ],
            'materials': [
                {
                    'name': '第六章课件 - 假设检验的理论基础',
                    'type': 'pdf',
                    'url': '/static/chp6.slides.pdf',
                    'description': '假设检验基本原理、两类错误、检验功效'
                }
            ]
        },
        {
            'id': 7,
            'title': '单样本的假设检验',
            'description': '单样本平均数、比率和方差的假设检验方法及其应用',
            'content': '本章具体介绍单样本假设检验的各种方法，包括总体方差已知和未知情况下的均数检验、总体比率的检验以及总体方差的检验。通过大量实例演示各种检验方法的应用条件和计算过程。',
            'topics': [
                '单样本均数的z检验（σ已知）',
                '单样本均数的t检验（σ未知）',
                '单样本比率的z检验',
                '单样本方差的卡方检验',
                '检验方法的选择原则',
                '样本量的确定',
                '检验结果的解释',
                '实际应用中的注意事项'
            ],
            'key_concepts': [
                {
                    'term': 'z检验 (z Test)',
                    'definition': '基于标准正态分布的假设检验方法，适用于大样本或已知总体方差的情况。'
                },
                {
                    'term': 't检验 (t Test)',
                    'definition': '基于t分布的假设检验方法，适用于小样本且总体方差未知的情况。'
                },
                {
                    'term': '卡方检验 (Chi-square Test)',
                    'definition': '基于卡方分布的假设检验方法，常用于方差检验。'
                },
                {
                    'term': 'p值 (p-value)',
                    'definition': '在原假设为真的条件下，观察到当前样本结果或更极端结果的概率。'
                },
                {
                    'term': '临界值 (Critical Value)',
                    'definition': '划分接受域和拒绝域的分界点。'
                }
            ],
            'historical_figures': [
                'William S. Gosset (1876-1937) - t检验的创立者',
                'Ronald Fisher (1890-1962) - 显著性检验的推广者',
                'Karl Pearson (1857-1936) - 卡方检验的提出者'
            ],
            'materials': [
                {
                    'name': '第七章课件 - 单样本的假设检验',
                    'type': 'pdf',
                    'url': '/static/chp7.slides.pdf',
                    'description': '单样本z检验、t检验、卡方检验方法与应用'
                }
            ]
        },
        {
            'id': 8,
            'title': '双样本的假设检验',
            'description': '样本方差之比的检验、样本平均数之差的检验、样本比率之差的检验',
            'content': '本章介绍双样本假设检验的方法，包括F检验用于比较两个样本方差、t检验和z检验用于比较两个样本平均数，以及成组比较和配对比较的区别。重点讲解抽样分布在双样本检验中的应用。',
            'topics': [
                '样本方差之比的F检验',
                '总体方差已知时样本平均数之差的z检验',
                '总体方差未知时样本平均数之差的t检验',
                '成组比较与配对比较的设计',
                '样本比率之差的检验',
                '抽样分布的应用总结',
                'F检验与t检验的关系',
                '检验方法的选择原则'
            ],
            'key_concepts': [
                {
                    'term': 'F检验 (F Test)',
                    'definition': '基于F分布的假设检验方法，常用于比较两个样本方差是否相等。'
                },
                {
                    'term': '成组比较 (Independent Samples)',
                    'definition': '两个独立样本之间的比较，样本来自不同的个体或试验单位。'
                },
                {
                    'term': '配对比较 (Paired Samples)',
                    'definition': '成对样本之间的比较，通常是同一个体在不同条件下的测量结果。'
                },
                {
                    'term': '方差同质性 (Homogeneity of Variance)',
                    'definition': '两个或多个总体具有相同方差的假设，是许多统计检验的前提条件。'
                },
                {
                    'term': '合并方差 (Pooled Variance)',
                    'definition': '当两个总体方差相等时，用两个样本方差的加权平均数估计共同的总体方差。'
                }
            ],
            'historical_figures': [
                'Ronald Fisher (1890-1962) - F分布和F检验的创立者',
                'William S. Gosset (1876-1937) - t检验理论的发展者',
                'Frank Wilcoxon (1892-1965) - 非参数检验方法的先驱'
            ],
            'materials': [
                {
                    'name': '第八章课件 - 双样本的假设检验',
                    'type': 'pdf',
                    'url': '/static/chp8.slides.pdf',
                    'description': '双样本F检验、t检验、z检验的理论与应用'
                }
            ]
        },
        {
            'id': 9,
            'title': '方差分析',
            'description': '方差分析的基本原理、单因素和双因素方差分析、多重比较方法',
            'content': '本章系统介绍方差分析的基本原理和方法，包括平方和分解、F检验、多重比较等。通过学习单因素和双因素方差分析，掌握处理多个样本平均数比较的统计方法，避免多次t检验带来的问题。',
            'topics': [
                '方差分析的基本原理和数学模型',
                '平方和与自由度的分解',
                '固定效应模型与随机效应模型',
                'F检验的原理和应用',
                '单因素方差分析',
                '双因素方差分析',
                '多重比较方法：LSD法、LSR法',
                '方差分析的基本条件和假定检验'
            ],
            'key_concepts': [
                {
                    'term': '方差分析 (Analysis of Variance, ANOVA)',
                    'definition': 'Fisher提出的用于比较多个样本平均数的统计方法，通过分析变异来源判断处理效应。'
                },
                {
                    'term': '处理效应 (Treatment Effect)',
                    'definition': '试验因素带来的效应，反映不同处理水平对观测值的影响。'
                },
                {
                    'term': '组间平方和 (Between Groups Sum of Squares)',
                    'definition': '由处理因素引起的变异，反映不同组间的差异。'
                },
                {
                    'term': '组内平方和 (Within Groups Sum of Squares)',
                    'definition': '由随机误差引起的变异，反映组内个体间的差异。'
                },
                {
                    'term': '多重比较 (Multiple Comparisons)',
                    'definition': '在方差分析显著的基础上，进一步比较各处理间的差异。'
                },
                {
                    'term': 'LSD法 (Least Significant Difference)',
                    'definition': '最小显著差数法，用于多重比较的一种方法。'
                }
            ],
            'historical_figures': [
                'Ronald Fisher (1890-1962) - 方差分析的创立者',
                'Frank Yates (1902-1994) - 试验设计理论的发展者',
                'Jerzy Neyman (1894-1981) - 统计推断理论的贡献者'
            ],
            'materials': [
                {
                    'name': '第九章课件 - 方差分析',
                    'type': 'pdf',
                    'url': '/static/chp9.slides.pdf',
                    'description': '方差分析基本原理、单因素和双因素ANOVA、多重比较'
                }
            ]
        },
        {
            'id': 10,
            'title': '回归分析',
            'description': '线性回归分析的理论与方法、回归方程的建立与检验、非线性回归',
            'content': '本章从Galton的"回归"故事开始，系统介绍回归分析的基本概念和方法。重点讲解线性回归的数学模型、最小二乘法、回归方程的显著性检验、区间估计以及回归分析与方差分析的关系。',
            'topics': [
                '"回归"概念的历史由来',
                '回归与相关的基本概念',
                '线性回归的数学模型与基本假定',
                '最小二乘法和回归方程',
                '回归系数的t检验和回归方程的F检验',
                '回归的区间估计和预测',
                '决定系数和回归方程的评价',
                '非线性回归分析',
                '回归分析与方差分析的关系'
            ],
            'key_concepts': [
                {
                    'term': '回归分析 (Regression Analysis)',
                    'definition': '研究一个变量与一个或多个其他变量之间关系的统计方法。'
                },
                {
                    'term': '最小二乘法 (Method of Least Squares)',
                    'definition': '通过最小化残差平方和来估计回归参数的方法。'
                },
                {
                    'term': '决定系数 (Coefficient of Determination)',
                    'definition': '用R²表示，衡量回归方程对观测数据的拟合程度。'
                },
                {
                    'term': '回归系数 (Regression Coefficient)',
                    'definition': '回归方程中自变量的系数，表示自变量变化一个单位时因变量的平均变化量。'
                },
                {
                    'term': '残差 (Residual)',
                    'definition': '观测值与回归预测值之间的差异。'
                },
                {
                    'term': '置信带 (Confidence Band)',
                    'definition': '回归直线的置信区间，反映回归估计的不确定性。'
                }
            ],
            'historical_figures': [
                'Francis Galton (1822-1911) - "回归"概念的提出者',
                'George Udny Yule (1871-1951) - 回归理论的发展者',
                'Carl Friedrich Gauss (1777-1855) - 最小二乘法的创立者',
                'Adrien-Marie Legendre (1752-1833) - 最小二乘法的独立发现者'
            ],
            'materials': [
                {
                    'name': '第十章课件 - 回归分析',
                    'type': 'pdf',
                    'url': '/static/chp10.slides.pdf',
                    'description': '线性回归理论、最小二乘法、回归检验与评价'
                }
            ]
        },
        {
            'id': 11,
            'title': '相关分析',
            'description': '线性相关分析、Pearson相关系数、秩相关分析、相关与回归的关系',
            'content': '本章介绍相关分析的基本理论和方法，包括Pearson相关系数的计算和检验、Spearman秩相关和Kendall秩相关等非参数相关方法，以及相关分析的注意事项和与回归分析的关系。',
            'topics': [
                '相关性和相关系数的历史由来',
                'Pearson相关系数的计算和性质',
                '相关系数的显著性检验',
                '相关系数的区间估计',
                'Spearman秩相关系数',
                'Kendall秩相关系数',
                '相关分析的注意事项',
                '回归系数与相关系数的关系'
            ],
            'key_concepts': [
                {
                    'term': '相关分析 (Correlation Analysis)',
                    'definition': '研究两个或多个变量之间线性关系强度和方向的统计方法。'
                },
                {
                    'term': 'Pearson相关系数 (Pearson Correlation Coefficient)',
                    'definition': '衡量两个连续变量之间线性关系强度的参数，取值范围为-1到1。'
                },
                {
                    'term': '协方差 (Covariance)',
                    'definition': '衡量两个随机变量联合变化程度的统计量。'
                },
                {
                    'term': 'Spearman秩相关系数 (Spearman Rank Correlation)',
                    'definition': '基于数据秩次的非参数相关系数，适用于非正态分布数据。'
                },
                {
                    'term': 'Kendall秩相关系数 (Kendall Rank Correlation)',
                    'definition': '基于数据协同性的非参数相关系数，对离群值不敏感。'
                },
                {
                    'term': '协同关系 (Concordance)',
                    'definition': '两个观测值点在变化方向上的一致性。'
                }
            ],
            'historical_figures': [
                'Francis Galton (1822-1911) - 相关概念的提出者',
                'Karl Pearson (1857-1936) - Pearson相关系数的创立者',
                'Charles Spearman (1863-1945) - Spearman秩相关的提出者',
                'Maurice Kendall (1907-1983) - Kendall秩相关的创立者'
            ],
            'materials': [
                {
                    'name': '第十一章课件 - 相关分析',
                    'type': 'pdf',
                    'url': '/static/chp11.slides.pdf',
                    'description': 'Pearson相关、秩相关分析理论与应用'
                }
            ]
        },
        {
            'id': 13,
            'title': '非参数检验',
            'description': '卡方检验、符号检验、秩和检验等非参数统计方法',
            'content': '本章介绍不依赖于总体分布假设的非参数检验方法，包括Pearson卡方检验用于适合性和独立性检验、符号检验和Wilcoxon秩和检验等。这些方法适用于非正态分布或分布未知的数据。',
            'topics': [
                '非参数检验的基本概念',
                'Pearson卡方检验的理论基础',
                '适合性检验：理论分布的拟合',
                '独立性检验：列联表分析',
                'Fisher精确检验',
                '单样本和成对数据的符号检验',
                'Wilcoxon符号秩检验',
                '成组数据的秩和检验',
                '多组数据的秩和检验'
            ],
            'key_concepts': [
                {
                    'term': '非参数检验 (Non-parametric Test)',
                    'definition': '不依赖于总体分布具体形式的假设检验方法。'
                },
                {
                    'term': '卡方检验 (Chi-square Test)',
                    'definition': 'Pearson提出的基于卡方分布的检验方法，用于适合性和独立性检验。'
                },
                {
                    'term': '列联表 (Contingency Table)',
                    'definition': '按两个或多个分类变量交叉分类的频数表。'
                },
                {
                    'term': '符号检验 (Sign Test)',
                    'definition': '基于正负号的非参数检验方法，用于检验中位数。'
                },
                {
                    'term': '秩和检验 (Rank Sum Test)',
                    'definition': 'Wilcoxon提出的基于秩统计量的非参数检验方法。'
                },
                {
                    'term': 'Fisher精确检验 (Fisher Exact Test)',
                    'definition': '当样本量较小时用于2×2列联表的精确检验方法。'
                }
            ],
            'historical_figures': [
                'Karl Pearson (1857-1936) - 卡方检验的创立者',
                'Ronald Fisher (1890-1962) - Fisher精确检验的提出者',
                'Frank Wilcoxon (1892-1965) - Wilcoxon检验的创立者',
                'Henry Mann (1905-2000) - Mann-Whitney检验的共同创立者'
            ],
            'materials': [
                {
                    'name': '第十三章课件 - 非参数检验',
                    'type': 'pdf',
                    'url': '/static/chp13.slides.pdf',
                    'description': '卡方检验、符号检验、秩和检验理论与应用'
                }
            ]
        },
        {
            'id': 14,
            'title': '抽样调查与试验设计',
            'description': '抽样调查方法、试验设计的基本原理、常用试验设计方法',
            'content': '本章介绍数据获取的两种主要方式：抽样调查和试验设计。重点讲解各种抽样方法、试验设计的基本原则（重复、随机、局部控制）以及常用的试验设计方法，为科学研究提供方法论指导。',
            'topics': [
                '抽样调查概述：普查与抽样调查',
                '随机抽样：简单随机、分层随机、整群抽样',
                '非随机抽样：顺序抽样、典型抽样',
                '试验设计的基本要素和原则',
                '完全随机设计',
                '成组设计与配对设计',
                '随机区组设计',
                '拉丁方设计',
                '裂区设计',
                '正交设计'
            ],
            'key_concepts': [
                {
                    'term': '抽样调查 (Sampling Survey)',
                    'definition': '从总体中抽取部分个体构成样本，用样本信息推断总体特征的方法。'
                },
                {
                    'term': '试验设计 (Experimental Design)',
                    'definition': '为获得可靠试验结果而制定的试验方案和实施计划。'
                },
                {
                    'term': '重复 (Replication)',
                    'definition': '试验设计的基本原则之一，指同一处理的多次独立试验。'
                },
                {
                    'term': '随机化 (Randomization)',
                    'definition': '试验设计的基本原则，通过随机分配消除系统误差。'
                },
                {
                    'term': '局部控制 (Local Control)',
                    'definition': '通过区组化等方法控制非试验因素的影响。'
                },
                {
                    'term': '正交设计 (Orthogonal Design)',
                    'definition': '利用正交表安排多因素试验的设计方法。'
                }
            ],
            'historical_figures': [
                'Ronald Fisher (1890-1962) - 现代试验设计理论的奠基人',
                'Frank Yates (1902-1994) - 试验设计方法的发展者',
                'Genichi Taguchi (1924-2012) - 正交设计的推广者'
            ],
            'materials': [
                {
                    'name': '第十四章课件 - 抽样调查与试验设计',
                    'type': 'pdf',
                    'url': '/static/chp14.slides.pdf',
                    'description': '抽样方法、试验设计原理与常用设计方法'
                }
            ]
        }
    ]


# ==================== 讨论区视图函数 ====================

def get_user_related_posts(user):
    """获取与用户相关的帖子"""
    related_posts = []
    
    if user.user_type == 'student':
        # 学生：获取教师回复了自己帖子的帖子
        student_posts = ForumPost.objects.filter(author=user).prefetch_related('replies')
        for post in student_posts:
            # 检查是否有教师回复
            teacher_replies = post.replies.filter(author__user_type='teacher')
            if teacher_replies.exists():
                # 获取最新的教师回复
                latest_teacher_reply = teacher_replies.order_by('-created_at').first()
                post.latest_teacher_reply = latest_teacher_reply
                related_posts.append(post)
    
    elif user.user_type == 'teacher':
        # 教师：获取学生发给自己的私信帖子（未回复的优先）
        teaching_classes = TeachingClass.objects.filter(created_by=user)
        private_posts = ForumPost.objects.filter(
            visibility='teacher_only',
            teaching_class__in=teaching_classes
        ).select_related('author', 'category', 'teaching_class').order_by('-created_at')
        
        # 分为已回复和未回复
        unreplied_posts = []
        replied_posts = []
        
        for post in private_posts:
            if post.can_view(user):
                teacher_replies = post.replies.filter(author=user)
                if teacher_replies.exists():
                    post.latest_reply = teacher_replies.order_by('-created_at').first()
                    replied_posts.append(post)
                else:
                    unreplied_posts.append(post)
        
        # 未回复的排在前面
        related_posts = unreplied_posts[:5] + replied_posts[:5]
    
    return related_posts[:10]

@login_required
def forum_index(request):
    """讨论区首页 - 仅限注册用户"""
    categories = ForumCategory.objects.filter(is_active=True)
    
    # 检查是否有筛选参数
    filter_type = request.GET.get('filter')
    
    if filter_type == 'private_messages' and request.user.user_type == 'teacher':
        # 教师查看私信帖子
        teaching_classes = TeachingClass.objects.filter(created_by=request.user)
        all_posts = ForumPost.objects.filter(
            visibility='teacher_only',
            teaching_class__in=teaching_classes
        ).select_related('author', 'category', 'last_reply_by', 'teaching_class').order_by('-created_at')
        
        # 筛选出用户可见的帖子
        recent_posts = [post for post in all_posts if post.can_view(request.user)][:20]
        
        context = {
            'title': '学生私信 - 讨论区',
            'categories': categories,
            'recent_posts': recent_posts,
            'filter_type': 'private_messages',
            'show_private_filter': True,
        }
    else:
        # 获取用户可见的最近帖子
        all_recent_posts = ForumPost.objects.select_related('author', 'category', 'last_reply_by', 'teaching_class')[:50]
        recent_posts = [post for post in all_recent_posts if post.can_view(request.user)][:10]
        
        # 获取与当前用户相关的帖子
        related_posts = get_user_related_posts(request.user)
        
        context = {
            'title': '互助讨论区',
            'categories': categories,
            'recent_posts': recent_posts,
            'related_posts': related_posts,
        }
    
    return render(request, 'core/forum/index.html', context)


@login_required
def forum_category(request, category_id):
    """分类页面 - 仅限注册用户"""
    category = get_object_or_404(ForumCategory, id=category_id, is_active=True)
    
    # 获取用户可见的帖子
    all_posts = ForumPost.objects.filter(category=category).select_related('author', 'last_reply_by', 'teaching_class')
    posts = [post for post in all_posts if post.can_view(request.user)]
    
    context = {
        'title': f'{category.name} - 讨论区',
        'category': category,
        'posts': posts,
    }
    return render(request, 'core/forum/category.html', context)


@login_required
def forum_post_detail(request, post_id):
    """帖子详情页面 - 仅限注册用户"""
    post = get_object_or_404(ForumPost, id=post_id)
    
    # 检查用户是否有权限查看此帖子
    if not post.can_view(request.user):
        messages.error(request, '您没有权限查看此帖子')
        return redirect('core:forum_index')
    
    post.increment_view_count()
    
    # 如果是学生查看自己的帖子，标记为已读
    if request.user.user_type == 'student' and post.author == request.user:
        try:
            read_status, created = PostReadStatus.objects.get_or_create(
                user=request.user,
                post=post
            )
            read_status.mark_as_read()
        except Exception:
            # 如果数据库表不存在，暂时跳过
            pass
    
    replies = ForumReply.objects.filter(post=post).select_related('author')
    
    # 检查用户是否可以回复
    can_reply = post.can_reply(request.user)
    
    context = {
        'title': post.title,
        'post': post,
        'replies': replies,
        'can_reply': can_reply,
    }
    return render(request, 'core/forum/post_detail.html', context)


@login_required
def forum_new_post(request):
    """发布新帖"""
    if request.method == 'POST':
        title = request.POST.get('title')
        content = request.POST.get('content')
        post_type = request.POST.get('post_type', 'discussion')
        category_id = request.POST.get('category')
        visibility = request.POST.get('visibility', 'public')
        
        if title and content and category_id:
            category = get_object_or_404(ForumCategory, id=category_id)
            
            # 获取用户的教学班信息（如果是学生）
            teaching_class = None
            if request.user.user_type == 'student':
                try:
                    teaching_class = request.user.studentprofile.teaching_class
                except:
                    if visibility in ['class_only', 'teacher_only']:
                        messages.error(request, '您尚未加入教学班，无法发布班级内可见或私信教师的帖子')
                        return redirect('core:forum_new_post')
            
            post = ForumPost.objects.create(
                title=title,
                content=content,
                post_type=post_type,
                category=category,
                author=request.user,
                visibility=visibility,
                teaching_class=teaching_class
            )
            
            # 根据可见性显示不同的成功消息
            visibility_msg = {
                'public': '帖子发布成功！所有用户都可以看到。',
                'class_only': '帖子发布成功！仅您的教学班同学和任课教师可以看到。',
                'teacher_only': '私信发送成功！仅您的任课教师可以看到。'
            }
            messages.success(request, visibility_msg.get(visibility, '帖子发布成功！'))
            return redirect('core:forum_post_detail', post_id=post.id)
        else:
            messages.error(request, '请填写完整信息')
    
    categories = ForumCategory.objects.filter(is_active=True)
    
    # 检查用户是否是学生，以确定是否显示可见性选项
    is_student = request.user.user_type == 'student'
    has_teaching_class = False
    if is_student:
        try:
            has_teaching_class = hasattr(request.user, 'studentprofile') and request.user.studentprofile.teaching_class
        except:
            pass
    
    context = {
        'title': '发布新帖',
        'categories': categories,
        'is_student': is_student,
        'has_teaching_class': has_teaching_class,
        'visibility_choices': ForumPost.VISIBILITY_CHOICES,
    }
    return render(request, 'core/forum/new_post.html', context)


@login_required
@require_POST
def forum_reply(request, post_id):
    """回复帖子"""
    post = get_object_or_404(ForumPost, id=post_id)
    
    # 检查用户是否有权限回复此帖子
    if not post.can_reply(request.user):
        messages.error(request, '您没有权限回复此帖子')
        return redirect('core:forum_post_detail', post_id=post_id)
    
    content = request.POST.get('content')
    
    if content:
        reply = ForumReply.objects.create(
            post=post,
            content=content,
            author=request.user
        )
        
        # 更新帖子的回复统计
        post.reply_count += 1
        post.last_reply_at = reply.created_at
        post.last_reply_by = request.user
        post.save(update_fields=['reply_count', 'last_reply_at', 'last_reply_by'])
        
        messages.success(request, '回复成功！')
    else:
        messages.error(request, '回复内容不能为空')
    
    return redirect('core:forum_post_detail', post_id=post_id)


# ==================== 教学班管理视图函数 ====================

@login_required
def class_management(request):
    """教学班管理页面 - 仅限教师访问"""
    if request.user.user_type != 'teacher':
        messages.error(request, '只有教师可以访问教学班管理页面')
        return redirect('core:home')
    
    # 获取该教师创建的所有教学班，按创建时间倒序
    classes = TeachingClass.objects.filter(created_by=request.user).order_by('-created_at')
    
    # 检查并更新过期的教学班状态
    for cls in classes:
        cls.check_auto_finish()
    
    context = {
        'title': '教学班管理',
        'classes': classes,
    }
    return render(request, 'core/class_management.html', context)


@login_required
@require_POST
def create_class(request):
    """创建新教学班"""
    if request.user.user_type != 'teacher':
        return JsonResponse({'success': False, 'message': '只有教师可以创建教学班'})
    
    try:
        # 获取表单数据
        name = request.POST.get('name', '').strip()
        description = request.POST.get('description', '').strip()
        class_time = request.POST.get('class_time', '').strip()
        class_location = request.POST.get('class_location', '').strip()
        start_date = request.POST.get('start_date')
        end_date = request.POST.get('end_date')
        max_students = request.POST.get('max_students')
        
        # 验证必填字段
        if not all([name, class_time, class_location, start_date, end_date, max_students]):
            return JsonResponse({'success': False, 'message': '请填写所有必填字段'})
        
        # 验证教学班编号是否已存在
        if TeachingClass.objects.filter(name=name).exists():
            return JsonResponse({'success': False, 'message': '该教学班编号已存在'})
        
        # 转换日期格式
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return JsonResponse({'success': False, 'message': '日期格式不正确'})
        
        # 验证日期逻辑
        if start_date >= end_date:
            return JsonResponse({'success': False, 'message': '结课日期必须晚于开课日期'})
        
        # 验证学生人数
        try:
            max_students = int(max_students)
            if max_students <= 0:
                return JsonResponse({'success': False, 'message': '选课人数必须大于0'})
        except ValueError:
            return JsonResponse({'success': False, 'message': '选课人数必须是有效数字'})
        
        # 创建教学班
        new_class = TeachingClass.objects.create(
            name=name,
            description=description,
            class_time=class_time,
            class_location=class_location,
            start_date=start_date,
            end_date=end_date,
            max_students=max_students,
            created_by=request.user
        )
        
        return JsonResponse({
            'success': True, 
            'message': f'教学班 "{name}" 创建成功！',
            'class_id': new_class.id
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'message': f'创建失败：{str(e)}'})


@login_required
@require_POST
def update_class_status(request, class_id):
    """更新教学班状态"""
    if request.user.user_type != 'teacher':
        return JsonResponse({'success': False, 'message': '只有教师可以更新教学班状态'})
    
    try:
        cls = get_object_or_404(TeachingClass, id=class_id, created_by=request.user)
        new_status = request.POST.get('status')
        
        if new_status not in ['open', 'in_progress', 'finished']:
            return JsonResponse({'success': False, 'message': '无效的状态值'})
        
        old_status = cls.get_teaching_status_display()
        cls.teaching_status = new_status
        cls.save()
        
        return JsonResponse({
            'success': True,
            'message': f'教学班状态已从 "{old_status}" 更新为 "{cls.get_teaching_status_display()}"'
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'message': f'更新失败：{str(e)}'})


def get_available_classes_for_registration():
    """获取可供学生注册的教学班列表"""
    return Class.objects.filter(
        teaching_status='open'
    ).exclude(
        studentprofile__isnull=False
    ).annotate(
        registered_count=models.Count('studentprofile')
    ).filter(
        registered_count__lt=models.F('max_students')
    ).order_by('name')


# ==================== 作业系统视图函数 ====================

@login_required
def assignment_index(request):
    """作业首页 - 根据用户类型显示不同内容"""
    if request.user.user_type == 'teacher':
        return assignment_teacher_index(request)
    elif request.user.user_type == 'student':
        return assignment_student_index(request)
    else:
        messages.error(request, '只有教师和学生可以访问作业系统')
        return redirect('core:home')


def assignment_teacher_index(request):
    """教师作业管理首页"""
    # 获取该教师创建的所有作业
    assignments = Assignment.objects.filter(created_by=request.user).exclude(status='archived').order_by('-created_at')
    
    # 统计信息
    total_assignments = assignments.count()
    published_assignments = assignments.filter(status='published').count()
    pending_grading = 0
    
    for assignment in assignments.filter(status='published'):
        pending_grading += assignment.submission_count - assignment.graded_count
    
    context = {
        'title': '作业管理',
        'assignments': assignments,
        'stats': {
            'total_assignments': total_assignments,
            'published_assignments': published_assignments,
            'pending_grading': pending_grading,
        }
    }
    return render(request, 'core/assignments/teacher_index.html', context)


def assignment_student_index(request):
    """学生作业列表页面"""
    try:
        student_profile = request.user.studentprofile
        teaching_class = student_profile.teaching_class
    except:
        messages.error(request, '您尚未加入教学班，无法查看作业')
        return redirect('core:home')
    
    # 获取该教学班的所有已发布作业
    all_assignments = Assignment.objects.filter(
        teaching_class=teaching_class,
        status='published'
    ).order_by('-publish_time')
    
    # 分类作业
    pending_assignments = []      # 未开始的作业
    draft_assignments = []        # 有草稿但未提交的作业
    completed_assignments = []    # 已正式提交的作业
    overdue_assignments = []      # 已逾期的作业
    
    for assignment in all_assignments:
        submission = assignment.get_student_submission(request.user)
        
        if submission and submission.is_submitted:
            # 已正式提交的作业
            completed_assignments.append({
                'assignment': assignment,
                'submission': submission
            })
        elif submission and not submission.is_submitted:
            # 有草稿但未提交的作业
            draft_assignments.append({
                'assignment': assignment,
                'submission': submission
            })
        elif assignment.is_due and not assignment.allow_late_submission:
            # 已逾期且不允许迟交的作业
            overdue_assignments.append(assignment)
        else:
            # 未开始的作业
            pending_assignments.append(assignment)
    
    context = {
        'title': '我的作业',
        'pending_assignments': pending_assignments,
        'draft_assignments': draft_assignments,
        'completed_assignments': completed_assignments,
        'overdue_assignments': overdue_assignments,
        'stats': {
            'total': len(all_assignments),
            'pending': len(pending_assignments),
            'draft': len(draft_assignments),
            'completed': len(completed_assignments),
            'overdue': len(overdue_assignments),
        }
    }
    return render(request, 'core/assignments/student_index.html', context)


@login_required
def assignment_create(request):
    """创建作业 - 仅限教师"""
    if request.user.user_type != 'teacher':
        messages.error(request, '只有教师可以创建作业')
        return redirect('core:assignment_index')
    
    if request.method == 'POST':
        print("=== assignment_create POST请求 ===")
        print("所有POST数据:", dict(request.POST))
        print("所有POST键:", list(request.POST.keys()))
        action = request.POST.get('action', 'create')
        print(f"Action值: '{action}'")
        
        try:
            # 获取表单数据
            title = request.POST.get('title', '').strip()
            description = request.POST.get('description', '').strip()
            teaching_class_id = request.POST.get('teaching_class')
            chapter = request.POST.get('chapter')
            publish_time = request.POST.get('publish_time')
            due_time = request.POST.get('due_time')
            total_score = request.POST.get('total_score', 100)
            allow_late_submission = request.POST.get('allow_late_submission') == 'on'
            max_attempts = request.POST.get('max_attempts', 1)
            
            # 验证必填字段
            if not all([title, description, teaching_class_id, publish_time, due_time]):
                messages.error(request, '请填写所有必填字段')
                return redirect('core:assignment_create')
            
            # 获取教学班
            teaching_class = get_object_or_404(
                TeachingClass, 
                id=teaching_class_id, 
                created_by=request.user
            )
            
            # 转换时间格式
            publish_time = datetime.strptime(publish_time, '%Y-%m-%dT%H:%M')
            due_time = datetime.strptime(due_time, '%Y-%m-%dT%H:%M')
            
            # 验证时间逻辑
            if publish_time >= due_time:
                messages.error(request, '截止时间必须晚于发布时间')
                return redirect('core:assignment_create')
            
            # 根据action决定作业状态
            if action == 'publish':
                status = 'published'
            else:
                status = 'draft'
            
            # 创建作业
            assignment = Assignment.objects.create(
                title=title,
                description=description,
                teaching_class=teaching_class,
                created_by=request.user,
                chapter=int(chapter) if chapter else None,
                publish_time=publish_time,
                due_time=due_time,
                total_score=int(total_score),
                allow_late_submission=allow_late_submission,
                max_attempts=int(max_attempts),
                status=status
            )
            
            print(f"创建作业成功，ID: {assignment.id}")
            
            # 处理题目数据
            saved_questions = 0
            for key in request.POST.keys():
                if key.startswith('question_content_') and request.POST.get(key, '').strip():
                    question_num = key.replace('question_content_', '')
                    
                    content = request.POST.get(f'question_content_{question_num}', '').strip()
                    question_type = request.POST.get(f'question_type_{question_num}')
                    score = request.POST.get(f'question_score_{question_num}', '10')
                    
                    # 处理正确答案
                    if question_type in ['single_choice', 'multiple_choice']:
                        if question_type == 'single_choice':
                            correct_answer = request.POST.get(f'correct_answer_{question_num}', '')
                        else:  # multiple_choice
                            correct_answers = request.POST.getlist(f'correct_answer_{question_num}')
                            correct_answer = ','.join(correct_answers) if correct_answers else ''
                    else:
                        correct_answer = request.POST.get(f'correct_answer_{question_num}', '').strip()
                    
                    print(f"创建 - 题目 {question_num} - 正确答案: '{correct_answer}'")
                    
                    if content and question_type:
                        # 处理选项
                        options = {}
                        if question_type in ['single_choice', 'multiple_choice']:
                            for option_key in ['A', 'B', 'C', 'D']:
                                option_value = request.POST.get(f'option_{option_key}_{question_num}', '').strip()
                                if option_value:
                                    options[option_key] = option_value
                        
                        try:
                            question = Question.objects.create(
                                assignment=assignment,
                                content=content,
                                question_type=question_type,
                                options=options if options else None,
                                correct_answer=correct_answer,
                                score=int(score) if score.isdigit() else 10,
                                order=saved_questions + 1
                            )
                            print(f"创建 - 成功创建题目: {question.id}")
                            saved_questions += 1
                        except Exception as e:
                            print(f"创建 - 保存题目失败: {e}")
            
            # 根据action和题目数量决定响应
            if action == 'publish':
                if saved_questions == 0:
                    messages.error(request, '发布作业必须包含至少一道题目')
                    return redirect('core:assignment_edit', assignment_id=assignment.id)
                else:
                    messages.success(request, f'作业 "{title}" 发布成功！共包含 {saved_questions} 道题目。')
                    return redirect('core:assignment_index')
            else:  # save_draft
                if saved_questions > 0:
                    messages.success(request, f'作业 "{title}" 创建成功！共保存 {saved_questions} 道题目。')
                else:
                    messages.success(request, f'作业 "{title}" 创建成功！现在可以添加题目。')
                return redirect('core:assignment_edit', assignment_id=assignment.id)
            
        except Exception as e:
            print(f"创建作业失败: {e}")
            messages.error(request, f'创建失败：{str(e)}')
    
    # 获取该教师的教学班
    teaching_classes = TeachingClass.objects.filter(created_by=request.user)
    
    context = {
        'title': '创建作业',
        'teaching_classes': teaching_classes,
    }
    return render(request, 'core/assignments/create.html', context)


@login_required
def assignment_edit(request, assignment_id):
    """编辑作业 - 仅限教师"""
    assignment = get_object_or_404(Assignment, id=assignment_id, created_by=request.user)
    
    if request.method == 'POST':
        print("=== assignment_edit POST请求 ===")
        print("所有POST数据:", dict(request.POST))
        print("所有POST键:", list(request.POST.keys()))
        action = request.POST.get('action')
        print(f"Action值: '{action}'")
        print(f"当前作业ID: {assignment_id}, 状态: {assignment.status}")
        
        if action == 'update_info':
            # 更新作业基本信息
            assignment.title = request.POST.get('title', assignment.title)
            assignment.description = request.POST.get('description', assignment.description)
            assignment.chapter = int(request.POST.get('chapter')) if request.POST.get('chapter') else None
            assignment.total_score = int(request.POST.get('total_score', assignment.total_score))
            assignment.allow_late_submission = request.POST.get('allow_late_submission') == 'on'
            assignment.max_attempts = int(request.POST.get('max_attempts', assignment.max_attempts))
            
            # 更新时间（只有在草稿状态下才能修改）
            if assignment.status == 'draft':
                publish_time = request.POST.get('publish_time')
                due_time = request.POST.get('due_time')
                if publish_time and due_time:
                    assignment.publish_time = datetime.strptime(publish_time, '%Y-%m-%dT%H:%M')
                    assignment.due_time = datetime.strptime(due_time, '%Y-%m-%dT%H:%M')
            
            assignment.save()
            messages.success(request, '作业信息更新成功')
            return redirect('core:assignment_edit', assignment_id=assignment.id)
            
        elif action == 'add_question':
            # 添加调试信息
            print("=== 添加题目调试 ===")
            print("POST keys:", list(request.POST.keys()))
            print("POST data:", dict(request.POST))
            
            # 处理动态生成的新题目
            new_questions_added = False
            
            for key in request.POST.keys():
                if key.startswith('question_content_') and request.POST.get(key, '').strip():
                    # 提取题目编号
                    question_num = key.replace('question_content_', '')
                    print(f"处理题目编号: {question_num}")
                    
                    # 检查是否是新题目（不是现有题目的编辑）
                    if not request.POST.get(f'question_id_{question_num}'):
                        content = request.POST.get(f'question_content_{question_num}', '').strip()
                        question_type = request.POST.get(f'question_type_{question_num}')
                        score = request.POST.get(f'question_score_{question_num}', '10')
                        correct_answer = request.POST.get(f'correct_answer_{question_num}', '').strip()
                        
                        print(f"题目内容: {content}")
                        print(f"题目类型: {question_type}")
                        print(f"分值: {score}")
                        print(f"正确答案: {correct_answer}")
                        
                        if content and question_type:
                            # 处理选择题选项
                            options = {}
                            if question_type in ['single_choice', 'multiple_choice']:
                                for option_key in ['A', 'B', 'C', 'D']:
                                    option_value = request.POST.get(f'option_{option_key}_{question_num}', '').strip()
                                    if option_value:
                                        options[option_key] = option_value
                                print(f"选项: {options}")
                            
                            try:
                                # 获取下一个排序号
                                max_order = assignment.questions.aggregate(
                                    max_order=models.Max('order')
                                )['max_order'] or 0
                                
                                question = Question.objects.create(
                                    assignment=assignment,
                                    content=content,
                                    question_type=question_type,
                                    options=options if options else None,
                                    correct_answer=correct_answer,
                                    score=int(score) if score.isdigit() else 10,
                                    order=max_order + 1
                                )
                                print(f"成功创建题目: {question.id}")
                                new_questions_added = True
                            except Exception as e:
                                print(f"创建题目失败: {e}")
            
            if new_questions_added:
                messages.success(request, '题目添加成功')
            else:
                messages.error(request, '请填写题目内容和类型')
            return redirect('core:assignment_edit', assignment_id=assignment.id)
        
        elif action == 'save_draft':
            # 保存草稿 - 先保存所有题目
            print("=== 保存草稿调试 ===")
            print("POST keys:", list(request.POST.keys()))
            
            saved_questions = 0
            
            # 处理所有题目（包括新题目和现有题目的修改）
            for key in request.POST.keys():
                if key.startswith('question_content_') and request.POST.get(key, '').strip():
                    question_num = key.replace('question_content_', '')
                    question_id = request.POST.get(f'question_id_{question_num}')
                    
                    content = request.POST.get(f'question_content_{question_num}', '').strip()
                    question_type = request.POST.get(f'question_type_{question_num}')
                    score = request.POST.get(f'question_score_{question_num}', '10')
                    # 处理正确答案
                    if question_type in ['single_choice', 'multiple_choice']:
                        # 对于选择题，从radio/checkbox获取正确答案
                        if question_type == 'single_choice':
                            correct_answer = request.POST.get(f'correct_answer_{question_num}', '')
                        else:  # multiple_choice
                            correct_answers = request.POST.getlist(f'correct_answer_{question_num}')
                            correct_answer = ','.join(correct_answers) if correct_answers else ''
                    else:
                        # 对于填空题和简答题，从textarea获取答案
                        correct_answer = request.POST.get(f'correct_answer_{question_num}', '').strip()
                    
                    print(f"题目 {question_num} - 正确答案: '{correct_answer}'")
                    
                    if content and question_type:
                        # 处理选项
                        options = {}
                        if question_type in ['single_choice', 'multiple_choice']:
                            for option_key in ['A', 'B', 'C', 'D']:
                                option_value = request.POST.get(f'option_{option_key}_{question_num}', '').strip()
                                if option_value:
                                    options[option_key] = option_value
                        
                        try:
                            if question_id:
                                # 更新现有题目
                                question = Question.objects.get(id=question_id, assignment=assignment)
                                question.content = content
                                question.question_type = question_type
                                question.options = options if options else None
                                question.correct_answer = correct_answer
                                question.score = int(score) if score.isdigit() else 10
                                question.save()
                                print(f"更新题目: {question.id}")
                            else:
                                # 创建新题目
                                max_order = assignment.questions.aggregate(
                                    max_order=models.Max('order')
                                )['max_order'] or 0
                                
                                question = Question.objects.create(
                                    assignment=assignment,
                                    content=content,
                                    question_type=question_type,
                                    options=options if options else None,
                                    correct_answer=correct_answer,
                                    score=int(score) if score.isdigit() else 10,
                                    order=max_order + 1
                                )
                                print(f"创建新题目: {question.id}")
                            saved_questions += 1
                        except Exception as e:
                            print(f"保存题目失败: {e}")
            
            assignment.status = 'draft'
            assignment.save()
            
            if saved_questions > 0:
                messages.success(request, f'草稿保存成功，共保存 {saved_questions} 道题目')
            else:
                messages.success(request, '作业草稿保存成功')
            return redirect('core:assignment_edit', assignment_id=assignment.id)
            
        elif action == 'publish':
            # 发布作业 - 先保存题目，再发布
            print("=== 发布作业调试 ===")
            print("POST keys:", list(request.POST.keys()))
            
            saved_questions = 0
            
            # 先保存所有题目（包括新题目和现有题目的修改）
            for key in request.POST.keys():
                if key.startswith('question_content_') and request.POST.get(key, '').strip():
                    question_num = key.replace('question_content_', '')
                    question_id = request.POST.get(f'question_id_{question_num}')
                    
                    content = request.POST.get(f'question_content_{question_num}', '').strip()
                    question_type = request.POST.get(f'question_type_{question_num}')
                    score = request.POST.get(f'question_score_{question_num}', '10')
                    
                    # 处理正确答案
                    if question_type in ['single_choice', 'multiple_choice']:
                        if question_type == 'single_choice':
                            correct_answer = request.POST.get(f'correct_answer_{question_num}', '')
                        else:  # multiple_choice
                            correct_answers = request.POST.getlist(f'correct_answer_{question_num}')
                            correct_answer = ','.join(correct_answers) if correct_answers else ''
                    else:
                        correct_answer = request.POST.get(f'correct_answer_{question_num}', '').strip()
                    
                    print(f"发布 - 题目 {question_num} - 正确答案: '{correct_answer}'")
                    
                    if content and question_type:
                        # 处理选项
                        options = {}
                        if question_type in ['single_choice', 'multiple_choice']:
                            for option_key in ['A', 'B', 'C', 'D']:
                                option_value = request.POST.get(f'option_{option_key}_{question_num}', '').strip()
                                if option_value:
                                    options[option_key] = option_value
                        
                        try:
                            if question_id:
                                # 更新现有题目
                                question = Question.objects.get(id=question_id, assignment=assignment)
                                question.content = content
                                question.question_type = question_type
                                question.options = options if options else None
                                question.correct_answer = correct_answer
                                question.score = int(score) if score.isdigit() else 10
                                question.save()
                                print(f"发布 - 更新题目: {question.id}")
                            else:
                                # 创建新题目
                                max_order = assignment.questions.aggregate(
                                    max_order=models.Max('order')
                                )['max_order'] or 0
                                
                                question = Question.objects.create(
                                    assignment=assignment,
                                    content=content,
                                    question_type=question_type,
                                    options=options if options else None,
                                    correct_answer=correct_answer,
                                    score=int(score) if score.isdigit() else 10,
                                    order=max_order + 1
                                )
                                print(f"发布 - 创建新题目: {question.id}")
                            saved_questions += 1
                        except Exception as e:
                            print(f"发布 - 保存题目失败: {e}")
            
            # 检查题目数量并发布
            try:
                question_count = assignment.questions.count()
                print(f"发布 - 当前题目总数: {question_count}")
                
                if question_count == 0:
                    messages.error(request, '作业必须包含至少一道题目才能发布')
                    return redirect('core:assignment_edit', assignment_id=assignment.id)
                else:
                    assignment.status = 'published'
                    assignment.save()
                    messages.success(request, f'作业发布成功！共包含 {question_count} 道题目，学生现在可以看到并完成作业。')
                    return redirect('core:assignment_index')
            except Exception as e:
                print(f"发布失败: {e}")
                messages.error(request, f'发布失败：{str(e)}')
                return redirect('core:assignment_edit', assignment_id=assignment.id)
        
        elif action == 'delete_question':
            # 删除题目
            question_id = request.POST.get('question_id')
            if question_id:
                try:
                    question = Question.objects.get(id=question_id, assignment=assignment)
                    question.delete()
                    messages.success(request, '题目删除成功')
                    return redirect('core:assignment_edit', assignment_id=assignment.id)
                except Question.DoesNotExist:
                    messages.error(request, '题目不存在')
                    return redirect('core:assignment_edit', assignment_id=assignment.id)
    
    # 获取作业的所有题目
    questions = assignment.questions.all().order_by('order')
    
    # 获取该教师的教学班（用于下拉菜单）
    teaching_classes = TeachingClass.objects.filter(created_by=request.user)
    
    context = {
        'title': f'编辑作业 - {assignment.title}',
        'assignment': assignment,
        'questions': questions,
        'teaching_classes': teaching_classes,
        'question_types': Question.TYPE_CHOICES,
        'difficulty_choices': Question.DIFFICULTY_CHOICES,
    }
    return render(request, 'core/assignments/edit.html', context)


@login_required
def assignment_take(request, assignment_id):
    """学生答题页面"""
    if request.user.user_type != 'student':
        messages.error(request, '只有学生可以完成作业')
        return redirect('core:assignment_index')
    
    assignment = get_object_or_404(Assignment, id=assignment_id)
    
    # 检查学生是否属于该教学班
    try:
        student_profile = request.user.studentprofile
        if student_profile.teaching_class != assignment.teaching_class:
            messages.error(request, '您不属于该作业的教学班')
            return redirect('core:assignment_index')
    except:
        messages.error(request, '您尚未加入教学班')
        return redirect('core:assignment_index')
    
    # 检查作业是否可以提交
    if not assignment.can_student_submit(request.user):
        messages.error(request, '该作业当前不可提交')
        return redirect('core:assignment_index')
    
    # 获取学生之前的提交（如果有）
    existing_submission = assignment.get_student_submission(request.user)
    saved_answers = {}
    if existing_submission:
        saved_answers = existing_submission.answers if existing_submission.answers else {}
    
    if request.method == 'POST':
        action = request.POST.get('action')
        
        if action == 'submit':
            # 提交作业
            answers = {}
            for question in assignment.questions.all():
                answer_key = f'answer_{question.id}'
                if question.question_type == 'multiple_choice':
                    # 多选题处理
                    selected_options = request.POST.getlist(answer_key)
                    answers[str(question.id)] = ','.join(selected_options)
                else:
                    answers[str(question.id)] = request.POST.get(answer_key, '').strip()
            
            # 更新或创建正式提交记录
            if existing_submission and not existing_submission.is_submitted:
                # 如果存在草稿，将其转为正式提交
                existing_submission.answers = answers
                existing_submission.is_submitted = True
                existing_submission.save()
                submission = existing_submission
            else:
                # 创建新的正式提交记录
                submission = StudentSubmission.objects.create(
                    assignment=assignment,
                    student=request.user,
                    answers=answers,
                    is_submitted=True
                )
            
            messages.success(request, '作业提交成功！请等待教师批改。')
            return redirect('core:assignment_result', assignment_id=assignment.id)
        
        elif action == 'save_draft':
            # 保存草稿
            answers = {}
            for question in assignment.questions.all():
                answer_key = f'answer_{question.id}'
                if question.question_type == 'multiple_choice':
                    # 多选题处理
                    selected_options = request.POST.getlist(answer_key)
                    answers[str(question.id)] = ','.join(selected_options)
                else:
                    answers[str(question.id)] = request.POST.get(answer_key, '').strip()
            
            # 更新或创建草稿提交记录
            if existing_submission:
                # 更新现有提交的答案（如果还未正式提交）
                if not existing_submission.is_submitted:
                    existing_submission.answers = answers
                    existing_submission.save()
                    messages.success(request, '草稿已保存！')
                else:
                    messages.warning(request, '作业已提交，无法保存草稿')
            else:
                # 创建新的草稿提交记录
                StudentSubmission.objects.create(
                    assignment=assignment,
                    student=request.user,
                    answers=answers,
                    is_submitted=False  # 标记为草稿状态
                )
                messages.success(request, '草稿已保存！')
            
            # 重新获取更新后的提交记录
            existing_submission = assignment.get_student_submission(request.user)
            saved_answers = existing_submission.answers if existing_submission and existing_submission.answers else {}
    
    # 获取作业题目
    questions = assignment.questions.all().order_by('order')
    
    context = {
        'title': f'完成作业 - {assignment.title}',
        'assignment': assignment,
        'questions': questions,
        'existing_submission': existing_submission,
        'saved_answers': saved_answers,
    }
    return render(request, 'core/assignments/take.html', context)


@login_required
def assignment_result(request, assignment_id):
    """查看作业结果"""
    assignment = get_object_or_404(Assignment, id=assignment_id)
    
    if request.user.user_type == 'student':
        # 学生查看自己的作业结果
        try:
            student_profile = request.user.studentprofile
            if student_profile.teaching_class != assignment.teaching_class:
                messages.error(request, '您不属于该作业的教学班')
                return redirect('core:assignment_index')
        except:
            messages.error(request, '您尚未加入教学班')
            return redirect('core:assignment_index')
        
        submission = assignment.get_student_submission(request.user)
        if not submission:
            messages.error(request, '您尚未开始该作业')
            return redirect('core:assignment_index')
        
        # 如果是草稿状态，显示草稿内容但添加提示
        if not submission.is_submitted:
            messages.info(request, '这是您保存的草稿，尚未正式提交')
        
        # 获取题目和学生答案
        questions_with_answers = []
        for question in assignment.questions.all().order_by('order'):
            student_answer = submission.get_answer(question.id)
            questions_with_answers.append({
                'question': question,
                'student_answer': student_answer,
                'question_score': None  # 学生端暂不显示单题得分
            })
        
        # 计算百分比
        percentage = None
        if submission.score is not None and assignment.total_score > 0:
            percentage = round((submission.score / assignment.total_score) * 100, 1)
        
        context = {
            'title': f'作业结果 - {assignment.title}',
            'assignment': assignment,
            'submission': submission,
            'questions_with_answers': questions_with_answers,
            'percentage': percentage,
        }
        return render(request, 'core/assignments/student_result.html', context)
    
    elif request.user.user_type == 'teacher':
        # 教师查看作业的所有提交
        if assignment.created_by != request.user:
            messages.error(request, '您只能查看自己创建的作业')
            return redirect('core:assignment_index')
        
        submissions = StudentSubmission.objects.filter(assignment=assignment, is_submitted=True).order_by('-submit_time')
        graded_count = submissions.filter(is_graded=True).count()
        total_students = assignment.teaching_class.studentprofile_set.count()
        unsubmitted_count = total_students - submissions.count()
        pending_grade_count = submissions.count() - graded_count
        
        context = {
            'title': f'作业提交情况 - {assignment.title}',
            'assignment': assignment,
            'submissions': submissions,
            'graded_count': graded_count,
            'total_students': total_students,
            'unsubmitted_count': unsubmitted_count,
            'pending_grade_count': pending_grade_count,
        }
        return render(request, 'core/assignments/teacher_result.html', context)
    
    else:
        messages.error(request, '权限不足')
        return redirect('core:assignment_index')


@login_required
def assignment_grade(request, assignment_id):
    """批改作业 - 仅限教师"""
    if request.user.user_type != 'teacher':
        messages.error(request, '只有教师可以批改作业')
        return redirect('core:assignment_index')
    
    assignment = get_object_or_404(Assignment, id=assignment_id, created_by=request.user)
    submissions = StudentSubmission.objects.filter(assignment=assignment, is_submitted=True).order_by('student__real_name')
    
    if request.method == 'POST':
        submission_id = request.POST.get('submission_id')
        submission = get_object_or_404(StudentSubmission, id=submission_id, assignment=assignment)
        
        # 更新各题得分
        total_score = 0
        for question in assignment.questions.all():
            score_key = f'question_{question.id}_score'
            comment_key = f'question_{question.id}_comment'
            
            score = float(request.POST.get(score_key, 0))
            comment = request.POST.get(comment_key, '').strip()
            
            # 更新或创建题目得分记录
            question_score, created = QuestionScore.objects.get_or_create(
                submission=submission,
                question=question,
                defaults={'score': score, 'teacher_comment': comment}
            )
            if not created:
                question_score.score = score
                question_score.teacher_comment = comment
                question_score.save()
            
            total_score += score
        
        # 更新提交记录
        submission.score = total_score
        submission.teacher_comments = request.POST.get('teacher_comments', '').strip()
        submission.is_graded = True
        submission.graded_by = request.user
        submission.graded_at = timezone.now()
        submission.save()
        
        messages.success(request, f'已完成对 {submission.student.real_name} 作业的批改')
        return redirect('core:assignment_result', assignment_id=assignment.id)
    
    context = {
        'title': f'批改作业 - {assignment.title}',
        'assignment': assignment,
        'submissions': submissions,
    }
    return render(request, 'core/assignments/grade.html', context)


@login_required
def assignment_grade_detail(request, assignment_id, submission_id):
    """批改单个学生作业的详细页面"""
    if request.user.user_type != 'teacher':
        messages.error(request, '只有教师可以批改作业')
        return redirect('core:assignment_index')
    
    assignment = get_object_or_404(Assignment, id=assignment_id, created_by=request.user)
    submission = get_object_or_404(StudentSubmission, id=submission_id, assignment=assignment)
    
    if request.method == 'POST':
        # 处理批改提交
        total_score = 0
        
        for question in assignment.questions.all():
            score_key = f'question_{question.id}_score'
            comment_key = f'question_{question.id}_comment'
            
            score = float(request.POST.get(score_key, 0))
            comment = request.POST.get(comment_key, '').strip()
            
            # 更新或创建题目得分记录
            question_score, created = QuestionScore.objects.get_or_create(
                submission=submission,
                question=question,
                defaults={'score': score, 'teacher_comment': comment}
            )
            if not created:
                question_score.score = score
                question_score.teacher_comment = comment
                question_score.save()
            
            total_score += score
        
        # 更新提交记录
        submission.score = total_score
        submission.teacher_comments = request.POST.get('teacher_comments', '').strip()
        submission.is_graded = True
        submission.graded_by = request.user
        submission.graded_at = timezone.now()
        submission.save()
        
        messages.success(request, f'已完成对 {submission.student.real_name} 作业的批改')
        return redirect('core:assignment_result', assignment_id=assignment.id)
    
    # 获取题目、学生答案和已有得分
    questions_with_data = []
    for question in assignment.questions.all().order_by('order'):
        student_answer = submission.get_answer(question.id)
        
        # 获取已有的得分记录
        try:
            question_score = QuestionScore.objects.get(submission=submission, question=question)
            current_score = question_score.score
            current_comment = question_score.teacher_comment
        except QuestionScore.DoesNotExist:
            current_score = 0
            current_comment = ''
        
        questions_with_data.append({
            'question': question,
            'student_answer': student_answer,
            'current_score': current_score,
            'current_comment': current_comment,
        })
    
    context = {
        'title': f'批改作业 - {submission.student.real_name}',
        'assignment': assignment,
        'submission': submission,
        'questions_with_data': questions_with_data,
    }
    return render(request, 'core/assignments/grade_detail.html', context)

# 导入归档功能
from .archive_view import assignment_archive
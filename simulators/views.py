from django.shortcuts import render
from django.contrib.auth.decorators import login_required

@login_required
def simulator_index(request):
    """模拟器首页"""
    return render(request, 'simulators/index.html')

@login_required
def galton_board(request):
    """高尔顿板模拟器"""
    return render(request, 'simulators/galton_board.html')

@login_required
def sampling_distribution(request):
    """抽样分布模拟器"""
    return render(request, 'simulators/sampling_distribution.html')

@login_required
def probability_distributions(request):
    """概率分布可视化器"""
    return render(request, 'simulators/probability_distributions.html')

@login_required
def z_test_one_sample(request):
    """单样本z检验模拟器"""
    return render(request, 'simulators/z_test_one_sample.html')

@login_required
def t_test_one_sample(request):
    """单样本t检验模拟器"""
    return render(request, 'simulators/t_test_one_sample.html')

@login_required
def t_test_two_sample(request):
    """双样本t检验模拟器"""
    return render(request, 'simulators/t_test_two_sample.html')

@login_required
def test_galton(request):
    """高尔顿板测试版"""
    return render(request, 'simulators/test_galton.html')

def minimal_test(request):
    """最简测试 - 不需要登录"""
    return render(request, 'simulators/minimal_test.html')
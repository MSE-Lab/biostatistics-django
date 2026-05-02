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
def chi_square_variance_test(request):
    """单样本方差卡方检验模拟器"""
    return render(request, 'simulators/chi_square_variance_test.html')

@login_required
def f_test_two_sample(request):
    """双样本F检验模拟器"""
    return render(request, 'simulators/f_test_two_sample.html')

@login_required
def proportion_test_one_sample(request):
    """单样本比例检验模拟器"""
    return render(request, 'simulators/proportion_test_one_sample.html')

@login_required
def t_distribution_calculator(request):
    """t分布计算器"""
    return render(request, 'simulators/t_distribution_calculator.html')

@login_required
def chi_square_distribution_calculator(request):
    """χ²分布计算器"""
    return render(request, 'simulators/chi_square_distribution_calculator.html')

@login_required
def f_distribution_calculator(request):
    """F分布计算器"""
    return render(request, 'simulators/f_distribution_calculator.html')

@login_required
def lady_tasting_tea(request):
    """女士品茶试验模拟器"""
    return render(request, 'simulators/lady_tasting_tea.html')

@login_required
def confidence_interval(request):
    """置信区间计算器"""
    return render(request, 'simulators/confidence_interval.html')

@login_required
def test_galton(request):
    """高尔顿板测试版"""
    return render(request, 'simulators/test_galton.html')

def minimal_test(request):
    """最简测试 - 不需要登录"""
    return render(request, 'simulators/minimal_test.html')
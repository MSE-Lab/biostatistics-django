from django.shortcuts import render

def simulator_index(request):
    """模拟器首页"""
    return render(request, 'simulators/index.html')

def galton_board(request):
    """高尔顿板模拟器"""
    return render(request, 'simulators/galton_board.html')

def sampling_distribution(request):
    """抽样分布模拟器"""
    return render(request, 'simulators/sampling_distribution.html')

def probability_distributions(request):
    """概率分布可视化器"""
    return render(request, 'simulators/probability_distributions.html')

def z_test_one_sample(request):
    """单样本z检验模拟器"""
    return render(request, 'simulators/z_test_one_sample.html')

def t_test_one_sample(request):
    """单样本t检验模拟器"""
    return render(request, 'simulators/t_test_one_sample.html')

def t_test_two_sample(request):
    """双样本t检验模拟器"""
    return render(request, 'simulators/t_test_two_sample.html')

def chi_square_variance_test(request):
    """单样本方差卡方检验模拟器"""
    return render(request, 'simulators/chi_square_variance_test.html')

def f_test_two_sample(request):
    """双样本F检验模拟器"""
    return render(request, 'simulators/f_test_two_sample.html')

def proportion_test_one_sample(request):
    """单样本比例检验模拟器"""
    return render(request, 'simulators/proportion_test_one_sample.html')

def t_distribution_calculator(request):
    """t分布计算器"""
    return render(request, 'simulators/t_distribution_calculator.html')

def chi_square_distribution_calculator(request):
    """χ²分布计算器"""
    return render(request, 'simulators/chi_square_distribution_calculator.html')

def f_distribution_calculator(request):
    """F分布计算器"""
    return render(request, 'simulators/f_distribution_calculator.html')

def lady_tasting_tea(request):
    """女士品茶试验模拟器"""
    return render(request, 'simulators/lady_tasting_tea.html')

def confidence_interval(request):
    """置信区间计算器"""
    return render(request, 'simulators/confidence_interval.html')

def test_galton(request):
    """高尔顿板测试版"""
    return render(request, 'simulators/test_galton.html')

def minimal_test(request):
    """最简测试 - 不需要登录"""
    return render(request, 'simulators/minimal_test.html')
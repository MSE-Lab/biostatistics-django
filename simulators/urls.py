from django.urls import path
from . import views

app_name = 'simulators'

urlpatterns = [
    path('', views.simulator_index, name='index'),
    path('galton-board/', views.galton_board, name='galton_board'),
    path('sampling-distribution/', views.sampling_distribution, name='sampling_distribution'),
    path('probability-distributions/', views.probability_distributions, name='probability_distributions'),
    path('z-test-one-sample/', views.z_test_one_sample, name='z_test_one_sample'),
    path('t-test-one-sample/', views.t_test_one_sample, name='t_test_one_sample'),
    path('t-test-two-sample/', views.t_test_two_sample, name='t_test_two_sample'),
    path('chi-square-variance-test/', views.chi_square_variance_test, name='chi_square_variance_test'),
    path('f-test-two-sample/', views.f_test_two_sample, name='f_test_two_sample'),
    path('proportion-test-one-sample/', views.proportion_test_one_sample, name='proportion_test_one_sample'),
    path('t-distribution-calculator/', views.t_distribution_calculator, name='t_distribution_calculator'),
    path('chi-square-distribution-calculator/', views.chi_square_distribution_calculator, name='chi_square_distribution_calculator'),
    path('f-distribution-calculator/', views.f_distribution_calculator, name='f_distribution_calculator'),
    path('lady-tasting-tea/', views.lady_tasting_tea, name='lady_tasting_tea'),
    path('confidence-interval/', views.confidence_interval, name='confidence_interval'),
    path('test-galton/', views.test_galton, name='test_galton'),
    path('minimal-test/', views.minimal_test, name='minimal_test'),
]
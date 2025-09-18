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
    path('test-galton/', views.test_galton, name='test_galton'),
    path('minimal-test/', views.minimal_test, name='minimal_test'),
]
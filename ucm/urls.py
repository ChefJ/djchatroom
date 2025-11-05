from django.urls import path
from . import views

urlpatterns = [
    path('map/', views.map_view, name='ucm-map'),
    # optional dynamic JSON endpoint (see §5):
    # path('points/', views.points, name='ucm-points'),
]
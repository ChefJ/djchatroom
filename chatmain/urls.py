from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("<str:room_name>/", views.room, name="room"),
    path("<str:room_name>/history", views.room_chat_history, name="room_history"),
    path("<str:room_name>/config", views.get_room_config, name="get_room_config"),
]
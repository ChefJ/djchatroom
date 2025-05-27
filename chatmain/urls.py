from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("<str:room_name>/", views.room, name="room"),
    path("<str:room_name>/history", views.room_chat_history, name="room_history"),
    path("<str:room_name>/config", views.get_room_config, name="get_room_config"),
    path("<str:room_name>/progress", views.get_user_progress, name="get_room_progress"),
    path("<str:room_name>/topic_update", views.topic_update, name="topic_update"),
    path("<str:room_name>/log_event", views.log_event, name="log_event"),
]
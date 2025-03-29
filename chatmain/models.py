from django.db import models

# Create your models here.


class ChatRoom(models.Model):
    is_public = models.BooleanField(default=True)
    save_message = models.BooleanField(default=True)
    room_name = models.CharField(max_length=200)
    current_pwd = models.TextField()
    created_date = models.DateTimeField(auto_now=True)


class ChatMessage(models.Model):
    chat_room = models.ForeignKey(ChatRoom,
                                  on_delete=models.DO_NOTHING,
                                  verbose_name="the related poll")
    chat_room_str = models.CharField(max_length=200)
    user_ip = models.CharField(max_length=200, default="unknown")
    msg_uuid = models.CharField(max_length=50)
    user_uuid = models.CharField(max_length=50)
    created_date = models.DateTimeField(auto_now=True)
    content = models.TextField(default="")

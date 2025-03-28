from django.db import models

# Create your models here.
class ChatRoom(models.Model):
    is_public = models.BooleanField(max_length=30)
    room_name = models.CharField(max_length=200)
    current_pwd = models.TextField()
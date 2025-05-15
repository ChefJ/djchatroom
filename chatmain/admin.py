from django.contrib import admin

# Register your models here.
from .models import *

admin.site.register(AnonymousParticipant)
admin.site.register(OneExperiment)
admin.site.register(ChatRoom)
admin.site.register(ChatMessage)

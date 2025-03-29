from django.http import HttpResponse


# chat/views.py
from django.shortcuts import render

from chatmain.consumers import get_or_create_room
from chatmain.models import ChatMessage,ChatRoom
from django.core.serializers import serialize




def handler404(request, *args, **kwargs):
    return HttpResponseRedirect('/')

def index(request):
    return render(request, "chatmain/index.html")

def room(request, room_name):
    return render(request, "chatmain/room.html", {"room_name": room_name})


def room_chat_history(request, room_name):
    room_obj = get_or_create_room(room_name)
    rst_obj = ChatMessage.objects.filter(chat_room = room_obj).values()
    json_data = serialize('json', rst_obj) # Converts QuerySet to JSON string

    return HttpResponse(json_data, content_type='application/json')

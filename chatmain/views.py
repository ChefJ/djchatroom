from django.http import HttpResponse


# chat/views.py
from django.shortcuts import render


def index(request):
    return render(request, "chatmain/index.html")

def room(request, room_name):
    return render(request, "chatmain/room.html", {"room_name": room_name})
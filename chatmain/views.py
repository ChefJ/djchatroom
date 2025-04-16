from django.http import HttpResponse, JsonResponse, HttpResponseRedirect
import json
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


def message_scoring(request):
    p_data = json.loads(request.body)
    print(p_data)
    try:
        tgt_msg = ChatMessage.objects.get(msg_uuid=p_data['msg_uuid'])
        tgt_msg.user_rated_score = p_data["score"]
        tgt_msg.save()
    except Exception as e:
        print(str(e))
        return HttpResponse("Failed to save score")
    return HttpResponse("OK")

def room_chat_history(request, room_name):
    room_obj = get_or_create_room(room_name)
    rst_obj = ChatMessage.objects.filter(chat_room=room_obj).values()
    return JsonResponse(list(rst_obj), safe=False)


def questionnaire(request):
    user_id = request.GET.get('uuid')
    print("收到的 UUID：", user_id)

    base_url = "https://docs.google.com/forms/d/e/1FAIpQLSczzhR1rVeDgkujaK7EmgBV9KVlzp9zCUTYOWrbiEEuEWtzHg/viewform"
    entry_id = "entry.559352220"
    final_url = f"{base_url}?usp=pp_url&{entry_id}={user_id}"

    return HttpResponseRedirect(final_url)

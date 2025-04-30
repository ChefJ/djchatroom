import uuid
from random import random, randrange

from django.http import HttpResponse, JsonResponse, HttpResponseRedirect
import json
# chat/views.py
from django.shortcuts import render

from chatmain.consumers import get_or_create_room
from chatmain.models import ChatMessage, ChatRoom, OneExperiment, AnonymousParticipant
from django.core.serializers import serialize
import os

from djchatroom import settings


def init_experiment(user_uuid, experiment_type=None):
    tmp_type_list = ["all","no_vis", "novis_nocolor"]
    if experiment_type is None:
        experiment_type = tmp_type_list[randrange(0, 3)]
    tmp_participant = AnonymousParticipant.objects.create(user_uuid=user_uuid)
    tmp_participant.save()
    tmp_experiment = OneExperiment.objects.create(
        participant=tmp_participant,
        experiment_progress="Init",
        experiment_type=experiment_type)
    tmp_experiment.save()
    room_pos_pos_id = str(uuid.uuid4()).replace("-","")
    room_pos_neg_id = str(uuid.uuid4()).replace("-","")
    room_neg_pos_id = str(uuid.uuid4()).replace("-","")
    room_neg_neg_id = str(uuid.uuid4()).replace("-","")

    tmp_chatroom_pos_pos = ChatRoom.objects.create(room_name=room_pos_pos_id,
                                                   bias_tendency="Positive",
                                                   user_tendency="Positive",
                                                   is_experiment=True,
                                                   related_experiment=tmp_experiment,
                                                   experiment_type=experiment_type)
    tmp_chatroom_pos_neg = ChatRoom.objects.create(room_name=room_pos_neg_id,
                                                   bias_tendency="Positive",
                                                   user_tendency="Negative",
                                                   is_experiment=True,
                                                   experiment_type=experiment_type,
                                                   related_experiment=tmp_experiment)
    tmp_chatroom_neg_pos = ChatRoom.objects.create(room_name=room_neg_pos_id,
                                                   bias_tendency="Negative",
                                                   user_tendency="Positive",
                                                   is_experiment=True,
                                                   experiment_type=experiment_type,
                                                   related_experiment=tmp_experiment)
    tmp_chatroom_neg_neg = ChatRoom.objects.create(room_name=room_neg_neg_id,
                                                   bias_tendency="Negative",
                                                   user_tendency="Negative",
                                                   is_experiment=True,
                                                   experiment_type=experiment_type,
                                                   related_experiment=tmp_experiment)

    tmp_chatroom_neg_neg.save()
    tmp_chatroom_pos_neg.save()
    tmp_chatroom_neg_pos.save()
    tmp_chatroom_pos_pos.save()

def handler404(request, *args, **kwargs):
    return HttpResponseRedirect('/')

def index(request):
    return render(request, "chatmain/index.html")


def experiment_index(request, room_name):
    return render(request, "chatmain/room.html", {"room_name": room_name})


def already_have_experiment(user_uuid):
    experiments = OneExperiment.objects.filter(participant__user_uuid=user_uuid)

    if experiments.count() > 0:
        return True
    return False


def gen_questionnaire_link(user_uuid):
    print("收到的 UUID：", user_uuid)

    base_url = "https://docs.google.com/forms/d/e/1FAIpQLSczzhR1rVeDgkujaK7EmgBV9KVlzp9zCUTYOWrbiEEuEWtzHg/viewform"
    entry_id = "entry.559352220"
    final_url = f"{base_url}?usp=pp_url&{entry_id}={user_uuid}"
    return final_url


def consent_form_view(request):
    consent_path = os.path.join(settings.BASE_DIR, "chatmain", "static","chatmain", "consent.txt")
    with open(consent_path, "r",encoding="utf8") as f:
        consent_text = f.read()
    return render(request, "chatmain/consent_page.html", {"consent_text": consent_text})

def next_experiment(request):
    p_data = json.loads(request.body)
    user_uuid = p_data['uuid']

    if not already_have_experiment(user_uuid):
        init_experiment(user_uuid)

    tgt_experiment = OneExperiment.objects.get(participant__user_uuid=user_uuid)

    if tgt_experiment.experiment_finished:
        final_url = gen_questionnaire_link(user_uuid)
        return HttpResponseRedirect("/thankyou/")

    unfinished_rooms = ChatRoom.objects.filter(related_experiment=tgt_experiment,
                                               experiment_finished=False)

    if unfinished_rooms.count() > 0:
        next_room = unfinished_rooms[0]
        return HttpResponse("/chat/"+next_room.room_name)
    else:
        final_url = gen_questionnaire_link(user_uuid)

        return HttpResponse(final_url)


def room(request, room_name):
    return render(request, "chatmain/room.html", {"room_name": room_name})


def thankyou(request):
    return HttpResponse("Thank you so much for your participation.")


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

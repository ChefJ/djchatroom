# chat/consumers.py
import datetime
import json
import threading
import uuid

from asgiref.sync import async_to_sync
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from django.utils.timezone import now

from chatmain.models import ChatMessage, ChatRoom
from utils.utils_vis import ask_gpt, text_to_score, generate_sentiment_graph


def get_or_create_room(room_name):
    tmp_chatroom = None
    if ChatRoom.objects.filter(room_name=room_name).count() < 1:
        tmp_chatroom = ChatRoom.objects.create(room_name=room_name, is_experiment=False)
        tmp_chatroom.save()
    else:
        tmp_chatroom = ChatRoom.objects.filter(room_name=room_name).first()
    return tmp_chatroom


def save_chat_message(group_name, msg_json):
    tmp_chatroom = get_or_create_room(group_name)
    tmp_obj = ChatMessage.objects.create(chat_room_str=group_name,
                                         chat_room=tmp_chatroom,
                                         user_ip=msg_json["user"],
                                         msg_uuid=msg_json["msg_uuid"],
                                         user_uuid=msg_json["user_uuid"],
                                         message=msg_json["message"],
                                         message_with_scores=msg_json["message_with_scores"] )
    tmp_obj.save()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"

        # Join room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        await self.accept()

    def get_client_ip(self):
        x_forwarded_for = self.scope["headers"]
        ip = dict(x_forwarded_for).get(b"x-forwarded-for")
        if ip:
            return ip.decode().split(",")[0].strip()
        return self.scope["client"][0]

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    def handle_gpt_response(self):
        previous_messages_obj = ChatMessage.objects.filter(chat_room_str=self.room_name)
        previous_messages_list = []
        for an_obj in previous_messages_obj:
            if an_obj.user_uuid == "GPT":
                previous_messages_list.append({"role":"system", "content": an_obj.message})
            else:
                previous_messages_list.append({"role":"user", "content": an_obj.message})
        t1 = datetime.datetime.now()
        print(str(t1)+" Sending to GPT.")
        room_obj = ChatRoom.objects.get(room_name=self.room_name)
        gpt_rsp = ask_gpt(previous_messages_list, "Please be "+room_obj.bias_tendency)
        t2 = datetime.datetime.now()
        print(str(t2) + " Rsp from GPT."+" Latency:"+str(t2-t1))

        msg_id= str(uuid.uuid4()).replace("-","")
        neg_scores, neu_scores, pos_scores, compound_scores, sentence_with_scores = text_to_score(gpt_rsp)
        # generate_sentiment_graph(
        #     neg_scores, neu_scores, pos_scores, compound_scores,
        #     str(settings.BASE_DIR) + "/chatmain/static/chatmain/",
        #     msg_id+".jpg"
        # )

        response_payload = {
            "msg_uuid": msg_id,
            "user": "GPT",
            "user_uuid":"GPT",
            "message": gpt_rsp,
            "message_with_scores": json.dumps(sentence_with_scores),
            "user_rated_score": "-1",#default:-1
            "timestamp": now().isoformat(),  # Optional
        }

        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            {"type": "chat.message", "message": response_payload}
        )
        threading.Thread(target=save_chat_message, args=(self.room_name, response_payload,)).start()

    def save_and_ask_GPT(self, message_payload):

        save_chat_message(self.room_name, message_payload)
        # if "@GPT" in message_payload["message"]:
        #     self.handle_gpt_response()
        self.handle_gpt_response()
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json["message"]
        user_ip = self.get_client_ip()

        message_payload = {
            "msg_uuid": str(uuid.uuid4()) if "msg_uuid" not in text_data_json.keys() else text_data_json["msg_uuid"],
            "user": user_ip,
            "message": message,
            "message_with_scores": "",
            "user_uuid": text_data_json["user_uuid"],
            "timestamp": now().isoformat(),  # Optional
        }

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name, {"type": "chat.message", "message": message_payload}
        )

        print(self.room_group_name)
        threading.Thread(target=self.save_and_ask_GPT, args=(message_payload,)).start()
        # threading.Thread(target=save_chat_message, args=(self.room_name, message_payload,)).start()
        #
        # threading.Thread(target=self.handle_gpt_response, args=(message,)).start()

        # Receive message from room group
    async def chat_message(self, event):
        message = event["message"]

        # Send message to WebSocket
        await self.send(text_data=json.dumps({"message": message}))

# chat/consumers.py
import json
import threading
import uuid

from asgiref.sync import async_to_sync
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from django.utils.timezone import now

from chatmain.models import ChatMessage, ChatRoom
from utils.utils_vis import ask_gpt, text_to_score, generate_sentiment_graph


def save_chat_message(group_name, msg_json):
    tmp_chatroom = None
    if ChatRoom.objects.filter(room_name=group_name).count() < 1:
        tmp_chatroom = ChatRoom.objects.create(room_name=group_name)
        tmp_chatroom.save()
    else:
        tmp_chatroom = ChatRoom.objects.filter(room_name=group_name).first()
    tmp_obj = ChatMessage.objects.create(chat_room_str=group_name,
                                         chat_room=tmp_chatroom,
                                         user_ip=msg_json["user"],
                                         msg_uuid=msg_json["msg_uuid"],
                                         content=msg_json["message"])
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

    def handle_gpt_response(self, message):
        if "@GPT" not in message:
            return
        gpt_rsp = ask_gpt(message)
        msg_id= str(uuid.uuid4()).replace("-","")
        neg_scores, neu_scores, pos_scores, compound_scores = text_to_score(gpt_rsp)
        generate_sentiment_graph(
            neg_scores, neu_scores, pos_scores, compound_scores,
            str(settings.BASE_DIR) + "/chatmain/static/chatmain/",
            msg_id+".jpg"
        )

        response_payload = {
            "msg_uuid": msg_id,
            "user": "GPT",
            "message": gpt_rsp,
            "timestamp": now().isoformat(),  # Optional
        }

        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            {"type": "chat.message", "message": response_payload}
        )


    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json["message"]
        user_ip = self.get_client_ip()

        message_payload = {
            "msg_uuid": str(uuid.uuid4()) if "msg_uuid" not in text_data_json.keys() else text_data_json["msg_uuid"],
            "user": user_ip,
            "message": message,
            "timestamp": now().isoformat(),  # Optional
        }

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name, {"type": "chat.message", "message": message_payload}
        )

        print(self.room_group_name)
        threading.Thread(target=self.handle_gpt_response, args=(message,)).start()
        threading.Thread(target=save_chat_message, args=(self.room_group_name, message,)).start()

        # Receive message from room group
    async def chat_message(self, event):
        message = event["message"]

        # Send message to WebSocket
        await self.send(text_data=json.dumps({"message": message}))

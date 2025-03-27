# chat/consumers.py
import json
import threading

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.conf import settings

from utils.utils_vis import ask_gpt, text_to_score, generate_sentiment_graph


class ChatConsumer(WebsocketConsumer):
    def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"

        # Join room group
        async_to_sync(self.channel_layer.group_add)(
            self.room_group_name, self.channel_name
        )

        self.accept()

    def disconnect(self, close_code):
        # Leave room group
        async_to_sync(self.channel_layer.group_discard)(
            self.room_group_name, self.channel_name
        )

    def handle_gpt_response(self, message):
        gpt_rsp = ask_gpt(message)
        neg_scores, neu_scores, pos_scores, compound_scores = text_to_score(gpt_rsp)
        generate_sentiment_graph(neg_scores, neu_scores, pos_scores, compound_scores, str(settings.BASE_DIR)+"/chatmain/static/chatmain/")
        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            {"type": "chat.message", "message": "GPT:" + gpt_rsp}
        )


    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json["message"]

        # Send message to room group
        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name, {"type": "chat.message", "message": message}
        )
        print(self.room_group_name)
        threading.Thread(target=self.handle_gpt_response, args=(message,)).start()

        # Receive message from room group
    def chat_message(self, event):
        message = event["message"]

        # Send message to WebSocket
        self.send(text_data=json.dumps({"message": message}))
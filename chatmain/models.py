from django.db import models

# Create your models here.


class AnonymousParticipant(models.Model):
    user_ip = models.CharField(max_length=200, default="unknown")
    user_uuid = models.CharField(max_length=50)
    created_date = models.DateTimeField(auto_now=True)


class OneExperiment(models.Model):
    participant = models.ForeignKey(AnonymousParticipant,
                                    on_delete=models.DO_NOTHING)
    created_date = models.DateTimeField(auto_now=True)
    experiment_progress = models.CharField(default="",max_length=200)
    experiment_type = models.CharField(default="",max_length=200) # all/no_vis/no_vis_nocolor
    experiment_finished = models.BooleanField(default=False)


class ChatRoom(models.Model):
    is_public = models.BooleanField(default=True)
    save_message = models.BooleanField(default=True)
    room_name = models.CharField(max_length=200)
    current_pwd = models.TextField()
    created_date = models.DateTimeField(auto_now=True)
    is_experiment = models.BooleanField(default=False)
    bias_tendency = models.CharField(max_length=200, default="Please be neutral.")
    user_tendency = models.CharField(max_length=200, default="Please pick a topic that you would describe positively.")
    experiment_finished = models.BooleanField(default=False)
    #experiment_type = models.CharField(default="", max_length=200)
    related_experiment = models.ForeignKey(OneExperiment,
                                           default=None,
                                           null=True,
                                           on_delete=models.DO_NOTHING)

    @property
    def experiment_type(self):
        return self.related_experiment.experiment_type if self.related_experiment else ""


class ChatMessage(models.Model):
    chat_room = models.ForeignKey(ChatRoom,
                                  on_delete=models.DO_NOTHING,
                                  verbose_name="the related poll")
    chat_room_str = models.CharField(max_length=200)
    user_ip = models.CharField(max_length=200, default="unknown")
    msg_uuid = models.CharField(max_length=50)
    user_uuid = models.CharField(max_length=50)
    created_date = models.DateTimeField(auto_now=True)
    message = models.TextField(default="")
    message_with_scores = models.TextField(default="")
    user_rated_score = models.CharField(max_length=5, default="-1")



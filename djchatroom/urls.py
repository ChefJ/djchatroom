"""
URL configuration for djchatroom project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from django.urls import include, path
from django.http.response import HttpResponseRedirect

from chatmain.views import index, message_scoring, next_experiment, questionnaire, thankyou, consent_form_view, \
    info_overall

urlpatterns = [
    path("/", index),
    path("", index),

    path('admin/', admin.site.urls),
    path("chat/", include("chatmain.urls")),
    path("questionnaire/", questionnaire, name="questionnaire"),
    path("message_scoring/", message_scoring, name="message_scoring"),
    path("next_experiment/", next_experiment, name="next_experiment"),
    path("join_experiment/", consent_form_view, name="next_experiment"),

    path("thankyou/", info_overall, name="next_experiment"),
    path('ucm/', include('ucm.urls')),


]
handler404 = 'chatmain.views.handler404'

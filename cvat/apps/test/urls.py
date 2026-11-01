from django.urls import path

from cvat.apps.test import views

urlpatterns = [
    path(
        "tasks/<int:task_id>/annotation-counts",
        views.AnnotationCountsView.as_view(),
        name="annotation-counts",
    ),
]

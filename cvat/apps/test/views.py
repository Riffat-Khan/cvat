from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from cvat.apps.engine.models import LabeledShape, Task


class AnnotationCountsView(APIView):
    """Return the number of annotations per class (label) for a task.

    The count is read straight from the database: every LabeledShape of every
    job of the task, grouped by its label name.
    """

    def get(self, request, task_id: int):
        # 404 if the task does not exist at all.
        get_object_or_404(Task, pk=task_id)

        rows = (
            LabeledShape.objects.filter(job__segment__task_id=task_id)
            .values("label__name")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        counts = [{"label": r["label__name"], "count": r["count"]} for r in rows]

        return Response({"task_id": task_id, "counts": counts})

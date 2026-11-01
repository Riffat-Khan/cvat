import time

from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import LabeledShape, Task
from cvat.apps.engine.permissions import TaskPermission
from cvat.apps.iam.permissions import get_iam_context

slogger = ServerLogManager(__name__)


class AnnotationCountsView(APIView):
    """Return the number of annotations per class (label) for a task.

    The count is read straight from the database: every LabeledShape of every
    job of the task, grouped by its label name.

    Access control reuses CVAT's own rules rather than reinventing them:
    IsAuthenticated refuses an anonymous request, and CVAT's OPA-backed
    TaskPermission 'view' scope refuses a user who cannot see this task.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, task_id: int):
        # 404 if the task does not exist at all.
        task = get_object_or_404(Task, pk=task_id)

        # Refuse a user who has no access to this task, using CVAT's existing
        # task-view authorization (the same check the task endpoints run via OPA).
        iam_context = get_iam_context(request, task)
        if not TaskPermission.create_scope_view(request, task, iam_context).check_access().allow:
            raise PermissionDenied("You do not have permission to view this task.")

        # MO-1 measurement hook (see docs/Objectives.md): time only the count
        # computation, with auth and the network outside the marks.
        started = time.perf_counter()

        rows = (
            LabeledShape.objects.filter(job__segment__task_id=task_id)
            .values("label__name")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        counts = [{"label": r["label__name"], "count": r["count"]} for r in rows]
        total = sum(c["count"] for c in counts)

        elapsed_ms = (time.perf_counter() - started) * 1000
        slogger.glob.info(
            f"annotation-counts task_id={task_id} "
            f"classes={len(counts)} total={total} elapsed_ms={elapsed_ms:.1f}"
        )

        return Response({"task_id": task_id, "counts": counts})

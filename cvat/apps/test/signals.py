from functools import partial

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from cvat.apps.engine.models import Task
from cvat.apps.test.events import publish_change


@receiver(post_save, sender=Task)
def notify_annotations_changed(instance: Task, update_fields=None, **kwargs) -> None:
    # Annotations are saved in bulk, which fires no per-shape signal. Every save does
    # end in Task.touch() (JobAnnotation._set_updated_date), so that is what we listen
    # for. Other edits, like renaming a task, save more fields and are skipped.
    if update_fields != {"updated_date"}:
        return

    # After commit, so a page that re-counts is sure to see the new shapes. Robust, so
    # a Redis failure cannot break the user's save.
    transaction.on_commit(partial(publish_change, instance.id), robust=True)

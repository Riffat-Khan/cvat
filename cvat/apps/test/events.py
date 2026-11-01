"""Tell open pages that a task's annotations changed, through Redis pub/sub.

Redis is needed because a save can run in any server or worker process, while the
socket to notify may be held by a different one.
"""

from django.conf import settings
from redis import Redis


def changes_channel(task_id: int) -> str:
    return f"cvat:annotation-counts:{task_id}"


def redis_kwargs() -> dict:
    return {
        "host": settings.REDIS_INMEM_SETTINGS["HOST"],
        "port": settings.REDIS_INMEM_SETTINGS["PORT"],
        "password": settings.REDIS_INMEM_SETTINGS["PASSWORD"],
    }


def publish_change(task_id: int) -> None:
    with Redis(**redis_kwargs()) as connection:
        connection.publish(changes_channel(task_id), "changed")

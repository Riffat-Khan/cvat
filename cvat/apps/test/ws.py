"""Minimal ASGI WebSocket endpoint that tells a page when to reload its counts.

CVAT has no WebSocket backend, but it is already served by uvicorn, so a raw ASGI
handler needs no Channels/Daphne.

Design (see the Plan's decision record): the socket carries no counts. It checks
access once when it opens, then forwards "changed" notices from Redis. The page
reacts by calling the REST endpoint, so counting and permissions stay in one place,
and an idle page costs no queries.
"""

import asyncio
import re

from asgiref.sync import sync_to_async
from redis.asyncio import Redis
from redis.exceptions import RedisError

from cvat.apps.engine.log import ServerLogManager
from cvat.apps.test.events import changes_channel, redis_kwargs

slogger = ServerLogManager(__name__)

PATH_RE = re.compile(r"^/api/tasks/(?P<task_id>\d+)/annotation-counts/ws/?$")

# Map REST status to a WebSocket close code so the client can tell cases apart.
_CLOSE_CODES = {401: 4401, 403: 4403, 404: 4404}
_CLOSE_SERVER_ERROR = 1011


def _cookie_header(scope) -> str:
    for name, value in scope.get("headers", []):
        if name == b"cookie":
            return value.decode("latin1")
    return ""


def _access_status(task_id: int, cookie: str) -> int:
    """Ask the REST endpoint, so the socket applies exactly the same login and OPA rules."""
    # Imported lazily: Django must be fully set up before this runs.
    from django.db import close_old_connections
    from django.test import Client

    try:
        # A view error must become a status code here, not kill the socket task.
        response = Client(raise_request_exception=False).get(
            f"/api/tasks/{task_id}/annotation-counts", HTTP_COOKIE=cookie
        )
    finally:
        # The test client skips Django's per-request connection cleanup.
        close_old_connections()
    return response.status_code


_access_status_async = sync_to_async(_access_status, thread_sensitive=False)


async def _forward_changes(pubsub, send) -> None:
    async for message in pubsub.listen():
        if message["type"] == "message":
            await send({"type": "websocket.send", "text": "changed"})


async def _wait_for_disconnect(receive) -> None:
    while (await receive())["type"] != "websocket.disconnect":
        pass


async def annotation_counts_ws(scope, receive, send) -> None:
    message = await receive()
    if message["type"] != "websocket.connect":
        return

    task_id = int(PATH_RE.match(scope["path"]).group("task_id"))

    # Accept before checking: a close sent before accept reaches the browser as a
    # failed handshake (code 1006), hiding the reason from the client, which would
    # then retry forever. Nothing is sent until the check has passed.
    await send({"type": "websocket.accept"})

    status = await _access_status_async(task_id, _cookie_header(scope))
    if status != 200:
        await send({"type": "websocket.close", "code": _CLOSE_CODES.get(status, 4400)})
        return

    connection = Redis(**redis_kwargs())
    pubsub = connection.pubsub()
    tasks = []
    try:
        await pubsub.subscribe(changes_channel(task_id))
        # Sent after subscribing: the page reloads on this message, so a change made
        # before it is in that reload and a change made after it gets a notice.
        await send({"type": "websocket.send", "text": "connected"})

        forward = asyncio.ensure_future(_forward_changes(pubsub, send))
        disconnect = asyncio.ensure_future(_wait_for_disconnect(receive))
        tasks = [forward, disconnect]
        await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        if forward.done():
            forward.result()
    except RedisError as ex:
        slogger.glob.error(f"annotation-counts socket lost Redis: {ex}")
        await send({"type": "websocket.close", "code": _CLOSE_SERVER_ERROR})
    finally:
        for task in tasks:
            task.cancel()
        await pubsub.aclose()
        await connection.aclose()

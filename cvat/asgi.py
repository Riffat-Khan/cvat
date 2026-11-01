# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
ASGI config for CVAT project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
from django.core.handlers.asgi import ASGIHandler

import cvat.utils.remote_debugger as debug

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cvat.settings.development")

django_application = get_asgi_application()


if debug.is_debugging_enabled():

    class DebuggerApp(ASGIHandler):
        """
        Support for VS code debugger
        """

        def __init__(self) -> None:
            super().__init__()
            self.__debugger = debug.RemoteDebugger()

        async def handle(self, *args, **kwargs):
            self.__debugger.attach_current_thread()
            return await super().handle(*args, **kwargs)

    django_application = DebuggerApp()


# Route WebSocket connections for live annotation counts to our handler and
# leave every HTTP request (and any other websocket) to Django untouched.
# Imported here, after Django is set up, to keep app loading order correct.
from cvat.apps.test.ws import PATH_RE, annotation_counts_ws  # noqa: E402


async def application(scope, receive, send):
    if scope["type"] == "websocket" and PATH_RE.match(scope.get("path", "")):
        await annotation_counts_ws(scope, receive, send)
        return
    await django_application(scope, receive, send)

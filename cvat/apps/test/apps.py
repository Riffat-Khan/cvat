from django.apps import AppConfig


class TestConfig(AppConfig):
    name = "cvat.apps.test"
    label = "cvat_test"

    def ready(self):
        from . import signals  # pylint: disable=unused-import

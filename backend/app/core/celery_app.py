from celery import Celery
from app.core.config import settings

celery = Celery(
    "olcme",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

@celery.task
def ping() -> str:
    return "pong"

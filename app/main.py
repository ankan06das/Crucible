import logging

from fastapi import FastAPI

from a2a_router.server import mount
from api.routes import router

logging.getLogger("a2a.server.events.event_queue_v2").setLevel(logging.ERROR)

app = FastAPI()
mount(app)
app.include_router(router)


@app.get("/health")
def status():
    return {"status": "ok"}

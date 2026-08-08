import logging

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from a2a_router.server import mount
from api.routes import router

logging.getLogger("a2a.server.events.event_queue_v2").setLevel(logging.ERROR)

app = FastAPI()
mount(app)
app.include_router(router)


@app.get("/health")
def status():
    return {"status": "ok"}

# Mount static files at root path
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")


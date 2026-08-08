from fastapi import FastAPI

from a2a_router.server import mount

app = FastAPI()
mount(app)


@app.get("/health")
def status():
    return {"status": "ok"}

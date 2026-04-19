from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import register_routes
app = FastAPI(title="Demographic Transition Atlas API")

app.add_middleware(
    CORSMiddleware,
    # Allow local frontend dev servers on any port.
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_routes(app)
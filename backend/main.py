from firebase_admin import initialize_app
from firebase_functions import https_fn, options
from a2wsgi import ASGIMiddleware
from app.main import app as fastapi_app

# Initialize Firebase Admin
initialize_app()

# Wrap FastAPI to WSGI
wsgi_app = ASGIMiddleware(fastapi_app)

# Deploy to Firebase Functions
@https_fn.on_request(
    memory=options.MemoryOption.GB_2,
    timeout_sec=540,
    cors=options.CorsOptions(cors_origins="*", cors_methods=["*"])
)
def api(req: https_fn.Request) -> https_fn.Response:
    # Forward the request to the WSGI app
    return https_fn.Response.from_app(wsgi_app, req.environ)

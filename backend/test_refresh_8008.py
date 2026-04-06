import requests

try:
    resp = requests.post("http://127.0.0.1:8008/api/refresh")
    print(resp.status_code)
    print(resp.json())
except Exception as e:
    print(f"Error calling API: {e}")

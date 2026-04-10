import requests

try:
    resp = requests.get("http://localhost:8012/api/filters/kpis?section_id=1")
    kpis = resp.json()
    print("Total KPIs:", len(kpis))
    print("Names:", [k["name"] for k in kpis])
except Exception as e:
    print(f"Error: {e}")

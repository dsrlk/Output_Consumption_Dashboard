import requests

try:
    resp = requests.get("http://127.0.0.1:8006/api/filters/kpis")
    kpis = resp.json()
    for kpi in kpis:
        print(f"ID: {kpi['id']} | Sec: {kpi['section_id']} | Name: {kpi['name']} | Unit: {kpi['unit']}")
except Exception as e:
    print(f"Error calling API: {e}")

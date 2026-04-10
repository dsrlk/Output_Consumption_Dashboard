import sqlite3
conn = sqlite3.connect('data.db')
tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print("Tables:", tables)
for t in tables:
    if 'section' in t[0].lower():
        rows = conn.execute(f"SELECT * FROM {t[0]}").fetchall()
        print(f"\n{t[0]}:", rows)
conn.close()

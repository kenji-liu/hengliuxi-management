import sqlite3, json, os, sys

DB = os.path.join(os.path.dirname(__file__), '..', 'hengliuxi.db')
conn = sqlite3.connect(DB)
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print("Tables:", tables)
print()

for t in tables:
    cur.execute(f"PRAGMA table_info({t})")
    cols = [c[1] for c in cur.fetchall()]
    path_cols = [c for c in cols if any(x in c.lower() for x in ['path', 'photo', 'image', 'file', 'pic', 'url'])]
    if path_cols:
        print(f"Table: {t}")
        print(f"  Path columns: {path_cols}")
        for pc in path_cols[:2]:
            cur.execute(f"SELECT {pc} FROM {t} WHERE {pc} IS NOT NULL AND {pc} != '' LIMIT 3")
            rows = cur.fetchall()
            for r in rows:
                print(f"  [{pc}] =", repr(r[0]))
        print()

conn.close()

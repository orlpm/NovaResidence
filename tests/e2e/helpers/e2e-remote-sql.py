import base64
import json
import sqlite3
import sys

raw = base64.b64decode(sys.argv[1])
payload = json.loads(raw)
conn = sqlite3.connect(r'D:\home\data\novaresidence.db', timeout=60)
try:
    cur = conn.cursor()
    cur.execute(payload['sql'], payload.get('params') or [])
    if cur.description is not None:
        row = cur.fetchone()
        if row is not None and row[0] is not None:
            value = row[0]
            if isinstance(value, unicode):
                sys.stdout.write(value.encode('utf-8'))
            else:
                sys.stdout.write(str(value))
    else:
        conn.commit()
finally:
    conn.close()

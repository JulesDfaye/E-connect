import json, sqlite3, sys
payload=json.load(sys.stdin)
try:
    with sqlite3.connect(payload['path']) as db:
        db.row_factory=sqlite3.Row
        db.execute('PRAGMA foreign_keys=ON')
        if 'schema' in payload:
            db.executescript(payload['schema']);result=[]
        else:
            result=[]
            for statement in payload['statements']:
                before=db.total_changes
                cur=db.execute(statement['sql'],statement.get('args',[]))
                values=[dict(r) for r in cur.fetchall()] if cur.description else []
                result.append({'success':True,'results':values,'meta':{'changes':db.total_changes-before}})
    print(json.dumps({'result':result}))
except Exception as error:
    print(json.dumps({'error':str(error)}))

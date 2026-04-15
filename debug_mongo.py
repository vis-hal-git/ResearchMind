import os
from pymongo import MongoClient
from langgraph.checkpoint.mongodb import MongoDBSaver
from dotenv import load_dotenv

load_dotenv()
DB_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(DB_URI)

checkpointer = MongoDBSaver(client)
db = client.get_database("checkpointing_db")

recent_writes = list(db['checkpoint_writes'].find().sort('checkpoint_id', -1).limit(3))
threads = []
for r in recent_writes:
    if r['thread_id'] not in threads:
        threads.append(r['thread_id'])

from graph import build_graph
graph = build_graph().compile(checkpointer=checkpointer)

for t in threads:
    config = {"configurable": {"thread_id": t}}
    state = graph.get_state(config)
    if state:
        val = state.values
        print(f"Thread: {t}")
        print(f"  Next: {state.next}")
        print(f"  Topic: {val.get('topic')}")
        print(f"  RevCount: {val.get('revision_count')}")
        if 'draft_report' in val:
            print(f"  Draft: (Found)")
        else:
            print(f"  Draft: None")
        print("---")


import weaviate
import os
from dotenv import load_dotenv
import chromadb
load_dotenv()

client = weaviate.connect_to_local()

def check_memories():
    collection = client.collections.get("Waifu_Memory")
    
    # Lấy toàn bộ đối tượng (mỗi lần lấy 100 cái)
    print(f"--- DANH SÁCH KÝ ỨC TRONG WAIFU_MEMORY ---")
    for item in collection.iterator():
        print(f"ID: {item.uuid}")
        print(f"Content: {item.properties.get('content')}")
        print(f"Keywords: {item.properties.get('keywords')}")
        print(f"Emotion: {item.properties.get('bot_emotion')}")
        print(f"Timestamp: {item.properties.get('timestamp')}")
        print(f"Importance: {item.properties.get('importance')}")
        print("-" * 30)

check_memories()
client.close()


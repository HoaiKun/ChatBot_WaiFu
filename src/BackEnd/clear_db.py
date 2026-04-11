import weaviate
import os
from dotenv import load_dotenv

load_dotenv()

client = weaviate.connect_to_local(
    headers={"X-OpenAI-Api-Key": os.getenv("OPENAI_API_KEY")}
)

# Xóa sổ cả cái Collection (Bảng dữ liệu)
collection_name = "Waifu_Memory"

if client.collections.exists(collection_name):
    client.collections.delete(collection_name)
    print(f"🔥 Đã xóa sạch bách bộ não '{collection_name}' rồi nha xếp!")
else:
    print("🧹 Database vốn đã sạch sẽ rồi.")

client.close()
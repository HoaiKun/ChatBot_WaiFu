
import sys
import os

# Lấy đường dẫn của thư mục chứa file hiện tại và thêm vào danh sách tìm kiếm của Python
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

import weaviate
import weaviate.classes.config as wcv
from weaviate.classes.query import Filter
import os
from dotenv import load_dotenv
from PromptFormat import Vector_DB_Format
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

db_client = weaviate.connect_to_embedded(
    headers={
        "X-OpenAI-Api-Key": api_key 
    },
    persistence_data_path="./elysia_memory" # Ký ức lưu ở đây
)

def create_vector_db(name : str):
    if(not db_client.collections.exists(name)):
        return db_client.collections.create(
            name = name,
            vectorizer_config= wcv.Configure.Vectorizer.text2vec_openai(),
            generative_config= wcv.Configure.Generative.openai(),
            
            properties=[
                wcv.Property(name="content", data_type=wcv.DataType.TEXT, vectorize_property_name=True),
                wcv.Property(name="importance", data_type=wcv.DataType.INT),
                wcv.Property(name="category", data_type=wcv.DataType.TEXT_ARRAY),
                wcv.Property(name="keywords", data_type=wcv.DataType.TEXT_ARRAY),
                wcv.Property(name="timestamp", data_type=wcv.DataType.DATE),
                wcv.Property(name="bot_emotion", data_type=wcv.DataType.TEXT_ARRAY, vectorize_property_name=True)
            ]
        )
    else:
        return db_client.collections.get(name)


Waifu_Memory = create_vector_db("Waifu_Memory")

def saveMemory(memory_target_obj: Vector_DB_Format):
    
    Waifu_Memory.data.insert(
        properties={
            "content": memory_target_obj.content,
            "importance": memory_target_obj.importance,
            "category": memory_target_obj.category,
            "keywords": memory_target_obj.keywords,
            "timestamp": memory_target_obj.timestamp,
            "bot_emotion": memory_target_obj.emotion
        }
    )

def MemoryQuery(user_query:str, limit : int = 10):
    try:
        response = Waifu_Memory.query.near_text(
            query=user_query,
            limit= limit,
            return_properties=["content", "importance", "category", "keywords"],
            filters = Filter.by_property("importance").greater_or_equal(6)
        )
        if not response.objects:
            return ""
        context = "\n---Relating memory---\n"
        for obj in response.objects:
            content = obj.properties.get("content")
            keywords = obj.properties.get("keywords")
            context += f"-{content}\n"
            context += f"-{keywords}\n"
        return context
    except Exception as e:
        return "error"
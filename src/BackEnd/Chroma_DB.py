import chromadb
from chromadb.utils import embedding_functions
import json
import os
from dotenv import load_dotenv
from datetime import datetime
from .PromptFormat import Vector_DB_Format

load_dotenv()
apikey =  os.getenv("OPENAI_API_KEY")
embeddingModel = embedding_functions.OpenAIEmbeddingFunction(
    api_key= apikey,
    model_name="text-embedding-3-small"
)
def loadDB():
    global  VectorCollection
    ChromaClient = chromadb.PersistentClient(path="./Chroma_DB_WaifuMemory")
    VectorCollection = ChromaClient.get_or_create_collection(
        name = "Waifu_Memory",
        embedding_function=embeddingModel
    )

loadDB()
async def SaveMemoryToVectorDB(ChatObj : Vector_DB_Format):
    metadata = {
        "importance": ChatObj.importance,
        "category": ",".join(ChatObj.category),
        "keywords": ",".join(ChatObj.keywords),
        "timestamp": ChatObj.timestamp.timestamp()
    }
    if ChatObj.emotion:
        metadata["emotion_vector"] = json.dumps(ChatObj.emotion)
    VectorCollection.add(
        documents=[ChatObj.content],
        metadatas=[metadata],
        ids=[f"mem_{datetime.now().timestamp()}"]
    )

        
def SearchMemoryDB(query_text:str):
    results = VectorCollection.query(
        query_texts=[query_text],
        n_results=5
    )
    memories = []
    if not results or not results['documents'] or len(results['documents'][0]) == 0:
        return "Không có ký ức liên quan"
    relevant_texts = results['documents'][0]
    context_output = "\n".join([f"-{text}" for text in relevant_texts])
    print("Here is your output")
    return context_output
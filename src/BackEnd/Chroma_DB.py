from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from langchain_community.document_loaders import (
    PyPDFLoader, 
    Docx2txtLoader, 
    TextLoader
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.retrievers import ParentDocumentRetriever
from langchain.storage import LocalFileStore
from langchain.storage._lc_store import create_kv_docstore
from dotenv import load_dotenv
from .PromptFormat import Vector_DB_Format
import os
import json
load_dotenv()

PARENT_STORE_DIR = "./parent_chunks_data"
CHROMA_MEMORY_DIR = "./Chroma_DB_WaifuMemory"
CHROMA_DOC_DIR = "./Chroma_DB_DocumentKnowledge"

for folder in [PARENT_STORE_DIR, CHROMA_MEMORY_DIR, CHROMA_DOC_DIR]:
    if not os.path.exists(folder):
        os.makedirs(folder)


fs = LocalFileStore(PARENT_STORE_DIR)
store = create_kv_docstore(fs)

api_key = os.getenv("OPENAI_API_KEY")

embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",
    openai_api_key = api_key
)

Memory_DB = Chroma(
    collection_name = "Waifu_Memory",
    embedding_function=embeddings,
    persist_directory = CHROMA_MEMORY_DIR
)

Document_Memory = Chroma(
        embedding_function=embeddings,
        collection_name= "Document_Knowledge",
        persist_directory=CHROMA_DOC_DIR
)

async def SaveMemoryToVectorDB(ChatObj: Vector_DB_Format):
    metadata = {
        "category": ",".join(ChatObj.category),
        "keywords": ",".join(ChatObj.keywords),
        "timestamps": str(ChatObj.timestamp) if ChatObj.timestamp else "",
        "emotion": json.dumps(ChatObj.emotion) if ChatObj.emotion else ""
    }  
    doc = Document(
        page_content = ChatObj.content,
        metadata=metadata
    )
    await Memory_DB.aadd_documents([doc])

async def SearchContextDB(query_text:str):
    relevent_context= Memory_DB.max_marginal_relevance_search(query=query_text, k=5, fetch_k=20)

    if not relevent_context:
        return "No related context"
    context_output = "\n".join([f"-{doc.page_content}" for doc in relevent_context])
    return context_output


    
parent_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200)
child_splitter = RecursiveCharacterTextSplitter(chunk_size = 400, chunk_overlap = 40)

DocRetriever = ParentDocumentRetriever(
    vectorstore=Document_Memory,
    docstore=store,
    child_splitter=child_splitter,
    parent_splitter=parent_splitter
)

async def AddFIleToMemory(filepath:str, extension = "pdf"):
    loader = None
    if extension == ".pdf":
        loader = PyPDFLoader(filepath)
    elif extension == ".docx":
        loader = Docx2txtLoader(filepath)
    elif extension == ".txt":
        # Với file txt, nên chỉ định encoding để tránh lỗi tiếng Việt
        loader = TextLoader(filepath, encoding="utf-8")
    else:
        raise ValueError(f"Định dạng file {extension} không được hỗ trợ.")
    
    docs =  loader.load()
    DocRetriever.add_documents(docs, ids=None)
    print("PDF Save")

async def GetPDFDetail(query:str):
    detailed_docs = DocRetriever.invoke(query)
    if(not detailed_docs):
        return "No PDF Content"
    
    Doc_content = "\n---\n".join(d.page_content for d in detailed_docs)
    return Doc_content

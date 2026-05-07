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
import pypandoc
import os
import json
from langchain_ollama import OllamaEmbeddings
load_dotenv()

PARENT_STORE_DIR = "./parent_chunks_data"
CHROMA_MEMORY_DIR = "./Chroma_DB_WaifuMemory"
CHROMA_DOC_DIR = "./Chroma_DB_DocumentKnowledge"

for folder in [PARENT_STORE_DIR, CHROMA_MEMORY_DIR, CHROMA_DOC_DIR]:
    if not os.path.exists(folder):
        os.makedirs(folder)




api_key = os.getenv("OPENAI_API_KEY")

embeddings = OllamaEmbeddings(
    model="nomic-embed-text"
)

def Get_Memory_DB(user_id:str):
    return Chroma(
    collection_name = f"Waifu_Memory_{user_id}",
    embedding_function=embeddings,
    persist_directory = CHROMA_MEMORY_DIR
)

def Get_Document_Memory(user_id:str):
    user_parent_store_dic = os.path.join(PARENT_STORE_DIR, user_id)
    if not os.path.exists(user_parent_store_dic):
        os.makedirs(user_parent_store_dic)
    fs = LocalFileStore(user_parent_store_dic)
    store = create_kv_docstore(fs)
    
    Document_Memory = Chroma(
        embedding_function=embeddings,
        collection_name = f'doc_knowledge_{user_id}',
        persist_directory=CHROMA_DOC_DIR
    )

    parent_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200)
    child_splitter = RecursiveCharacterTextSplitter(chunk_size = 400, chunk_overlap = 40)

    DocRetriever = ParentDocumentRetriever(
    vectorstore=Document_Memory,
    docstore=store,
    child_splitter=child_splitter,
    parent_splitter=parent_splitter
    )
    return DocRetriever



async def SaveMemoryToVectorDB(ChatObj: Vector_DB_Format, user_id:str, session_id):
    Memory_DB = Get_Memory_DB(user_id=user_id)
    metadata = {
        "category": ",".join(ChatObj.category),
        "keywords": ",".join(ChatObj.keywords),
        "timestamps": str(ChatObj.timestamp) if ChatObj.timestamp else "",
        "emotion": json.dumps(ChatObj.emotion) if ChatObj.emotion else "",
        "session_id":session_id
    }  
    doc = Document(
        page_content = ChatObj.content,
        metadata=metadata
    )
    await Memory_DB.aadd_documents([doc])

async def SearchContextDB(query_text:str, user_id:str):
    Memory_DB = Get_Memory_DB(user_id=user_id)
    relevent_context= Memory_DB.max_marginal_relevance_search(query=query_text, k=5, fetch_k=20)

    if not relevent_context:
        return "No related context"
    context_output = "\n".join([f"-{doc.page_content}" for doc in relevent_context])
    return context_output


    




async def AddFIleToMemory(filepath:str, extension:str, session_id:str, user_id:str):
    DocRetriever = Get_Document_Memory(user_id=user_id)
    loader = None
    if extension == ".pdf":
        loader = PyPDFLoader(filepath)
    elif extension == ".docx":
        loader = Docx2txtLoader(filepath)
    elif extension == ".doc":
        temp_path = filepath + "x" # thành .docx
        pypandoc.convert_file(filepath, 'docx', outputfile=temp_path)
        loader = Docx2txtLoader(temp_path)
    elif extension == ".txt":
        # Với file txt, nên chỉ định encoding để tránh lỗi tiếng Việt
        loader = TextLoader(filepath, encoding="utf-8")
    else:
        raise ValueError(f"Định dạng file {extension} không được hỗ trợ.")
    
    docs =  loader.load()
    print(f"save doc with session id: {session_id}")
    for minidoc in docs:
        minidoc.metadata["session_id"] = session_id
    DocRetriever.add_documents(docs, ids=None)
    print("PDF Save")

async def GetPDFDetail(query:str, session_id:str, user_id:str):
    DocRetriever = Get_Document_Memory(user_id=user_id)
    print(f"Finding information by session: {session_id}")
    filter = {"session_id" : session_id}
        
    sub_docs = DocRetriever.vectorstore.similarity_search(
        query=query,
        k=10,
        filter= filter
    )
    if not sub_docs:
        return "No content"
    
    parent_ids = list(set(
        doc.metadata[DocRetriever.id_key] 
        for doc in sub_docs 
        if DocRetriever.id_key in doc.metadata
    ))

    if not parent_ids:
        return "No linked Parent documents found."
    
    detailed_docs = DocRetriever.docstore.mget(parent_ids)

    # 4. Gom nội dung lại thành chuỗi để trả về cho AI
    # chi lấy những doc không bị None (phòng trường hợp lỗi đồng bộ giữa vectorstore và docstore)
    context_list = [doc.page_content for doc in detailed_docs if doc is not None]
    
    if not context_list:
        return "No PDF Content."

    return "\n---\n".join(context_list)


async def DeleteSessionData(session_id:str, user_id:str):
    print(f'Delete at sesison {session_id}')
    try:
        doc_retriever = Get_Document_Memory(user_id=user_id)

        sub_docs = doc_retriever.vectorstore.get(
            where={"session_id":session_id},
            include =["metadatas"]
        )

        if sub_docs and sub_docs['metadatas']:
            parents_ids = list(set([
                meta[doc_retriever.id_key]
                for meta in sub_docs['metadatas']
                if doc_retriever.id_key in meta
            ]))
        
            if parents_ids:
                doc_retriever.docstore.mdelete(parents_ids)
                print(f"Done delete {parents_ids}", flush=True)
        doc_retriever.vectorstore.delete(where={"session_id":session_id})
        print("Done deleting data",flush=True)
        return True
    except Exception as e:
        print(f"fail deleting session related data: {str(e)}")
        return False

from .Chroma_DB import GetPDFDetail
from openai import OpenAI, AsyncOpenAI
import partial_json_parser
from partial_json_parser import Allow
import inspect
from pydantic import TypeAdapter
from dotenv import load_dotenv
import os
load_dotenv()
async def GetExternalDataFromDocument(prompt: str, session:str, user_id:str) -> str:
    """
        Base on user prompt, find out what user want, decide what the proper query to search in Chromadb and use the data that get from Chromadb to answear user Question
    """
    client = OpenAI(
        base_url="http://localhost:11434/v1", # Trỏ về Ollama local
        api_key="ollama",
    )
    ClientGo = client.chat.completions.create(
        model="qwen2.5:7b",
        temperature=0.5,
        messages=[
            {
                "role":"system",
                "content": "Your mission is convert user prompt into search query for optimized for vector DB"
            },
            {
                "role": "user",
                "content" : prompt
            }
        ]
    )
    Query = ClientGo.choices[0].message.content
    ExternalData =  await GetPDFDetail(Query, session_id = session, user_id=user_id)
    return ExternalData

async def AnswearDocument(prompt: str, general_context:str, model: str, session:str, user_id:str) -> str:
    """
        Use when user require extract information from doc
        Your mission is from user prompt, decide what data should be query from document by converting prompt into general_context, and answear user question
    """
    client = AsyncOpenAI(
        base_url="https://api.groq.com/openai/v1", # Trỏ về Ollama local
        api_key=os.getenv("GROQ_API_KEY"),
    )
    general_data = await GetExternalDataFromDocument(prompt=general_context, session=session, user_id=user_id)
    print(f"General data at session {session}")
    response =  client.chat.completions.create(
        model=model,
        temperature=0.6,
        stream=True,
        messages=[
            {
                "role":"system",
                "content" : f"Your mission is base on the general data which is get from Document, answear user Query. This is the data from Document: {general_data}"
            },
            {
                "role":"user",
                "content" : prompt
            }

        ]
    ) 
    
    print(general_data)
    fulltext = ""
    async for chunk in response:
        content = chunk.choices[0].delta.content
        if content:
            yield content

AnswearFromDoc ={
    "type":"function",
    "function":{
        "name" : "AnswearFromDoc",
        "description" : inspect.getdoc(AnswearDocument),
        "parameters" : TypeAdapter(AnswearDocument).json_schema(),
        "strict" : True
    }
    
}


from .Chroma_DB import GetPDFDetail
from openai import OpenAI, AsyncOpenAI
import partial_json_parser
from partial_json_parser import Allow
import inspect
from pydantic import TypeAdapter
from dotenv import load_dotenv
import os
load_dotenv()
async def GetExternalDataFromDocument(prompt: str) -> str:
    """
        Base on user prompt, find out what user want, decide what the proper query to search in Chromadb and use the data that get from Chromadb to answear user Question
    """
    client = OpenAI(
        api_key=os.getenv("OPENAI_API_KEY")
    )
    ClientGo = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        messages=[
            {
                "role":"system",
                "content": "Your mission is to find out what user want and decide what data should query/find in the Chromadb to answear user prompt"
            },
            {
                "role": "user",
                "content" : prompt
            }
        ]
    )
    Query = ClientGo.choices[0].message.content
    ExternalData =  await GetPDFDetail(Query)
    return ExternalData

async def AnswearDocument(prompt: str, general_context:str, model: str) -> str:
    """
        Use when user require extract information from doc
        Your mission is from user prompt, decide what data should be query from document by converting prompt into general_context, and answear user question
    """
    Client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY")) 
    general_data = await GetExternalDataFromDocument(prompt=general_context)
    async with Client.beta.chat.completions.stream(
        model="gpt-4o",
        temperature=0.6,
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
    ) as response:
    
        print(general_data)
        fulltext = ""
        async for event in response:
                
                if event.type == 'content.delta':
                    chunk = event.delta
                    if not chunk: continue
                    fulltext += chunk
                    try:
                        yield chunk
                    except:
                        yield "Error"

AnswearFromDoc ={
    "type":"function",
    "function":{
        "name" : "AnswearFromDoc",
        "description" : inspect.getdoc(AnswearDocument),
        "parameters" : TypeAdapter(AnswearDocument).json_schema(),
        "strict" : True
    }
    
}


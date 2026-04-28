
import httpx
import os
import json
from dotenv import load_dotenv
from pydantic import TypeAdapter
from openai import AsyncOpenAI
import inspect
load_dotenv()
async def search_news(prompt: str,) -> str: 
    """
        This is the tools for searching news when user require additional information outside of
        memory or from the internet, recent news etc
    """
  
    url = "https://api.tavily.com/search"
    payload = {
        "api_key": os.getenv("TAVILY_API_KEY"),
        "query": prompt,
        "search_depth": "basic",
        "include_answer": False,
        "max_results" : 3
    }


    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, timeout=10.0)
            response.raise_for_status()
            data = response.json()

            results = []

            for item in data.get("results", []):
                results.append(f"Title: {item['title']} \nContent: {item['content']}")
            return "\n\n".join(results) if results else "No information"
        except Exception as e:
            return f"Found error while searching: {str(e)}"
        

async def handle_search_news(prompt:str, search_data:str, model:str) -> str:
    print(f"Search data: {search_data}")
    Client = AsyncOpenAI(
        api_key=os.getenv("OPENAI_API_KEY")
    )
    async with Client.beta.chat.completions.stream(
        model= model,
        temperature=0.6,
        messages=[
            {
                "role" :"system",
                "content" : "Your mission is from user query, and additional data searched from internet, answear user prompt"
            },
            {
                "role":'user',
                "content": f"Searched content: {search_data}"
            },
            {
                "role":"user",
                "content":prompt
            }
        ]
    ) as response:
        async for event in response:
            if event.type =="content.delta":   
                chunk = event.delta   
                yield chunk         

search_news_tools = {
    "type" : "function",
    "function" : {
        "name" :"search_news",
        "description": inspect.getdoc(search_news),
        "parameters": {
            "type":"object",
            "properties":{
                "prompt":{
                    "type":"string",
                    "description": "Information that need to search using api to answer user question"
                }
            },
            "required":["prompt"],
            "additionalProperties": False
        },

        "strict" : True
    }
}

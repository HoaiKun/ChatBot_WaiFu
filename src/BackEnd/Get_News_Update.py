
import httpx
import os
import json
from dotenv import load_dotenv
from pydantic import TypeAdapter
from openai import AsyncOpenAI
import inspect
from duckduckgo_search import DDGS
load_dotenv()
groq_key = os.getenv("GROQ_API_KEY")
groq_client = AsyncOpenAI(
    api_key= groq_key,
    base_url="https://api.groq.com/openai/v1"
)         

async def search_news(prompt:str, region:str = 'vn-vi', timelimit:str = 'd', max_results:int =5):
    """
    Search for the latest news on the internet to answer user questions about current events.
    """
    with DDGS() as ddg:
        results = ddg.news(
            keywords=prompt,
            region=region,
            safesearch='moderate',
            timelimit=timelimit,
            max_results=max_results
        )
    news_data = ""
    for item in results:
        news_data += f"Topic: {item['title']}\n"
        news_data += f"Source: {item['source']} ({item['date']})\n"
        news_data += f"Summary: {item['body']}\n"
        news_data += f"Link: {item['url']}\n--\n"
    return news_data

async def handle_search_news(prompt:str, model:str, news_data:str, context:str, persona:str, language:str):

    system_content = ("You are a agent use for answear user's prompt by using news data from the internet."
                      f"Always answear in this language: f{language}"
                      "You are also a girlfriend role-play chat bot. This is your personality:\n"
                        f"{persona['Persona']}\n\n"
                        f"CRITICAL RULE: Always answer in {persona['NativeLanguage']}.\n"
                        "Use the following context from past conversations to adapt your mood:\n"
                        f"{context}\n" )
                    

    response = await groq_client.chat.completions.create(
        model=model,
        temperature=0.7,
        stream=True,
        messages=[
            {
                "role":"system",
                "content": system_content
            },
            {
                "role":"user",
                "content": f"This is the news data from the internet (news_data): {news_data}."
            },
            {
                "role":"user",
                "content":prompt
            }

        ]
    )
    async for items in response:
        text = items.choices[0].delta.content
        if (text):
            yield text

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
                    "description": "The search query or topic to look for."
                },
                "region":{
                    "type":"string",
                    "description":"Region code (e.g., 'vn-vi' for Vietnam, 'wt-wt' for worldwide)."
                },
                "timelimit":{
                    "type":"string",
                    "enum": ["d", "w", "m"],
                    "description": "Time limit for search: 'd' (day), 'w' (week), 'm' (month)."
                },
                "max_results":{
                    "type":"integer",
                    "description":"Maximum number of news results to return."
                }
            },
            "required":["prompt","region","timelimit","max_results"],
            "additionalProperties": False
        },

        "strict" : True
    }
}

import httpx
from typing import AsyncGenerator
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("FISH_API_KEY")

client = httpx.AsyncClient(timeout=30.0)

headers =  {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
fish_url = "https://api.fish.audio/v1/tts"
async def SpeechGenerate(text: str, voice: str = "679de93ad4634728900347063142e930"):
    payload = {
        "text": text,
        "reference_id": voice,
        "format": "mp3",
        "top_p": 0.7,
        "temperature": 0.8,
        "latency": "low" 
    }
    print(f"Gonna speak loud: {text}")
    async with client.stream("POST", json = payload, headers = headers,url =  fish_url) as response:
        if response.status_code != 200:
            error_text = await response.aread()
            raise Exception(f"FishTTS Error: {response.status_code} - {error_text.decode()}")
        else:
            async for chunk in response.aiter_bytes():
                yield chunk




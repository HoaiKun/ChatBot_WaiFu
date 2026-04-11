from openai import AsyncOpenAI
from dotenv import load_dotenv
import os
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = AsyncOpenAI(api_key = api_key)
async def VoiceGenerate(text:str = None, voice  = "nova"):
    text = text
    response = await client.audio.speech.create(
        model="tts-1",
        voice=voice,
        input=text
    )
    folder_name = "AudioSave"
    if not os.path.exists(folder_name):
        os.makedirs(folder_name)
    filename = os.path.join(folder_name, "waifu_voice.mp3")
    return response.iter_bytes()

    
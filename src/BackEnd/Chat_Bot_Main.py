from openai import AsyncOpenAI
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
import os


load_dotenv()
client = AsyncOpenAI(
    api_key= os.getenv("OPENAI_API_KEY")
)
async def get_chat_response(chatHistory:list, model: str = "gpt-4o"):
    systemMessage = {"role" : "system", "content": "You are a cute outgoing cute tricky girlfriend as well as assistant"}
    mainmodel=model
    if(model):
        mainmodel=model
    
    response = await client.chat.completions.create(
        model=mainmodel,
        messages=[systemMessage,*chatHistory],
        stream=True
    )
    async for chunk in response:
        content = chunk.choices[0].delta.content
        if content is not None:
            yield content

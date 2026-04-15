from fastapi import FastAPI, APIRouter
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from .Chat_Bot_Main import get_chat_response
from typing import List, Optional, Union, Any
from pydantic import BaseModel
from .Fish_TTS import SpeechGenerate
from fastapi.staticfiles import StaticFiles;
from .Image_Generate import Generate_Img_Tool, Generate_img
from .PromptFormat import Image_Generation_Prompt_Format
import io
import base64

Api_App = FastAPI()
Api_App.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/api/v1")

Api_App.mount("/Generated_image", StaticFiles(directory="Generated_image"), name="images")


class ChatMessage(BaseModel):
    role: str
    content: Union[str, List[dict]]

class ChatPayloadFormat(BaseModel):
    message: List[ChatMessage]
    model: Optional[str] = "gpt-4o"
class SpeechRequestFormat(BaseModel):
    text: str # Đổi thành 'text' cho khớp với hook Frontend của ông giáo
    voice: str = "679de93ad4634728900347063142e930"
@router.post("/GetChatResponse")
async def post_chat_respose(payload: ChatPayloadFormat):
    chatHistory = payload.message
    target_model = payload.model
    return StreamingResponse(
        get_chat_response(chatHistory=chatHistory, model=target_model),
        media_type="text/plain"
    )
@router.post("/GetChatSpeech")
async def post_chat_speech(payload: SpeechRequestFormat):
    text = payload.text
    voice = payload.voice
    speech_generator =  SpeechGenerate(text=text,voice = voice)
    return StreamingResponse(speech_generator, media_type="audio/mpeg")


class ImagePromptFormat(BaseModel):
    prompt: str

@router.post("/GenerateIMG")
async def post_image_generate(prompt:ImagePromptFormat):
    BasicPrompt = Image_Generation_Prompt_Format(prompt=prompt.prompt)
    result = await Generate_img(BasicPrompt)
    return {"role": "assistant", "content" : f"__IMAGE__{result}"}
Api_App.include_router(router)
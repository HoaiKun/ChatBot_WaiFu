from fastapi import FastAPI, APIRouter
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from Chat_Bot_Main import get_chat_response
from OpenAI_TTS import VoiceGenerate
from typing import List, Optional
from pydantic import BaseModel
Api_App = FastAPI()

# 1. Cấu hình CORS cho React
Api_App.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/api/v1")


class ChatPayloadFormat(BaseModel):
    message: List[dict]
    model: Optional[str] = "gpt-4o"
class SpeechRequestFormat(BaseModel):
    text: str # Đổi thành 'text' cho khớp với hook Frontend của ông giáo
    voice: str = "nova"
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
    speech_generator = await VoiceGenerate(text=text,voice = voice)
    return StreamingResponse(speech_generator, media_type="audio/mpeg")
Api_App.include_router(router)
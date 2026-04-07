from fastapi import FastAPI, APIRouter
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from .Chat_Bot_Main import get_chat_response
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

@router.post("/GetChatResponse")
async def post_chat_respose(payload: ChatPayloadFormat):
    chatHistory = payload.message
    target_model = payload.model
    return StreamingResponse(
        get_chat_response(chatHistory=chatHistory, model=target_model),
        media_type="text/plain"
    )
Api_App.include_router(router)

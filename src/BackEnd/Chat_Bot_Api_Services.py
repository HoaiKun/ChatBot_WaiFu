from fastapi import FastAPI, APIRouter, UploadFile,HTTPException,File, UploadFile, Form
from fastapi import BackgroundTasks
from contextlib import asynccontextmanager
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from .Chat_Bot_Main import get_chat_response
from typing import List, Optional, Union, Any
from pydantic import BaseModel
from .Fish_TTS import SpeechGenerate
from fastapi.staticfiles import StaticFiles;
from .Image_Generate import Generate_Img_Tool, Generate_img
from .PromptFormat import Image_Generation_Prompt_Format
from .Chroma_DB import AddFIleToMemory
from .SpeechToText import SpeechToText
from .Chat_Sesson_Manage import LoadChatHistoryBySession, LoadChatHistoryGeneral, pool, UpdateChatHistoryBySession, CreateNewChatSession, DeleteSection
import io
import os
import base64
import shutil
import tempfile
import json
from pathlib import Path


@asynccontextmanager
async def lifespan(app:FastAPI):
    await pool.open()
    yield
    await pool.close()

Api_App = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000", # Dự phòng nếu ông đổi cổng
]
Api_App.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],

)



router = APIRouter(prefix="/api/v1")

Api_App.mount("/Generated_image", StaticFiles(directory="Generated_image"), name="images")


class ChatMessage(BaseModel):
    role: str
    content: Union[str, List[dict]]

class ChatPayloadFormat(BaseModel):
    session: str
    user_id:str
    metadata: Optional[dict] = {}
    message: List[ChatMessage]
    model: Optional[str] = "gpt-4o"
    PersonaID: str = "Elysia"
class SpeechRequestFormat(BaseModel):
    text: str # Đổi thành 'text' cho khớp với hook Frontend của ông giáo
    voice: str = "679de93ad4634728900347063142e930"






    
@router.post("/GetChatResponse")
async def post_chat_respose(payload: ChatPayloadFormat, background_task:BackgroundTasks):
    chatHistory = payload.message
    target_model = payload.model
    PersonaID = payload.PersonaID
    role=""
    content = ""
    if (isinstance(chatHistory[-1].content, list)):
        role = chatHistory[-1].role
        content= chatHistory[-1].content[0].get("text","")
    else:
        role = chatHistory[-1].role
        content = chatHistory[-1].content
    await UpdateChatHistoryBySession(session=payload.session, 
                               user_id=payload.user_id, 
                               role=role,
                               content=content,
                               metadata=payload.metadata)
    async def stream_and_collect():
        full_response = ""
        async for chunks in  get_chat_response(session=payload.session,chatHistory=chatHistory, model=target_model, PersonaID=PersonaID):
            full_response+=chunks
            yield chunks

        background_task.add_task(
            UpdateChatHistoryBySession,session=payload.session, 
                               user_id=payload.user_id, 
                               role='assistant',
                               content=full_response,
                               metadata=None
        )
    return StreamingResponse(
        stream_and_collect(),
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


    

@router.post("/PostDocumentContent")
async def PostDocumentContent(file: UploadFile = File(...),session_id: str = Form(...)):
    filename = file.filename
    extension = os.path.splitext(filename)[1].lower()
    tmp_path = None
    print(f'Save document by session {session_id}')
    if extension not in [".pdf", ".docx", ".txt", ".doc"]:
        raise HTTPException(status_code=400, detail="Unsupported file")
    with tempfile.NamedTemporaryFile(delete=False, suffix= extension) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
    try:
        await AddFIleToMemory(filepath=tmp_path, extension=extension, session_id=session_id)
        return {"role": "assistant", "content":"Loaded file"}
    except:
        return {"role":"assistant", "content": f"__MESSAGE__:Working on {file.filename}"}
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
        await file.close()

@router.post("/GenerateIMG")
async def post_image_generate(prompt:ImagePromptFormat):
    BasicPrompt = Image_Generation_Prompt_Format(prompt=prompt.prompt)
    result = await Generate_img(BasicPrompt)
    return {"role": "assistant", "content" : f"__IMAGE__{result}"}

@router.get("/GetSystemSetting")
async def get_system_setting():
    current_dir = Path(__file__).parent
    filepath = current_dir/'SystemSetting.json'
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
        return data


@router.post("/GetSpeechToText")
async def get_speech_to_text(file:UploadFile = File(...), language:str = Form('en')):
    data = SpeechToText(file=file, language=language)
    return StreamingResponse(data, media_type="text/plain")

@router.get("/GetChatSessionGeneral")
async def get_chat_session_general(username:str):
    print(f"Get data by Username {username}")
    data = await LoadChatHistoryGeneral(username= username)
    return data


@router.get("/GetChatSessionDetail")
async def get_chat_session_detail(session:str, user_id:str):
    return await LoadChatHistoryBySession(session=session, user_id=user_id)

class NewChatSessionPayload(BaseModel):
    user_id:str
    topic:str
@router.post("/CreateNewChatSession")
async def post_NewChatSession(payload: NewChatSessionPayload):
    return await CreateNewChatSession(user_id=payload.user_id, topic=payload.topic)

class DeleteSessionPayload(BaseModel):
    session_id :str
    user_id:str
@router.post('/DeleteChatSession')
async def PostDeleteChatSession(obj:DeleteSessionPayload ):
    return await DeleteSection(session=obj.session_id, user_id=obj.user_id)

class UpdateTopicPayload(BaseModel):
    session_id:str
    user_id:str
    topic:str

Api_App.include_router(router)


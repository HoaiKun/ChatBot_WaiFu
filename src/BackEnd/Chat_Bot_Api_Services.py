from fastapi import FastAPI, APIRouter, UploadFile,HTTPException,File, UploadFile, Form, Request, Response,status
from fastapi import BackgroundTasks, Depends, Security
from fastapi.security import OAuth2PasswordBearer
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
from .Chroma_DB import AddFIleToMemory,DeleteSessionData
from .SpeechToText import SpeechToText
from .Chat_Sesson_Manage import AddUser, GetUserByUsername, LoadChatHistoryBySession, LoadChatHistoryGeneral, pool, UpdateChatHistoryBySession, CreateNewChatSession, DeleteSection
from .HandleUser import create_access_token, create_refresh_token, SECRET_KEY, REFRESH_SECRET_KEY, ALGORITHM
import io
from passlib.context import CryptContext
import os
import base64
import shutil
import tempfile
import jwt
import json
from pathlib import Path

pwd_context = CryptContext(schemes=['bcrypt'], deprecated = 'auto')
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/PostLogin")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")

        if user_id is None:
            raise HTTPException(status_code=401, detail='Token got no ID')
        return user_id
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail='Token down')

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
    
    metadata: Optional[dict] = {}
    message: List[ChatMessage]
    model: Optional[str] = "gpt-4o"
    PersonaID: str = "Elysia"
class SpeechRequestFormat(BaseModel):
    text: str # Đổi thành 'text' cho khớp với hook Frontend của ông giáo
    voice: str = "679de93ad4634728900347063142e930"






    
@router.post("/GetChatResponse")
async def post_chat_respose(payload: ChatPayloadFormat, 
                            background_task:BackgroundTasks,
                            user_id:str = Depends(get_current_user)):
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
                               user_id=user_id, 
                               role=role,
                               content=content,
                               metadata=payload.metadata)
    async def stream_and_collect():
        full_response = ""
        async for chunks in  get_chat_response(session=payload.session,chatHistory=chatHistory, model=target_model, PersonaID=PersonaID, user_id=user_id):
            full_response+=chunks
            yield chunks

        background_task.add_task(
            UpdateChatHistoryBySession,session=payload.session, 
                               user_id=user_id, 
                               role='assistant',
                               content=full_response,
                               metadata=None
        )
    return StreamingResponse(
        stream_and_collect(),
        media_type="text/plain"
    )

@router.post("/GetChatSpeech")
async def post_chat_speech(payload: SpeechRequestFormat, user_id = Depends(get_current_user)):
    text = payload.text
    voice = payload.voice
    speech_generator =  SpeechGenerate(text=text,voice = voice)
    return StreamingResponse(speech_generator, media_type="audio/mpeg")


class ImagePromptFormat(BaseModel):
    prompt: str

@router.post("/PostDocumentContent")
async def PostDocumentContent(file: UploadFile = File(...),session_id: str = Form(...),user_id=Depends(get_current_user)):
    print(f"Save document by session: {session_id}")
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
        await AddFIleToMemory(filepath=tmp_path, extension=extension, session_id=session_id, user_id=user_id)
        return {"role": "assistant", "content":"Loaded file"}
    except:
        return {"role":"assistant", "content": f"__MESSAGE__:Working on {file.filename}"}
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
        await file.close()


@router.get("/GetSystemSetting")
async def get_system_setting():
    current_dir = Path(__file__).parent
    filepath = current_dir/'SystemSetting.json'
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
        return data


@router.post("/GetSpeechToText")
async def get_speech_to_text(file:UploadFile = File(...), language:str = Form('None'), user_id = Depends(get_current_user)):
    data = SpeechToText(file=file, language=language)
    return StreamingResponse(data, media_type="text/plain")

@router.get("/GetChatSessionGeneral")
async def get_chat_session_general(user_id:str = Depends(get_current_user)):
    print(f"Get data by Username {user_id}")
    data = await LoadChatHistoryGeneral(user_id= user_id)
    return data


@router.get("/GetChatSessionDetail")
async def get_chat_session_detail(session:str, user_id:str = Depends(get_current_user)):
    return await LoadChatHistoryBySession(session=session, user_id=user_id)

class NewChatSessionPayload(BaseModel):
    topic:str
@router.post("/CreateNewChatSession")
async def post_NewChatSession(payload: NewChatSessionPayload, user_id:str = Depends(get_current_user)):
    return await CreateNewChatSession(user_id=user_id, topic=payload.topic)

class DeleteSessionPayload(BaseModel):
    session_id :str
    
@router.post('/DeleteChatSession')
async def PostDeleteChatSession(obj:DeleteSessionPayload,back_task:BackgroundTasks, 
                                user_id : str = Depends(get_current_user)):
    print(f'Deleting data at session: {obj.session_id}')
    back_task.add_task(
        DeleteSessionData, obj.session_id, user_id
    )
    return await DeleteSection(session=obj.session_id, user_id=user_id)

class LoginSchema(BaseModel):
    username:str
    password:str

class RegisterSchema(BaseModel):
    username:str
    password:str
    email: Optional[str] = ""

@router.post("/PostRefreshLogin")
async def RefreshLoginToken(login_data:Request):
    refresh_token =  login_data.cookies.get("refresh_token")

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token founded. Please login again"
        )
    try:
        payload = jwt.decode(refresh_token, REFRESH_SECRET_KEY, algorithms=ALGORITHM)

        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail='Token cotaint trash data')

        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(status_code=401, detail='Token cotaint trash data')

        new_access_token = create_access_token(data={"sub":user_id})

        return {"access_token" : new_access_token}
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Refresh token outdated')
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail='Token down')
    
@router.post("/PostLogin")
async def PostLogin(response: Response, payload: LoginSchema):
    
    user_data = await GetUserByUsername(payload.username)

    if not user_data:
        raise HTTPException(status_code=400, detail='No existed user')
    if not pwd_context.verify(payload.password, user_data['password']):
        raise HTTPException(status_code=400, detail="Username or Password failed")

    access_token = create_access_token(data={"sub": str(user_data['user_id']), 'username': user_data['username']})
    refresh_token = create_refresh_token(data={'sub':str(user_data['user_id'])})

    response.set_cookie(key='refresh_token', value=refresh_token, httponly=True)

    return {"access_token":access_token, "username": user_data['username']}

class SignUpSchema(BaseModel):
    username:str
    password:str
    email: Optional[str]

@router.post("/PostSignUp")
async def PostSignUp(payload:SignUpSchema):
    user_exists = await GetUserByUsername(payload.username)

    if user_exists:
        raise HTTPException(status_code=400, detail='Username existed')
    
    hass_password = pwd_context.hash(payload.password)
    await AddUser(username=payload.username, password=hass_password, emaiL=payload.email)

    return {"status":"success"}
Api_App.include_router(router)


from pydantic import BaseModel, Field, JsonValue
from typing import Optional, Literal, List, Dict, Any
from datetime import datetime

class AnimationFormat(BaseModel):
    clip:str 
    mode: Literal["once","loop"]
    speed: float 

class ToolList(BaseModel):
    name: Optional[Literal["GenerateImage"]] = Field (description="Name of available tools")
    arguments: str = Field(description="arguments is the raw prompt for the Function, only return a value of string. If no tool is needed, return a null string")
class Norma_ChatFormat(BaseModel):
    emotion: Optional[List[float]]
    animation: Optional[AnimationFormat]
    tools_call: Optional[ToolList]
    message: str

class Vector_DB_Format(BaseModel):
    content: Optional[str] = None
    emotion: Optional[dict[str, float]] = {
        "neutral":0.0,
        "joy":0.0,
        "sadness":0.0,
        "anger":0.0,
        "fear":0.0,
        "surprise":0.0,
        "disgust":0.0
    }
    importance: Optional[int] = None
    category: Optional[list[str]] = []
    keywords: Optional[list[str]] = []
    timestamp: datetime | None = None
    



class Image_Generation_Prompt_Format(BaseModel):
    prompt: str
    num_inference_steps: Optional[int] = 25
    guidance_scale: Optional[float] = 7.5
    width: Optional[int] = 512
    height: Optional[int] = 512
    negative_promt: Optional[str] = "low quality, lowres, wrong anatomy, bad anatomy, deformed, disfigured, ugly"
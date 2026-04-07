from pydantic import BaseModel
from typing import Optional

class Generate_Image_Format(BaseModel):
    prompt: str
    num_inference_step: Optional[int] = 75
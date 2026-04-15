import torch 
from diffusers import StableDiffusionPipeline,DPMSolverMultistepScheduler
from PIL.Image import Image
from .PromptFormat import Image_Generation_Prompt_Format
import asyncio
import os
import uuid
pipeline = StableDiffusionPipeline.from_pretrained(
    "Meina/MeinaMix_V11", 
    torch_dtype = torch.float16 ,
    use_safetensors = True
)

pipeline.scheduler = DPMSolverMultistepScheduler.from_config(
    pipeline.scheduler.config,
    algorithm_type = "dpmsolver++",
    use_karras_sigmas=True
)
pipeline.safety_checker = None
device  = "cuda" if torch.cuda.is_available() else "cpu"
device = 'mps' if torch.backends.mps.is_available() else device

pipeline.to(device)

if not os.path.exists("Generated_image"):
    os.makedirs("Generated_image")

async def Generate_img(prompt: Image_Generation_Prompt_Format) -> Image:
    
    image: Image =  pipeline(
        prompt = prompt.prompt,
        negative_prompt=prompt.negative_promt,
        width=prompt.width,
        height = prompt.height,
        guidance_scale=prompt.guidance_scale,
        num_inference_steps=prompt.num_inference_steps).images[0]
    filename = f"{uuid.uuid4()}.png"
    file_path = f"Generated_image/{filename}"
    image.save(file_path)
    image_url = f"http://localhost:8000/{file_path}"
    return image_url
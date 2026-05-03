
from faster_whisper import WhisperModel
print("Loading whisper")
import os

model_size = "small"
model = WhisperModel(model_size, device="cuda", compute_type = "float16")
async def SpeechToText(file, language = 'vi'):
    temp_file_path = f"temp_{file.filename}"
    try:
        

        with open(temp_file_path, "wb") as buffer:
            buffer.write(await file.read())

        segments, info = model.transcribe(temp_file_path, beam_size=5, language = language)

        for segment in segments:
            print(segment.text)
            yield segment.text + " "
            
       
    except Exception as e: 
        pass
    finally:
         if os.path.exists(temp_file_path):
             
            os.remove(temp_file_path)
            print("Removed audio")
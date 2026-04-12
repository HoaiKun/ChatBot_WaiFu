from openai import AsyncOpenAI, OpenAI
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
import os
from .PromptFormat import Vector_DB_Format, Norma_ChatFormat
from .Chroma_DB import SaveMemoryToVectorDB, SearchMemoryDB, loadDB
import asyncio
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = AsyncOpenAI(
    api_key= api_key
)
chatHistory = [
    {
    "role":"user",
    "content":"hello, what is your name"
    }
]
loadDB()
async def get_chat_response(chatHistory:list, model: str = "gpt-4o"):
    userMessage = chatHistory[-1]["content"]
    context = SearchMemoryDB(userMessage)
    print(f"Context: {context}")
    systemContent =  (
         "You are a cute outgoing cute tricky girlfriend as well as assistant. Use the following context to keep the conversation up"
         f"Context: {context}"
        "The 'emotion' list follows this EXACT order: \n"
    "[0:neutral, 1:joy, 2:sadness, 3:anger, 4:fear, 5:surprise, 6:disgust].\n\n"
    "RULES for the vector:\n"
    "- Each value is a float between 0.0 and 1.0.\n"
    "- If you are teasing the user, increase joy (index 1) and surprise (index 5).\n"
    "- Always provide exactly 7 values in the list."
    "-Always fill animation with action, default is idle"
)
    
    
    systemMessage = {"role" : "system", "content": systemContent}
    mainmodel=model
    if(model):
        mainmodel=model
    async with client.beta.chat.completions.stream(
        model=mainmodel,
        response_format= Norma_ChatFormat,
        temperature=0.7,
        messages=[systemMessage,*chatHistory],
    ) as response:
        message_marker = '"message":'
        animation_marker = '"animation":'
        animation_started = False
        emotion_marker = '"emotion":'
        message_started = False
        emotion = None
        animation = None
        full_text = ""
        main_text_lastindex = 0
        async for event in response:
                chunk =None
                if event.type == "chunk":
                    chunk= event.chunk.choices[0].delta.content
                    if chunk:
                        full_text += chunk
                        if not emotion:
                             if animation_marker in full_text:
                                  try:
                                       part = full_text.split(animation_marker)[0]
                                       if emotion_marker in part :
                                            emotion = part.split(emotion_marker)[1]
                                            if emotion.endswith(','):
                                                 emotion = emotion[:-1].strip()
                                            start_index = full_text.find(emotion_marker) + len(emotion_marker)
                                            actual_content_start_id = full_text.find('"',start_index) + 1
                                       if actual_content_start_id > 0 :
                                            main_text_lastindex = actual_content_start_id
                                            animation_started = True
                                            yield f"__EMOTION__:{emotion} "
                                            
                                  except:
                                    pass
                        if animation_started and not animation:
                             if message_marker in full_text:
                                  part2 = full_text.split(message_marker)[0]    
                                  try:
                                    if animation_marker in part2:
                                         animation = part2.split(animation_marker)[1]
                                         if animation.endswith(','):
                                            animation = animation[:-1].strip()
                                            start_index = full_text.find(animation_marker) + len(animation_marker)
                                            actual_content_start_id = full_text.find('"', start_index) + 1
                                         if actual_content_start_id > 0:
                                             main_text_lastindex = actual_content_start_id
                                             message_started = True
                                             yield f"__ANIMATION__:{animation} "
                                             
                                  except:
                                       pass
                        if message_started:
                             main_content = full_text[main_text_lastindex:]
                             clean_content = main_content.replace('"}', '').replace('}', '')
                             
                             yield clean_content
                             main_text_lastindex = len(full_text)
        print(emotion)
        print(animation)
        final_completion = await response.get_final_completion()
        bot_obj = final_completion.choices[0].message.parsed
        if bot_obj:
              asyncio.create_task(save_chat_response(userMes=userMessage, botRep=bot_obj.message))  
             
    

async def save_chat_response(userMes:str, botRep:str, emotion:str = "neutral"):
    systemMessage = (
            "You are the Memory as well as context summarizer. Your job is to extract and structure memories from the conversation and fill data into format, all field must have value.\n\n"
        )
    response_memory = await client.beta.chat.completions.parse(

        model='gpt-4o-mini',
        response_format= Vector_DB_Format,
        messages=[
            {
                "role" : "system",
                "content": systemMessage
            },
            {
                "role":"user",
                "content": "Converstaion: {" "User: "+ userMes + "Assistant: " + botRep +"}"
            }

        ]
    )
    save_obj = response_memory.choices[0].message.parsed
    await SaveMemoryToVectorDB(save_obj)
    print("Đã save nha xếp")


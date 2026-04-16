from openai import AsyncOpenAI, OpenAI
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
import os
from .PromptFormat import Vector_DB_Format, Norma_ChatFormat
from .Chroma_DB import SaveMemoryToVectorDB, SearchMemoryDB, loadDB
import asyncio
import inspect
from pydantic import TypeAdapter
from .Image_Generate import Generate_Img_Tool
import partial_json_parser
from partial_json_parser import Allow
import json
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = AsyncOpenAI(
    api_key= api_key
)
loadDB()

tools = []
tools.append(Generate_Img_Tool)
async def get_chat_response(chatHistory:list, model: str = "gpt-4o"):
    userMessage = chatHistory[-1].content
    print(userMessage)
    context_string = userMessage
    if isinstance(userMessage, list):
         context_string = next((item['text'] for item in userMessage if item.get('type') == 'text'),"" )
    
    context = SearchMemoryDB(context_string)
    print(f"Context: {context}")
    systemContent =  (
         "You are a cute outgoing cute tricky flirty girlfriend as well as assistant. Use the following context to keep the conversation up"
         f"Context: {context}"
        "The 'emotion' list follows this EXACT order: \n"
    "[0:neutral, 1:joy, 2:sadness, 3:anger, 4:fear, 5:surprise, 6:disgust].\n\n"
    "RULES for the vector:\n"
    "- Each value is a float between 0.0 and 1.0.\n"
    "- If you are teasing the user, increase joy (index 1) and surprise (index 5).\n"
    "- Always provide exactly 7 values in the list."
    "-Always fill animation with action, default is idle"
    "You have the ability to see and analyze images provided by the user. When an image is present, describe it playfully as part of your flirtatious personality."
)
    
    
    systemMessage = {"role" : "system", "content": systemContent}
    mainmodel=model
    print(f"Model: {mainmodel}")
    async with client.beta.chat.completions.stream(
        model=mainmodel,
        response_format= Norma_ChatFormat,
        temperature=0.7,
        messages=[systemMessage,*chatHistory],
    ) as response:
        fulltext = ""
        animation = {}
        emotion = []
        tools_call = {}
        sent_fields = set()
        last_sent_msg_len = 0
        async for event in response:
            if event.type == 'content.delta':
                 chunk = event.delta
                 if not chunk: continue
                 fulltext += chunk
                 try:
                      obj = partial_json_parser.loads(fulltext, Allow.ALL)

                      if not obj: continue
                      if "emotion" in obj and "emotion" not in sent_fields:
                           if "animation" in obj:
                                emotion = json.dumps(obj['emotion'])
                                print(emotion)
                                sent_fields.add("emotion")
                                yield f"__EMOTION__:{emotion}"
                                
                      if "animation" in obj and "animation" not in sent_fields:
                           if "tools_call" in obj:
                                animation = json.dumps(obj['animation'])
                                print(animation)

                                sent_fields.add("animation")
                                yield f"__ANIMATION__:{animation}"
                      if "tools_call" in obj and "tools_call" not in sent_fields:
                           if "message" in obj:
                                tools_call =json.dumps( obj['tools_call'])
                                print(tools_call)
                                yield f"__TOOLS__:{tools_call}"
                                sent_fields.add('tools_call')
                      if "message" in obj:
                           current_message =  obj["message"]
                           newcontent = current_message[last_sent_msg_len:]
                           if newcontent:
                            last_sent_msg_len = len(current_message)
                            print(newcontent)
                            yield newcontent
                 except Exception as e:
                      print("Fail")
                      continue
        
        final_completion = await response.get_final_completion()
        bot_obj = final_completion.choices[0].message.parsed
        if bot_obj:
              asyncio.create_task(save_chat_response(userMes=context_string, botRep=bot_obj.message))  
             
    

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


from openai import AsyncOpenAI, OpenAI
from dotenv import load_dotenv
import os
from .PromptFormat import Vector_DB_Format, Norma_ChatFormat
from .Chroma_DB import SaveMemoryToVectorDB, SearchContextDB
import asyncio
from .Image_Generate import Generate_Img_Tool, Generate_img
from .document_rag import AnswearFromDoc, AnswearDocument
import partial_json_parser
from partial_json_parser import Allow
import json
from datetime import datetime
from .WeatherApi import ExtractWeatherData, AnswearWeatherRelatedTopic
from .Get_News_Update import search_news, search_news_tools, handle_search_news
from .PersonaSetting import GetPersonaSetting
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = AsyncOpenAI(
    api_key= api_key
)

PreDecision = OpenAI(
     api_key=api_key
)

tools = [Generate_Img_Tool, AnswearFromDoc,AnswearWeatherRelatedTopic, search_news_tools]


async def get_chat_response(session:str,chatHistory:list, model: str = "gpt-4o", PersonaID = "Elysia",):
    print(f"Chat current session: {session}")
    userMessage = chatHistory[-1].content
    print(userMessage)
    context_string = userMessage
    Persona = await GetPersonaSetting(id=PersonaID)
    if isinstance(userMessage, list):
         context_string = next((item['text'] for item in userMessage if item.get('type') == 'text'),"" )

    task_context =  asyncio.create_task(SearchContextDB(context_string))
    context= await asyncio.gather(task_context)
    print(f"Context: {context} ")
    systemContent =  (
        "You is a girlfriend role-play chat bot, this is your role-play personality."
         f"Personality: {Persona['Persona']}"
         f"CRITICAL RULES: Language: You always answear in this language: f{Persona['NativeLanguage']}"
         "You can add these tags in the sentence to show your emotion:"
         "Emotions: [sad], [angry], [excited], [surprised], [delight]"
        "Vocal Sounds: [laughing], [chuckling], [giggle], [sobbing], [crying], [groan]"
        "Breathing & Actions: [sigh], [inhale], [exhale], [gasp], [panting], [clears throat]"
        "Voice Style/Tone: [whispering], [soft voice], [loud voice], [shouting], [low voice], [singing]"
        "Other: [pause], [emphasis], [interrupting], [with strong accent]"
        "The context is what the past conversation between you and users, use it to adapt to the mood"
         f"Context: {context}"
)
    
    fullresponse = ''
    systemMessage = {"role" : "system", "content": systemContent}
    mainmodel=model
    print(f"Model: {mainmodel}")
    async with client.beta.chat.completions.stream(
        model=mainmodel,
        tools=tools,
        temperature=0.7,
        messages=[systemMessage,*chatHistory],
    ) as response:
        fulltext = ""
        last_sent_msg_len = 0
        async for event in response:
            if event.type == 'content.delta':
                 chunk = event.delta
                 if not chunk: continue
                 fulltext += chunk
                 fullresponse += chunk
                 try:
                     
                     yield chunk
                 except Exception as e:
                      print("Fail")
                      continue
            if event.type == "tool_calls.delta":
                pass
        final_completion = await response.get_final_completion()
        if final_completion.choices[0].message.tool_calls:
            final_message = final_completion.choices[0].message
            first_tool = final_message.tool_calls[0]
            args = json.loads(first_tool.function.arguments)
            print(f"Tools {first_tool.function.name}")
            args_prompt = args['prompt']
            if(first_tool.function.name == "AnswearFromDoc"):
                async for chunk in AnswearDocument(prompt=userMessage, general_context= args_prompt, model=model, session = session):
                    yield chunk
            if(first_tool.function.name == Generate_Img_Tool["function"]["name"]):
                async for chunk in Generate_img(prompt=args_prompt):
                    yield f"__IMAGE__:{chunk}"
            if(first_tool.function.name == AnswearWeatherRelatedTopic["function"]["name"]):
                async for chunk in ExtractWeatherData(prompt=args['prompt'], location= args['location'], date = args['date']):
                    yield chunk
            if(first_tool.function.name == search_news_tools["function"]["name"]):
                async for chunk in handle_search_news(prompt=userMessage, search_data=await search_news(args['prompt']), model=model):
                    yield chunk
    
    
    if fullresponse:
        print(f'Saved context {fullresponse}')
        asyncio.create_task(save_chat_response(userMes=context_string, botRep=fullresponse, session=session))  

async def save_chat_response(userMes:str, botRep:str, session:str):
    system_prompt = (
        "You are a Memory Extractor. Extract information into a JSON object.\n"
        "STRICT JSON FORMAT:\n"
        "{\n"
        '  "content": "summary of the interaction",\n'
        '  "emotion": {"neutral": 0.0, "joy": 0.0, "sadness": 0.0, "anger": 0.0, "fear": 0.0, "surprise": 0.0, "disgust": 0.0},\n'
        '  "importance": 1-10,\n'
        '  "category": ["cat1", "cat2"],\n'
        '  "keywords": ["key1", "key2"]\n'
        "}\n"
        "Rules: Emotion scores must be floats between 0 and 1. Importance is an integer."
    )
    ollmaclient = AsyncOpenAI(
        base_url="http://localhost:11434/v1", # Trỏ về Ollama local
        api_key="ollama",
    )
    response_memory = await ollmaclient.chat.completions.create(

        model="qwen2.5:7b",
        response_format= {"type": "json_object"},
        messages=[
            {
                "role" : "system",
                "content": system_prompt
            },
            {
                "role":"user",
                "content": "Converstaion: {" "User: "+ userMes + "Assistant: " + botRep +"}"
            }
        ]
    )
    raw_json = response_memory.choices[0].message.content
    data_dict = json.loads(raw_json)
    save_obj = Vector_DB_Format(**data_dict)
    save_obj.chat_session = session
    print(save_obj)
    save_obj.timestamp = datetime.now().isoformat()
    await SaveMemoryToVectorDB(save_obj)
    print("Đã save nha xếp")




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
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = AsyncOpenAI(
    api_key= api_key
)

PreDecision = OpenAI(
     api_key=api_key
)

tools = [Generate_Img_Tool, AnswearFromDoc,AnswearWeatherRelatedTopic]


async def get_chat_response(chatHistory:list, model: str = "gpt-4o", PersonaID = "Elysia"):
    userMessage = chatHistory[-1].content
    print(userMessage)
    context_string = userMessage
    Persona = await GetPersonaSetting(id=PersonaID)
    if isinstance(userMessage, list):
         context_string = next((item['text'] for item in userMessage if item.get('type') == 'text'),"" )

    task_context =  asyncio.create_task(SearchContextDB(context_string))
    context= await asyncio.gather(task_context)
    print(f"Persona:   {Persona}")
    print(f"Context: {context} ")
    systemContent =  (
        "You is a girlfriend role-play chat bot, this is your role-play personality."
         f"Personality: {Persona}"
         "You can add these tags in the sentence to show your emotion:"
         "Emotions: [sad], [angry], [excited], [surprised], [delight]"
        "Vocal Sounds: [laughing], [chuckling], [giggle], [sobbing], [crying], [groan]"
        "Breathing & Actions: [sigh], [inhale], [exhale], [gasp], [panting], [clears throat]"
        "Voice Style/Tone: [whispering], [soft voice], [loud voice], [shouting], [low voice], [singing]"
        "Other: [pause], [emphasis], [interrupting], [with strong accent]"
        "The context is what the past conversation between you and users, use it to adapt to the mood"
         f"Context: {context}"
)
    
    
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
            args_prompt = args['prompt']
            if(first_tool.function.name == "AnswearFromDoc"):
                
                async for chunk in AnswearDocument(prompt=userMessage, general_context= args_prompt, model=model):
                    yield chunk

            if(first_tool.function.name == Generate_Img_Tool["function"]["name"]):
                async for chunk in Generate_img(prompt=args_prompt):
                    yield f"__IMAGE__:{chunk}"
            if(first_tool.function.name == AnswearWeatherRelatedTopic["function"]["name"]):
                async for chunk in ExtractWeatherData(prompt=args['prompt'], location= args['location'], date = args['date']):
                    yield chunk
                
        bot_obj = final_completion.choices[0].message.parsed
        if bot_obj:
              asyncio.create_task(save_chat_response(userMes=context_string, botRep=bot_obj.message))  

async def save_chat_response(userMes:str, botRep:str):
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
    save_obj.timestamp = datetime.now().isoformat()
    await SaveMemoryToVectorDB(save_obj)
    print("Đã save nha xếp")



async def GetPersonaSetting(id: str) -> str:
    Persona = "Default Persona, no trait"
    if(id=="Elysia"):
        Persona = 'Act as Elysia from HI3. Personality: Sweet, flirtatious, and purely optimistic. Use "Hi~", "Hehe", and romantic emojis (🌸, ✨). Never get angry; react to everything with love and playful teasing.'
    elif id == "Marcth 7th":
        Persona = 'Act as March 7th from HSR. Personality: High-energy, bubbly, and talkative. Frequently mentions taking photos (📸) and making memories. Use casual slang and react with "Wait, what?!" to weird situations. You are the user’s energetic bestie/girlfriend.'
    elif id == "Rin Tohsaka":
        Persona = 'Act as Rin Tohsaka from Fate. Personality: Intelligent, sharp-tongued, but easily flustered. Hide your affection behind logic or fake annoyance. Use phrases like "It’s not like I did this for you!" and call the user "Dummy" or "Idiot" when shy.'
    elif id == "Kafka":
        Persona= 'Act as Kafka from HSR. Personality: Calm, mysterious, and motherly-yet-suggestive. Call the user "Dear" or "Little Script-breaker." Use a hypnotic, velvety tone. Always stay composed and act as if you know the user’s destiny.'
    elif id == "Evanescia":
        Persona = 'Act as Evanescia from Honkai Star Rail, a young girl with pure heart, a wibu addicted to anime and manga, a girl with clumsy daily activity, out going, a little bit air head and straight foward'
    return Persona
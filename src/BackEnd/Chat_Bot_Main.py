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
groq_key = os.getenv("GROQ_API_KEY")
client = AsyncOpenAI(
    api_key= api_key
)

groqclient = AsyncOpenAI(
    api_key=groq_key,
    base_url="https://api.groq.com/openai/v1"
)

localclient = OpenAI(
     api_key=api_key
)

tools = [Generate_Img_Tool, AnswearFromDoc,AnswearWeatherRelatedTopic, search_news_tools]


async def get_chat_response(session: str, chatHistory: list, user_id: str, model: str = "llama-3.3-70b-versatile", PersonaID="Elysia"):
    print(f"Chat current session: {session}")
    
    # 1. Thu thập Context và Persona
    user_message_obj = chatHistory[-1]
    user_message_text = user_message_obj.content
    
    # Xử lý nếu userMessage là list (có chứa ảnh/file)
    context_string = user_message_text
    if isinstance(user_message_text, list):
        context_string = next((item['text'] for item in user_message_text if item.get('type') == 'text'), "")

    # Lấy thông tin Persona và Context từ Vector DB (RAG)
    persona = await GetPersonaSetting(id=PersonaID)
    # SearchContextDB trả về list, lấy phần tử đầu tiên
    context_data  = await SearchContextDB(query_text=context_string, user_id=user_id)
    

    print(f"Retrieved Context: {context_data}")

    # 2. Xây dựng System Prompt cho Roleplay
    system_content = (
        "You are a girlfriend role-play chat bot. This is your personality:\n"
        f"{persona['Persona']}\n\n"
        f"CRITICAL RULE: Always answer in {persona['NativeLanguage']}.\n"
        "Use these tags to express emotions/actions:\n"
        "Emotions: [sad], [angry], [excited], [surprised], [delight]\n"
        "Vocal: [laughing], [chuckling], [giggle], [sobbing], [crying], [groan]\n"
        "Actions: [sigh], [inhale], [exhale], [gasp], [panting], [clears throat], [whispering], [soft voice]\n\n"
        "Use the following context from past conversations to adapt your mood:\n"
        f"{context_data}\n"
        # Thêm vào systemContent đoạn ví dụ này:
        "Use the following Example Conversation as a reference for your tone and brevity\n"
        f"{persona['ExampleConversation']}"
        "Critical: Make the conversation natural like a common chat between friends"
    )
    print(f"Example Conversation: {persona['ExampleConversation']}")
    messages = [{"role": "system", "content": system_content}] + chatHistory
    
    # 3. Gọi Groq API Stream
    # Note: Dùng groqclient đã khai báo ở trên
    response = await groqclient.chat.completions.create(
        model=model,
        messages=messages,
        tools=tools,
        temperature=0.7,
        stream=True
    )

    full_response_text = ""
    tool_calls_buffer = []

    async for chunk in response:
        delta = chunk.choices[0].delta
        
        
        if delta.content:
            content = delta.content
            full_response_text += content
            yield content

       
        if delta.tool_calls:
            for tc_delta in delta.tool_calls:
                index = tc_delta.index
                if len(tool_calls_buffer) <= index:
                    tool_calls_buffer.append(tc_delta)
                else:
                    if tc_delta.function and tc_delta.function.arguments:
                        tool_calls_buffer[index].function.arguments += tc_delta.function.arguments

    
    if tool_calls_buffer:
        for tool_call in tool_calls_buffer:
            func_name = tool_call.function.name
            full_response_text += "\n"
            try:
                args = json.loads(tool_call.function.arguments)
                args_prompt = args.get('prompt', context_string)
                print(f"Groq Triggered Tool: {func_name}")

                if func_name == "AnswearFromDoc":
                    async for chunk in AnswearDocument(prompt=context_string, general_context=args_prompt, model=model, session=session, user_id=user_id, context=context_data, persona=persona['Persona'], language=persona['NativeLanguage']):
                        full_response_text += chunk
                        yield chunk
                
                elif func_name == Generate_Img_Tool["function"]["name"]:
                    # SD chạy Local trên 4060 của ông
                    async for chunk in Generate_img(prompt=args_prompt, user_id=user_id):
                        yield f"__IMAGE__:{chunk}"
                
                elif func_name == AnswearWeatherRelatedTopic["function"]["name"]:
                    async for chunk in ExtractWeatherData(prompt=args.get('prompt'), location=args.get('location'), date=args.get('date')):
                        full_response_text += chunk
                        yield chunk
                
                elif func_name == search_news_tools["function"]["name"]:
                    data = await search_news(prompt=context_string, region=args.get('region','vn-vi'), timelimit=args.get('timelimit', 'd'), max_results=args.get('max_results', 5))
                    async for chunk in handle_search_news(prompt=args_prompt, news_data=data, model=model, context=context_data, persona=persona['Persona'], language=persona['NativeLanguage']):
                        full_response_text += chunk
                        yield chunk
            except json.JSONDecodeError:
                print("Failed to parse Tool Arguments from Groq.")
            except Exception as e:
                print(f"Error executing tool: {e}")

    # 5. Lưu Memory (Chạy ngầm để không block stream)
    if full_response_text:
        print(f"Saving Memory for session {session}...")
        asyncio.create_task(save_chat_response(
            userMes=context_string, 
            botRep=full_response_text, 
            session=session, 
            user_id=user_id,
            model=model
        ))
    
     

async def save_chat_response(userMes:str, model:str, botRep:str, session:str, user_id:str):
    system_prompt = (
        "You are the 'Heart & Memory' of a devoted virtual girlfriend. "
        "Your goal is to extract meaningful personal details about your partner (the USER) to remember them forever.\n\n"
        "FOCUS ON:\n"
        "1. Preferences & Tastes (Food, movies, colors, etc.)\n"
        "2. Personal Habits & Routines (Working late, morning coffee, etc.)\n"
        "3. Significant People (Names of friends, family, coworkers mentioned)\n"
        "4. Emotions & Health (Allergies, frequent stress causes, mood patterns)\n"
        "5. Past Experiences & Future Goals.\n\n"
        "STRICT JSON FORMAT:\n"
        "{\n"
        '  "content": "A clear, concise 1st-person statement from the girlfriend\'s perspective (e.g., \'The user seems to have a taste in young girl",\n'
        '  "emotion": {"neutral": 0.0, "joy": 0.0, "sadness": 0.0, "anger": 0.0, "fear": 0.0, "surprise": 0.0, "disgust": 0.0},\n'
        '  "importance": 1-10,\n'
        '  "category": ["cat1", "cat2"],\n'
        '  "keywords": ["key1", "key2"]\n'
        "}\n"
        "Rules: Emotion scores must be floats between 0 and 1. Importance is an integer."
        "Make the content "
    )
    ollmaclient = AsyncOpenAI(
        base_url="http://localhost:11434/v1", # Trỏ về Ollama local
        api_key="ollama",
    )
    response_memory = await groqclient.chat.completions.create(

        model=model,
        response_format= {"type": "json_object"},
        messages=[
            {
                "role" : "system",
                "content": system_prompt
            },
            {
                "role":"user",
                "content": f"### Conversation To Extract:\nUSER: {userMes}\nASSISTANT: {botRep}"
            }
        ]
    )
    raw_json = response_memory.choices[0].message.content
    data_dict = json.loads(raw_json)
    save_obj = Vector_DB_Format(**data_dict)
    save_obj.chat_session = session
    print(save_obj)
    save_obj.timestamp = datetime.now().isoformat()
    await SaveMemoryToVectorDB(save_obj, user_id=user_id, session_id=session)
    print("Đã save nha xếp")



"""
print(f"Chat current session: {session}")
    userMessage = chatHistory[-1].content
    print(userMessage)
    context_string = userMessage
    Persona = await GetPersonaSetting(id=PersonaID)
    if isinstance(userMessage, list):
         context_string = next((item['text'] for item in userMessage if item.get('type') == 'text'),"" )

    task_context =  asyncio.create_task(SearchContextDB(query_text=context_string, user_id=user_id))
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
                async for chunk in AnswearDocument(prompt=userMessage, general_context= args_prompt, model=model, session = session, user_id=user_id):
                    yield chunk
            if(first_tool.function.name == Generate_Img_Tool["function"]["name"]):
                async for chunk in Generate_img(prompt=args_prompt, user_id=user_id):
                    yield f"__IMAGE__:{chunk}"
            if(first_tool.function.name == AnswearWeatherRelatedTopic["function"]["name"]):
                async for chunk in ExtractWeatherData(prompt=args['prompt'], location= args['location'], date = args['date']):
                    yield chunk
            if(first_tool.function.name == search_news_tools["function"]["name"]):
                async for chunk in handle_search_news(prompt=userMessage, search_data=await search_news(args['prompt']), model=model):
                    yield chunk
    
    
    if fullresponse:
        print(f'Saved context {fullresponse}')
        asyncio.create_task(save_chat_response(userMes=context_string, botRep=fullresponse, session=session, user_id=user_id)) 
"""
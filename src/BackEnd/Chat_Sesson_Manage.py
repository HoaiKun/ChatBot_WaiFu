import psycopg
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row
import os
from dotenv import load_dotenv
import uuid
from openai import AsyncOpenAI
from dotenv import load_dotenv
load_dotenv()
password = os.getenv("Waifu_Chatbot_DB_Password")
conn_info = f"dbname='waifu_chatbot_db' user='postgres' password='{password}' host='127.0.0.1' port='5432'"

pool = AsyncConnectionPool(
    conninfo=conn_info,
    min_size=0,
    max_size=10,
    kwargs={"row_factory": dict_row}
)

async def LoadChatHistoryGeneral(user_id:str):
    async with  pool.connection() as conn:
        async with conn.cursor() as cur:
            query = """
            select session_id, ct.user_id user_id, topic, ct.created_date created_date  from ChatTopic ct join senpai s 
            on ct.user_id =s.user_id where s.user_id = %s order by ct.created_date desc;
            """
            await cur.execute(query, (user_id,))
            return await cur.fetchall()
        
async def LoadChatHistoryBySession(session, user_id):
    async with pool.connection() as c:
        async with c.cursor() as cc:
            query = """
            select * from ChatHistory where session_id = %s and user_id = %s order by created_date;
            """
            await cc.execute(query, (session,user_id))
            return await cc.fetchall()

async def UpdateChatHistoryBySession(session, user_id, role, content, metadata = None):
    async with  pool.connection() as c:
        async with c.cursor() as cc:
            query = """
            insert into ChatHistory(session_id, user_id, role,content, metadata)
            values(
            %s, %s, %s, %s,%s
            );
            """
            await cc.execute(query, (session,user_id,role, content, psycopg.types.json.Jsonb(metadata)))
            print(f'saved: {content}')
            return "Updated"
        

async def CreateNewChatSession(user_id: str, topic:str = "New Chat"):
    client = AsyncOpenAI(
        base_url="http://localhost:11434/v1", # Trỏ về Ollama local
        api_key="ollama"
    )
    print(f"~~~~~~provided raw topic: {topic}")
    get_topic = await client.chat.completions.create(
        model='qwen2.5:7b',
        temperature=0.5,
        messages=[
            {
                "role" :"system",
                'content' : 'You are a topic summarizer. Your misison is from user prompt, covert it into a short generalize topic for a chat session in a human way. Just give the straight topic.'
            },
            {
                "role":"user",
                "content": f"From this prompt: {topic}, connvert it into a very short topic sentence for a chat session"
            }
        ]
    )
    topic_sentence = get_topic.choices[0].message.content
    newuuid = str(uuid.uuid4())
    async with pool.connection() as c:
        async with c.cursor() as cc:
            query = """
            insert into ChatTopic(session_id, user_id, topic) values (
            %s, %s, %s);
            """

            await cc.execute(query, (newuuid,user_id, topic_sentence,))
            print('Create chat session')
            return {'session_id':newuuid, 'user_id':user_id, 'topic':topic_sentence}
        

async def DeleteSection(session, user_id):
    async with  pool.connection() as c:
        async with c.cursor() as cc:
            query = """
            delete from ChatTopic where session_id = %s and user_id = %s
            """
            await cc.execute(query, (session,user_id))
            return "Deleted"
        
async def GetUserByUsername(username:str):
    async with  pool.connection() as c:
        async with c.cursor() as cc:
            query = """
            select * from senpai where username = %s
            """
            await cc.execute(query, (username,))
            return await cc.fetchone()

async def AddUser(username:str, password:str, emaiL:str = None):
    async with  pool.connection() as c:
        async with c.cursor() as cc:
            query = """
            insert into senpai (username, password, email)
            values (%s, %s, %s)
            RETURNING user_id;
            """
            await cc.execute(query, (username, password,emaiL))
            return await cc.fetchone()

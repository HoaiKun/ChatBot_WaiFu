import psycopg
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row
import os
from dotenv import load_dotenv
import uuid
from openai import OpenAI
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

async def LoadChatHistoryGeneral(username:str):
    async with  pool.connection() as conn:
        async with conn.cursor() as cur:
            query = """
            select session_id, ct.user_id user_id, topic, ct.created_date created_date  from ChatTopic ct join senpai s 
            on ct.user_id =s.user_id where s.username = %s order by ct.created_date desc;
            """
            await cur.execute(query, (username,))
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
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    get_topic = client.chat.completions.create(
        model='gpt-4o',
        temperature=0.2,
        messages=[
            {
                "role":"user",
                "content": f"From this prompt: {topic}, connvert it into a very short topic sentence for a chat session"
            }
        ]
    )
    topic_sentence = get_topic.choices[0].message.content
    newuuid = uuid.uuid4()
    async with pool.connection() as c:
        async with c.cursor() as cc:
            query = """
            insert into ChatTopic(session_id, user_id, topic) values (
            %s, %s, %s);
            """

            await cc.execute(query, (newuuid,user_id, topic_sentence,))
            print('Create chat session')
            return {'session_id':newuuid, 'user_id':user_id, 'topic':topic_sentence}
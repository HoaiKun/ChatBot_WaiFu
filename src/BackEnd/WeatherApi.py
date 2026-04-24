import httpx
from dotenv import load_dotenv
import os
from openai import AsyncOpenAI
import inspect
from pydantic import TypeAdapter
load_dotenv()

async def get_weather_data(location: str, date: str):
    api_key = os.getenv("WEATHERAPI_KEY")
    
    # Bước 1: Xác định URL
    if date:
        # Nếu date là object datetime, phải chuyển về chuỗi YYYY-MM-DD
        if not isinstance(date, str):
            date = date.strftime("%Y-%m-%d")
        url = f"http://api.weatherapi.com/v1/history.json?key={api_key}&q={location}&dt={date}&lang=vi"
    else:
        url = f"http://api.weatherapi.com/v1/current.json?key={api_key}&q={location}&lang=vi"

    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        data = response.json()
        
        if "error" in data:
            return f"Hic, lỗi rồi: {data['error'].get('message', 'Không rõ nguyên nhân')}"

        # Bước 2: Truy xuất dữ liệu theo đúng cấu trúc của từng Endpoint
        try:
            if not date:
                # Cấu trúc của current.json
                temp = data['current']['temp_c']
                condition = data['current']['condition']['text']
                return f"Thời tiết tại {location} hiện tại là {condition}, {temp}°C."
            else:
                # Cấu trúc của history.json (khác hoàn toàn current)
                # Dữ liệu nằm trong forecast -> forecastday[0] -> day
                day_data = data['forecast']['forecastday'][0]['day']
                condition = day_data['condition']['text']
                avg_temp = day_data['avgtemp_c']
                return f"Thời tiết tại {location} ngày {date} là {condition}, nhiệt độ trung bình {avg_temp}°C."
        except KeyError as e:
            return f"Lỗi cấu trúc dữ liệu API: Thiếu key {str(e)}"
    

async def ExtractWeatherData(prompt:str, location:str, date:str) -> str:
    """
        From User prompt, answear the question with given Weather data
    """
    api_key = os.getenv("OPENAI_API_KEY")
    Client = AsyncOpenAI(api_key=api_key)
    weather_data = await get_weather_data(location=location, date=date)
    async with Client.beta.chat.completions.stream(
        model="gpt-4o",
        temperature=0.2,
        messages=[
            {
                "role":"system",
                "content": f"Your mission is from weather data: {weather_data} to answear user's prompt"
            },
            {
                "role":"user",
                "content":prompt
            }
        ]
    ) as response:
        text = ""
        async for event in response:
            if event.type == "content.delta":
                chunk =event.delta
                text += chunk
                yield chunk

AnswearWeatherRelatedTopic ={
     "type": "function",
     "function":{
         "name":"AnswearWeatherRelatedTopic",
         "description" : inspect.getdoc(ExtractWeatherData),
         "parameters" : TypeAdapter(ExtractWeatherData).json_schema(),
         "strict" : True
     }
 }
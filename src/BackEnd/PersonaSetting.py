import json
from pathlib import Path

current_dir = Path(__file__).parent
filepath = current_dir / "SystemSetting.json"
file = open(filepath, "r", encoding='utf-8')
jsonfile = json.load(file)


async def GetPersonaSetting(id: str) -> str:
    Persona = "Default Persona, no trait"
    NativeLanguage = "English"
    for item in jsonfile["PersonaSetting"]:
        if item["Id"] == id:
            return item
    return {"Id" : "Default", "Persona" : Persona, "NativeLanguage": NativeLanguage}
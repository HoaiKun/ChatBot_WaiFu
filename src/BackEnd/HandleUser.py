import jwt
from datetime import datetime, timedelta, timezone

SECRET_KEY = 'My_Waifu_Cant_Be_This_Cute'
ALGORITHM = "HS256"
REFRESH_SECRET_KEY ='Do_You_Want_To_Date_This_Cute_Partner'
def create_access_token(data:dict, expires_delta:timedelta | None = None):
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes = 15)
    
    to_encode.update({"exp":expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt

def create_refresh_token(data:dict):
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(days=7)

    to_encode.update({"exp":expire, "type":"refresh"})

    encode_jwt = jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)

    return encode_jwt
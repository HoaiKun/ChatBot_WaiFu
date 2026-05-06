import { pass } from "three/src/nodes/display/PassNode.js";
import { useAuth } from "../UI/AuthContext";
const GetToken = () => localStorage.getItem("waifu_token");
export const GetSpeechResponse = async(text, voice = "679de93ad4634728900347063142e930") => {
   const token = GetToken();
    const payload = {
            text : text,
            voice : voice
        }
    const response = await fetch("http://localhost:8000/api/v1/GetChatSpeech",
        {
            method:"POST",
            headers: {"Content-Type":"application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
    if(!response.ok) throw new Error("Error getting speech done");
    const clob = await response.blob();
    const audioUrl = URL.createObjectURL(clob);
    return audioUrl;
};
export const GetChatResponse = async(session = '9f206986-d00e-4866-bff6-3023a31623a7', chat_history, chat_model, PersonaID = "Elysia", metadata = {}) =>{
    const token = GetToken();
    const payload = {
        session:session,
        metadata:{},
        message: chat_history,
        model : chat_model,
        PersonaID: PersonaID,
         
    }
    console.log(payload);
    const response  = await fetch("http://localhost:8000/api/v1/GetChatResponse",
        {
           method:"POST", 
           headers: {"Content-Type":"application/json",
            "Authorization": `Bearer ${token}`
           },
           body: JSON.stringify(payload)
        }
    );
    if(!response.ok) throw new Error("Error getting chat done");
    return response.body.getReader();
};

export const GetImageGenerate = async(user_prompt) => {
    const token = GetToken();
    const payload = {
        prompt: user_prompt
    }
    const resposne = await fetch("http://localhost:8000/api/v1/GenerateIMG", 
    {
        method:"POST",
        headers: {"Content-Type":"application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    })
    if(!resposne.ok) throw new Error("Error getting Image_generated");
    const result = resposne.json();
    return result;
};

export const PostDocResponse = async(document) => {
    
    const token = GetToken();
    const response = await fetch("http://localhost:8000/api/v1/PostDocumentContent",
        {
            method:"POST",
            body: document,
            headers:{
                "Authorization": `Bearer ${token}`
            }
        }
    )
    if(!response.ok) throw new Error("Cant get Doc content");
    const result = await response.json();
    return result;
}

export const translateToNativeLanguage = async(text, targetLang = "en") => {
    const token = GetToken();
    try{
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const data = await res.json();
        return data[0][0][0]
    } catch (err) {
        return "Translation error"
    }
}

export const GetSystemSetting = async() => {
   const token = GetToken();
    try
    {
        const response  = await fetch("http://localhost:8000/api/v1/GetSystemSetting",
            {
                method:"GET",
                headers:{"Content-Type":"application/json",
                    "Authorization": `Bearer ${token}`
                },
            }
        );
        const data = await response.json();
        return data;
    }
    catch (err)
    {
        return null;
    }
}

export const PostSpeechToText = async(file) => {
    const token = GetToken();
    try{
        const response = await fetch("http://localhost:8000/api/v1/GetSpeechToText",{
            method:"POST",
            body: file,
            headers:{"Authorization": `Bearer ${token}`}
        });
        if(!response.ok) throw new Error("Error from backend");
        const reader = response.body.getReader();
        return reader;
    }
    catch (err)
    {
        console.log("Error get text from speech");
        return null;
    }
}

export const GetChatHistoryGeneral = async() => {
    const token = GetToken();
    try{
        const response = await fetch(`http://localhost:8000/api/v1/GetChatSessionGeneral`,{
            method:"GET",
            headers: {"Content-Type":"application/json",
                "Authorization": `Bearer ${token}`
            },
        
        })
        const result = await response.json();
        return result;
    }
    catch
    {
        console.error("Cant get History");
    }

}

export const GetChatSessionDetail = async(session) => {
    
    const token = GetToken();
    if(session === "defaultid") return null;
    try{
        const resposne = await fetch(`http://localhost:8000/api/v1/GetChatSessionDetail?session=${session}`,{
            method:'GET',
            headers: {"Content-Type":"application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        const result = await resposne.json();
        return result;
    }
    catch{
        console.error("Cant get chat session");
        return null;
    }
}

export const CreateNewChatSession = async( topic) => {
   const token = GetToken();
    const payload = {
        
        topic:topic
    };
    try{
        const response = await fetch('http://localhost:8000/api/v1/CreateNewChatSession', {
            method:"POST",
            headers: {"Content-Type":"application/json",
                "Authorization": `Bearer ${token}`
            },
            body:JSON.stringify(payload)
        });
        const result = await response.json();
        return result;
    }
    catch{
        console.error("Cant create new Session");
        return null;
    }
    return null;
}
export const DeleteSection = async(session_id) => {
    const token = GetToken();
    const payload = {
        session_id:session_id,
        
    };
    console.log("Deleting " + payload)
    try{
        const response = await fetch('http://localhost:8000/api/v1/DeleteChatSession', {
            method:"POST",
            headers: {"Content-Type":"application/json",
                "Authorization": `Bearer ${token}`
            },
            body:JSON.stringify(payload)
        });
        const result = await response.json();
        return result;
    }
    catch{
        console.error("Cant create new Session");
        return null;
    }
    return null;
}

export const SignUp = async(username, password, email = '') =>{
    const payload = {
        username:username,
        password:password,
        email:email
    };
    try{
        const response = await fetch('http://localhost:8000/api/v1/PostSignUp', {
            method:"POST",
            headers: {"Content-Type":"application/json"},
            body:JSON.stringify(payload)
        });
        const result = await response.json();
        return result;
    }
    catch{
        console.error("Cant create new Session");
        return null;
    }
    return null;
}

export const LogIn = async(username, password) =>
{

    const payload = {
        username:username,
        password:password,
    };
    try{
        const response = await fetch('http://localhost:8000/api/v1/PostLogin', {
            method:"POST",
            headers: {"Content-Type":"application/json"},
            body:JSON.stringify(payload)
        });
        const result = await response.json();
        return result;
    }
    catch{
        console.error("Cant create new Session");
        return null;
    }
    return null;
}
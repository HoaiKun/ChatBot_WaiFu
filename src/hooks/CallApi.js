import { pass } from "three/src/nodes/display/PassNode.js";

export const GetSpeechResponse = async(text, voice = "679de93ad4634728900347063142e930") => {
    const payload = {
            text : text,
            voice : voice
        }
    const response = await fetch("http://localhost:8000/api/v1/GetChatSpeech",
        {
            method:"POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify(payload)
        });
    if(!response.ok) throw new Error("Error getting speech done");
    const clob = await response.blob();
    const audioUrl = URL.createObjectURL(clob);
    return audioUrl;
};
export const GetChatResponse = async(session = '9f206986-d00e-4866-bff6-3023a31623a7', user_id = 'b2c2a6b2-556e-4c68-abc3-21c7176d80e2', chat_history, chat_model, PersonaID = "Elysia", metadata = {}) =>{
    const payload = {
        session:session,
        user_id:user_id,
        metadata:{},
        message: chat_history,
        model : chat_model,
        PersonaID: PersonaID,
         
    }
    console.log(payload);
    const response  = await fetch("http://localhost:8000/api/v1/GetChatResponse",
        {
           method:"POST", 
           headers: {"Content-Type":"application/json"},
           body: JSON.stringify(payload)
        }
    );
    if(!response.ok) throw new Error("Error getting chat done");
    return response.body.getReader();
};

export const GetImageGenerate = async(user_prompt) => {
    const payload = {
        prompt: user_prompt
    }
    const resposne = await fetch("http://localhost:8000/api/v1/GenerateIMG", 
    {
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload)
    })
    if(!resposne.ok) throw new Error("Error getting Image_generated");
    const result = resposne.json();
    return result;
};

export const PostDocResponse = async(document) => {

    const response = await fetch("http://localhost:8000/api/v1/PostDocumentContent",
        {
            method:"POST",
            body: document
        }
    )
    if(!response.ok) throw new Error("Cant get Doc content");
    const result = await response.json();
    return result;
}

export const translateToNativeLanguage = async(text, targetLang = "en") => {
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
    try
    {
        const response  = await fetch("http://localhost:8000/api/v1/GetSystemSetting",
            {
                method:"GET",
                headers:{"Content-Type":"application/json"},
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
    try{
        const response = await fetch("http://localhost:8000/api/v1/GetSpeechToText",{
            method:"POST",
            body: file
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

export const GetChatHistoryGeneral = async(username) => {
    try{
        const response = await fetch(`http://localhost:8000/api/v1/GetChatSessionGeneral?username=${username}`,{
            method:"GET",
            headers: {"Content-Type":"application/json"},
        
        })
        const result = await response.json();
        return result;
    }
    catch
    {
        console.error("Cant get History");
    }

}

export const GetChatSessionDetail = async(session, user_id) => {
    if(session == 'defaultid') return null;
    try{
        const resposne = await fetch(`http://localhost:8000/api/v1/GetChatSessionDetail?session=${session}&user_id=${user_id}`,{
            method:'GET',
            headers: {"Content-Type":"application/json"}
        });
        const result = await resposne.json();
        return result;
    }
    catch{
        console.error("Cant get chat session");
        return null;
    }
}

export const CreateNewChatSession = async(user_id, topic) => {
    const payload = {
        user_id:user_id,
        topic:topic
    };
    try{
        const response = await fetch('http://localhost:8000/api/v1/CreateNewChatSession', {
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
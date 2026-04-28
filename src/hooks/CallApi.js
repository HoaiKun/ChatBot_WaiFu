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
export const GetChatResponse = async(chatHistory, chat_model, PersonaID = "Elysia") =>{
    const format = new FormData();
    format.append("chatHistory", JSON.stringify(chatHistory));
    format.append("chat_model",chat_model);
    const payload = {
        message: chatHistory,
        model : chat_model,
        PersonaID: PersonaID 
    }
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
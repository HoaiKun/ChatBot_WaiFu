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
export const GetChatResponse = async(chatHistory, chat_model) =>{
    const format = new FormData();
    format.append("chatHistory", JSON.stringify(chatHistory));
    format.append("chat_model",chat_model);
    const payload = {
        message: chatHistory,
        model : chat_model,
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
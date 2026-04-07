

const GetChatResponse = async(chatHistory, chat_model) =>{
    const payload = {
        message: chatHistory,
        model : chat_model
    }
    const response  = await fetch("http://localhost:8000/api/v1/GetChatResponse",
        {
           method:"POST", 
           headers: {"Content-Type":"application/json"},
           body: JSON.stringify(payload)
        }
    )
    if(!response.ok) throw new Error("Error getting chat done");
    return response.body.getReader();
}
export default GetChatResponse;
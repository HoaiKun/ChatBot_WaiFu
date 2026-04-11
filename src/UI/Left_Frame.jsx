import React, { useState } from  'react';
import ChatFrame from './ChatFrame';
import { GetChatResponse, GetSpeechResponse} from '../hooks/CallApi';
const ChatBox = () => {
    const [chatHistory, setChatHistory] = useState([]);
    const [userMessage, setUserMessage] = useState("");
    const [model, setModel] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const OnSubmitForm = async (e) => {
        e.preventDefault();
        if(!userMessage.trim() || isLoading)
        {
            return;
        }
        setIsLoading(true);
        const UserMessageObj =  {
            role: "user",
            content: userMessage
        }
        const AssistantMessageObj = {
            role: "assistant",
            content: ""
        }
        setUserMessage("");
        const HistoryToSend = [...chatHistory, UserMessageObj];
        setChatHistory((prev) => [...prev,UserMessageObj, AssistantMessageObj ]);
        let bottext = "";
        try{
            const reader = await GetChatResponse(HistoryToSend, "gpt-4o")
            const decoder = new TextDecoder();
            while(true){
                const {done, value} = await reader.read();
                if(done) break;
                const chunk = decoder.decode(value);
                if(chunk.startsWith("__EMOTION__:"))
                {
                    const emotion = chunk.replace("__EMOTION__:", "").trim();
                }
                else if(chunk.startsWith("__ANIMATION__:"))
                {
                    const animation = chunk.replace("__ANIMATION__","").trim();
                }
                else
                {
                    bottext += chunk;
                    setChatHistory(prev => {
                    const newHistory = [...prev];
                    const lastIndex = newHistory.length - 1;
                    newHistory[lastIndex] = {
                        ...newHistory[lastIndex],
                        content: newHistory[lastIndex].content + chunk
                    };
                    return newHistory;
                });
                }
            }
        }
        catch (err){
            setChatHistory(prev => [...prev, {role:"assistant", content:"ERROR"}]);
        }
        finally{
            setIsLoading(false);
        }
        
        const audio_url = await GetSpeechResponse(bottext)
        const audio = new Audio(audio_url);
        audio.play();
        audio.opened = () =>
        {
            URL.revokeObjectURL(audio_url);
        };
    }


    return(
        <div className=' mr-5 ml-5 w-1/2 h-full bg-gray-300 border-5 rounded-4xl border-white p-10 flex-col'>
            <h1 className = 'text-center text-6xl text-pink-500 font-bold w-full '>Your Waifu Chatbot is here~~</h1>
            <div className=' mt-10 space-y-6 h-[70dvh] overflow-auto'>
                {chatHistory.map((chatMessage, i) =>(
                    <ChatFrame key={i} role={chatMessage.role} message={chatMessage.content}></ChatFrame>
                ))}
            </div>
            <form className='align-bottom items-center' onSubmit={OnSubmitForm}>
                <div className = 'flex'>
                    <input placeholder='Type something my dear~~' value={userMessage} className = ' m-5 border-4 rounded-3xl border-white h-[5dvh] w-[80dvh]' onChange={(e) => setUserMessage(e.target.value)}></input>
                    <button disabled={isLoading} className='bg-blue-500 rounded-2xl h-[5dvh] w-[7dvh] m-5 ml-0'>LET GO</button>
                </div>
            </form>
        </div>
    )
}
export default ChatBox;
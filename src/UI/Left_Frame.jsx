import React, { useState, useRef } from  'react';
import ChatFrame from './ChatFrame';
import { GetChatResponse, GetSpeechResponse} from '../hooks/CallApi';


const ChatBox = () => {
    const [chatHistory, setChatHistory] = useState([]);
    const [userMessage, setUserMessage] = useState("");
    const [model, setModel] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    let audioQueue = useRef([]);
    let IsAudioPlaying = useRef(false);
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

        let sentence = "";
        const sentenceEndings = /[.!?\n。！？]/;

        
        const HistoryToSend = [...chatHistory, UserMessageObj];
        
        setChatHistory((prev) => [...prev,UserMessageObj, AssistantMessageObj ]);

        let bottext = "";

 
        
        const startTalking = async (text) => {

            if(IsAudioPlaying.current == true) return;
            IsAudioPlaying.current= true;
            while(audioQueue.current.length > 0)
            {
                const PotentialURL = audioQueue.current.shift();
                const url = await PotentialURL;
                await new Promise(resolve => {
                const audio = new Audio(url);
                audio.play().then(() => {
                console.log("Audio đang phát...");
                }).catch(err => {
                    console.error("Trình duyệt chặn phát hoặc lỗi file:", err);
                    resolve(); // Lỗi thì bỏ qua để phát câu sau
                });

                audio.onended = () => {
                    console.log("Phát xong 1 câu.");
                    resolve();
                };

            audio.onerror = () => {
                console.error("Lỗi tải file audio.");
                resolve();
            };
        });
                URL.revokeObjectURL(url);
                if (audioQueue.current.length > 0) {
                    const pause = 200 + Math.floor(Math.random() * 150);
                    await new Promise(res => setTimeout(res, pause));
                }
                
            }
            IsAudioPlaying.current = false;
    }


        try{
            const reader = await GetChatResponse(HistoryToSend, "gpt-4o")
            const decoder = new TextDecoder();
            while(true){
                const {done, value} = await reader.read();
                if(done) break;
                const chunk = decoder.decode(value);
                if(chunk.startsWith("__EMOTION__:"))
                {
                    let emotion = chunk.replace("__EMOTION__:", "").trim();
                }
                else if(chunk.startsWith("__ANIMATION__:"))
                {
                    let animation = chunk.replace("__ANIMATION__","").trim();
                }
                else
                {
                    sentence += chunk;
                    const end_sentence = sentence.match(sentenceEndings);
                    if(end_sentence)
                    {
                            const sentence_end_index = end_sentence.index;
                            const completedSetence = sentence.slice(0, sentence_end_index+1).trim();
                            sentence = sentence.slice(sentence_end_index+1);
                            if(completedSetence.length > 2)
                            {
                                console.log(completedSetence)
                                const speechPromise = GetSpeechResponse(completedSetence);
                                audioQueue.current.push(speechPromise);
                                startTalking();
                            
                                
                            }
                    }
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
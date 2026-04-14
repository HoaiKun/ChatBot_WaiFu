import React, { useState, useRef } from  'react';
import ChatFrame from './ChatFrame';
import { GetChatResponse, GetSpeechResponse} from '../hooks/CallApi';


const ChatBox = () => {
    const [chatHistory, setChatHistory] = useState([]);
    const [userMessage, setUserMessage] = useState("");
    const [IsBoxOpened, setIsBoxOpened] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [VoiceModel, setVoiceModel] = useState("No Voice");
    const VoiceList = [
        {id: "v0", name: "No Voice"},
        {id:"v1", name:"Elysia"},
        {id:"v2", name:"None"}
    ]
    let audioQueue = useRef([]);
    let IsAudioPlaying = useRef(false);


    let voice_url = "";

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
                    if(VoiceModel != "No Voice")
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
        <div className=' bg-transparent  w-full h-full border-5 rounded-4xl border-gray-600 p-10 focus:border-pink-300'>
            <div className=' mt-10 space-y-6 h-[75dvh] overflow-auto'>
                {chatHistory.map((chatMessage, i) =>(
                    <ChatFrame key={i} role={chatMessage.role} message={chatMessage.content}></ChatFrame>
                ))}
            </div>
            <div className='bg-gray-600 rounded-2xl '>
                <form className='align-bottom items-center' onSubmit={OnSubmitForm}>
                <div className = 'flex'>
                    <input placeholder='Type something my dear~~' value={userMessage} className = ' text-white focus:outline-none m-5 border-4 rounded-3xl border-white h-[5dvh] w-[80dvh]' onChange={(e) => setUserMessage(e.target.value)}></input>
                    <button disabled={isLoading} className='hover:bg-amber-400 transition-colors bg-blue-500 rounded-2xl h-[5dvh] w-[7dvh] m-5 ml-0'>LET GO</button>
                </div>
                </form>
                <div>
                    <button className='hover:bg-pink-500 transition-colors shadow-2xl m-2 ml-5 mt-0 p-2 bg-pink-200 w-[10dvh] rounded-2xl' onClick={() => setIsBoxOpened(!IsBoxOpened)}>{VoiceModel}</button>    
                    {IsBoxOpened && (
                        <ul className=' rounded-2xl absolute z-10 w-[10dvh] items-center max-h-60 bg-gray-900  overflow-auto'>
                            {
                                VoiceList.map((VoiceObj, i) => (
                                    <li  key = {i} className='relative p-2  bg-gray-600 text-white hover:bg-gray-800'  onClick={() => {setIsBoxOpened(!IsBoxOpened); setVoiceModel(VoiceObj.name)}}>{VoiceObj.name}</li>
                                ))
                            }
                        </ul>
                    )}
                </div>
            </div>
            
        </div>
    )
}
export default ChatBox; 
import React, { useState, useRef, useEffect } from  'react';
import ChatFrame from './ChatFrame';
import { GetChatResponse, GetImageGenerate, GetSpeechResponse } from '../hooks/CallApi';
import ConvertSpeechToText from './SpeechToText';

const ChatBox = () => {
    const [chatHistory, setChatHistory] = useState([]);
    const [userMessage, setUserMessage] = useState("");
    const [IsBoxOpened, setIsBoxOpened] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [VoiceModel, setVoiceModel] = useState("No Voice");
    const [OutlineColor, setOutlineColor] = useState("border-white");
    const [SelectedTools, SetSelectedTools] = useState("No Tools");
    const [OutlineRingColor, setOutlineRingColor] = useState("ring-white");
    const [PasteImage, setPasteImage] = useState("");
    const [ChatModel, setChatModel] = useState("gpt-4o");
    const [IsChatModelBoxOpened, setIsChatModelBoxOpened] = useState(false);
    let ImageGeneratedChosen = useRef(false);
    const [IsUITrasparent, setIsUITransparent] = useState(false);
    const [IsAttachFile, setIsAttachFile] = useState(false);
    const {SpeechText, IsListening, startListening, stopListening, setSpeechText} = ConvertSpeechToText();
    const [IsDragging, setIsDragging] = useState(false);
    let checkDragInBox = useRef(0);
    let SpeechQueue = useRef([]);
    let IsAudioQueueRunning = useRef(false);
    const handleFile = (e) =>{
        
        e.preventDefault();
    }
    const handleDragEnter = (e) => {

        e.preventDefault();
        e.stopPropagation();
        checkDragInBox.current++;
        if(checkDragInBox.current > 0)
        {
            setIsDragging(true);
        }
        
        
      
    }
    const handleDragLeave = (e) => {
         e.preventDefault();
         e.stopPropagation();
         checkDragInBox.current--;
        if(checkDragInBox.current==0)
        {
            setIsDragging(false);
        }
        

    }
    const handleDrop = () => {

    }
    const handleDragOver = (e) =>{
        e.preventDefault();
        e.stopPropagation();
    }
    const HandleTexareKedown = (e) =>
    {
        if(e.key =='Enter' && !e.shiftKey)
        {
            e.preventDefault();
            OnSubmitForm(e);
        }
    };

    useEffect(() => {

        setUserMessage(SpeechText);
        
    }, [SpeechText, IsListening]);


    const VoiceList = [
        {ID: 0, name: "No Voice"},
        {ID : 1, name:"Elysia"},
        {ID: 2, name:"None"}
    ];
    let audioQueue = useRef([]);
    let IsAudioPlaying = useRef(false);
    const [IsOptionalToolsSelected, setIsOptionalToolsSelected] = useState(false);
    let ToolsList = [
            {
                ID:0, Name: "No Tools"
            },
            {
                ID:1, Name: "Image Generate"
            },
            {
                ID:2, Name: "PENDING..."
            }
        ];
    let voice_url = "";

    let ChatModeList = [
        {
            ID:0, Name: "gpt-4o"
        },
        {
            ID:1, Name: "gpt-4o-mini"
        },
        {
            ID:2, Name: "gpt-5.4-mini"
        },

    ]
    const ResizeImage = (ImageBase64, maxWidth = 800) => {
        return new Promise((resolve) => 
        {
            const img = new Image();
            
            let NewWidth;
            let NewHeight;
            img.onload = () =>
            {
                NewWidth = img.width;
                NewHeight = img.height;
                if(NewWidth > maxWidth)
                {
                    NewHeight = (maxWidth/img.width) * img.height;
                    NewWidth = maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = NewWidth;
                canvas.height = NewHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, NewWidth, NewHeight);
                const resizeBase64 = canvas.toDataURL('image/jpeg',0.7);
                resolve(resizeBase64);
            }
            img.src = ImageBase64
            
            
            
        }
        
        )
    }
    const OnPasteEvent = async(e) => {
        const ClipboardItem = e.clipboardData.items;
        for(let i = 0; i < ClipboardItem.length; i++)
        {
            if(ClipboardItem[i].type.indexOf("image") != -1)
            {
                const blob = ClipboardItem[i].getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    setPasteImage(event.target.result);
                };
                reader.readAsDataURL(blob);
            }
        }
    }
    const OnSubmitForm = async (e) => {
        e.preventDefault();
        
        if(!userMessage.trim() || isLoading)
        {
            return;
        }
        setIsLoading(true);
        
        
        const sentenceEndings = /[.!?\n。！？]/;

        
        
        
         setUserMessage("");
         setPasteImage("");
         if (IsListening) stopListening();
        let bottext = "";


        
        const startTalking = async () => {

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
            let UserMessageObj =  {
            role: "user",
            content: userMessage
            }
            if(PasteImage != "" && PasteImage)
            {
                UserMessageObj = {
                    role: "user",
                    content: [
                        {type:"text", text: userMessage},
                        {type:"image_url", image_url:{url: await ResizeImage(PasteImage) } }
                    ]
                }
            }
            const AssistantMessageObj = {
                role: "assistant",
                content: ""
            }
            setChatHistory((prev) => [...prev,UserMessageObj]);

            const HistoryToSend = [...chatHistory, UserMessageObj].map(msg =>
            {
            if(typeof(msg.content) ==='string')
            {
                const safeContent = msg.content || "";
            
                if(safeContent.startsWith("__IMAGE__"))
                {
                    return {
                        ...msg,
                        content:"[System: successfully create and send a picture]"
                    }
                
                }
                else{
                    return msg;
                }
            }
                else return msg;
            
            }
            )
            let sentence = "";
            let speechBuffer = "";
            let ChosenTools = [];
            if(!ImageGeneratedChosen.current)
            {
                
               
                const reader = await GetChatResponse(HistoryToSend, ChatModel)
                const decoder = new TextDecoder();
                setChatHistory(prev => [...prev, AssistantMessageObj]);
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
                    else if(chunk.startsWith("__TOOLS__:"))
                    {
                        const Tool_Data = chunk.replace("__TOOLS__:","").trim();
                        try{
                            if(Tool_Data == "null") 
                            {

                            }
                            else
                            {
                                console.log("TOOL DATA THO " + Tool_Data);
                                const toolJson = JSON.parse(Tool_Data);
                                console.log(toolJson);
                                ChosenTools.push(toolJson);
                            }
                            
                        }
                        catch(err)
                        {
                            console.error("KO lay dc tool");
                        }
                        
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
                                    if(completedSetence.length > 0)
                                    {
                                        speechBuffer += completedSetence;

                                            if(speechBuffer.length >=30)
                                        {
                                            const speechPromise = GetSpeechResponse(speechBuffer.trim());
                                            audioQueue.current.push(speechPromise);
                                            startTalking();
                                            speechBuffer = "";
                                        }  
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
                if(speechBuffer.length >0)
                {
                    const speechPromise = GetSpeechResponse(speechBuffer);
                    audioQueue.current.push(speechPromise);
                    startTalking();
                    speechBuffer = "";
                }
                for(let i = 0; i < ChosenTools.length; i++)
                {
                    if(ChosenTools[i].name == "GenerateImage")
                    {
                        setOutlineRingColor("ring-green-200");
                        const Image_Result = await GetImageGenerate(ChosenTools[i].arguments);
                        setChatHistory(prev => [...prev, {role:"assistant", content: ResizeImage(Image_Result.content)}]);
                        setOutlineRingColor("ring-white");
                    }
                }
            }
            else
            {
                const Image_Result = await GetImageGenerate(userMessage);
                setChatHistory(prev => [...prev, {role:"assistant", content: ResizeImage(Image_Result.content)}]);
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
        <div className={` hover:bg-gray-500/60 ${IsUITrasparent ? 'hover:opacity-100 opacity-0' : 'opacity-100'} relative   transition-all  w-full h-full border-5 rounded-4xl bg-transparent transform-3d border-gray-600 p-5 hover:border-pink-300  ease-in-out`}>
            <div className=' mt-10 space-y-6 h-[75dvh] overflow-auto'>
                {chatHistory.map((chatMessage, i) =>(
                    <ChatFrame key={i} role={chatMessage.role} message={chatMessage.content}></ChatFrame>
                ))}
            </div>
            <div className='bg-gray-600 rounded-2xl h-auto z-10 shadow-2xl transition-all relative' onDragOver = {handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}>
                {IsDragging && (
                    <div className='absolute inset-0 z-50 bg-red-300/20 rounded-2xl'></div>
                )}
                <form className='align-bottom items-center mt-5' onSubmit={OnSubmitForm}>
                <div className={`h-auto ml-5 w-fit rounded-2xl relative`}>

                        <img src={`${PasteImage}`} className='max-h-15 w-auto'></img>
                        <button className='absolute top-1.5 right-1 bg-red-200 h-fit w-fit rounded-2xl hover:bg-red-500 font-bold rounded-1xl text-1x1 p-0' onClick={() => setPasteImage("")}>{PasteImage == "" ? '' : 'X'}</button>
                </div>
                <div className = 'flex'>
                    <textarea onKeyDown={HandleTexareKedown} placeholder='Type something my dear~~' value={userMessage}   className = {` overflow-auto ring-4 p-2 transition-colors text-white focus:outline-none m-5 mb-0 mt-4 border-4 rounded-2xl ${OutlineColor} ${OutlineRingColor} h-[5dvh] w-[80dvh]`}
                     onChange={(e) => setUserMessage(e.target.value)}
                     onPaste={OnPasteEvent}
                     onDragOver={(e) => e.preventDefault()}
                     >
                     </textarea>
                    <button disabled={isLoading} className='hover:bg-amber-400 transition-colors bg-blue-500 rounded-2xl h-[4dvh] w-[7dvh] m-5 ml-0 mt-6 font-bold'>LET GO</button>
                </div>
                </form>
                <div className='flex relative '>
                    <div className='bg-gray-200 w-fit h-fit rounded-3xl shadow-2xl ml-5 mt-2 hover:bg-blue-300 transition-colors' onClick={()=>setIsAttachFile(!IsAttachFile)}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        {IsAttachFile && (
                            <ul className=' rounded-2xl absolute z-10 w-[10dvh] items-center max-h-60 bg-gray-900  overflow-auto'>
                                <li  className='relative p-2  bg-gray-600 text-white hover:bg-gray-800'  onClick={() => {setIsAttachFile(!IsAttachFile);}}>Attach File</li>
                            </ul>
                        )}
                    </div>
                    <div>
                        <button className='hover:bg-pink-500 transition-colors shadow-2xl m-2 ml-5 mt-0 p-2 bg-pink-200 w-[10dvh] rounded-2xl' onClick={() => setIsBoxOpened(!IsBoxOpened)}>{VoiceModel}</button>    
                        {IsBoxOpened && (
                            <ul className=' rounded-2xl absolute z-10 w-[10dvh] items-center max-h-60 bg-gray-900  overflow-auto'>
                                {
                                    VoiceList.map((VoiceObj, i) => (
                                        <li key = {i} className='relative p-2  bg-gray-600 text-white hover:bg-gray-800'  onClick={() => {setIsBoxOpened(!IsBoxOpened); setVoiceModel(VoiceObj.name); VoiceObj.name != "No Voice" ?  setOutlineColor("border-pink-200") : setOutlineColor("border-white");}}>{VoiceObj.name}</li>
                                    ))
                                }
                            </ul>
                        )} 
                    </div>
                    <div>
                        <button className='hover:bg-green-500 transition-colors shadow-2xl m-2 ml-5 mt-0 p-2 bg-green-200 w-[10dvh] rounded-2xl' onClick={() => setIsOptionalToolsSelected(!IsOptionalToolsSelected)}>{SelectedTools}</button>   
                        { IsOptionalToolsSelected && (
                                <ul className=' rounded-2xl absolute z-10 w-[10dvh] items-center max-h-60 bg-gray-900  overflow-auto'>
                                    {
                                        ToolsList.map((tools, i) => (
                                            <li key = {i} className='relative p-2  bg-gray-600 text-white hover:bg-gray-800'  onClick={() => {
                                                setIsOptionalToolsSelected(!IsOptionalToolsSelected);
                                                SetSelectedTools(tools.Name);
                                                if(tools.ID != 0)   {setOutlineRingColor("ring-green-200") } else { setOutlineRingColor("ring-white")};
                                                if(tools.ID == 1) ImageGeneratedChosen.current = true; else ImageGeneratedChosen.current = false;
                                            }
                                            }>{tools.Name}</li>
                                        ))
                                    }
                                </ul>
                        )
                        }
                    </div>

                    <div>
                        <button className='hover:bg-purple-500 transition-colors shadow-2xl m-2 ml-5 mt-0 p-2 bg-purple-200 w-[10dvh] rounded-2xl' onClick={() => setIsUITransparent(!IsUITrasparent)}>{IsUITrasparent ? "Transparent": " No-Transparent"}</button>   
                    </div>
                    <div>
                        <button className='hover:bg-yellow-500 transition-colors shadow-2xl m-2 ml-5 mt-0 p-2 bg-yellow-200 w-[10dvh] rounded-2xl' onClick={() => setIsChatModelBoxOpened(!IsChatModelBoxOpened)}>{ChatModel}</button>   
                        {
                            IsChatModelBoxOpened &&
                            (
                                <ul className=' rounded-2xl absolute z-10 w-[10dvh] items-center max-h-60 bg-gray-900  overflow-auto'>
                                    {
                                        ChatModeList.map((tools, i) => (
                                            <li key = {i} className='relative p-2  bg-gray-600 text-white hover:bg-gray-800'  onClick={() => {setChatModel(tools.Name); setIsChatModelBoxOpened(!IsChatModelBoxOpened)}}>{tools.Name}</li>
                                        ))
                                    }
                             </ul>
                            )
                        }
                       
                    </div>
                    <div className='right-3 absolute'>
                         <button type="button" className={`${IsListening ? 'hover:bg-green-300' : 'hover:bg-red-300'} transition-colors shadow-2xl m-2 ml-5 mt-0 p-2 ${IsListening ? 'bg-green-500' : 'bg-red-500'} w-fit rounded-2xl` } 
                         onClick={ IsListening ? stopListening : startListening}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                            </svg>
                         </button>
                    </div>
                  
                </div>
            </div>
            
        </div>
    )
}
export default ChatBox; 
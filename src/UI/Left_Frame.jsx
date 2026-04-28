import React, { useState, useRef, useEffect } from  'react';
import ChatFrame from './ChatFrame';
import { GetChatResponse, PostDocResponse, GetImageGenerate, GetSpeechResponse, translateToNativeLanguage } from '../hooks/CallApi';
import ConvertSpeechToText from './SpeechToText';

const ChatBox = () => {
    const [chatHistory, setChatHistory] = useState([]);
    const [userMessage, setUserMessage] = useState("");
    const [IsBoxOpened, setIsBoxOpened] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [PersonaID, setPersonaID] = useState("Elysia")
    const [IsPersonaIDOpen, setIsPersonaIDOpen] = useState(false);
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
    const [AttachedFile, setAttachedFile] = useState(null);
    const [Thumbnail, setThumbnail] = useState("");
    const [ChatHandling, setChatHandling] = useState(false);
    const [defaultOutlineColor, setDefaultOutlineColor] = useState('')
    let checkDragInBox = useRef(0);
    let SpeechQueue = useRef([]);
    let IsAudioQueueRunning = useRef(false);
    let ChatBoxImageUrl= useRef("");
    const maxHistory = 20;
    const [ringVisible, setRingVisible] = useState(false);
    const PersonaSetting = [
        {ID: "Elysia"},
        {ID:"March th"},
        {ID: "Rin Tohsaka"},
        {ID: "Kafka"},
        {ID: "Evanescia"}
    ]
    const audioCtxRef = useRef(null);
    const analyserRef = useRef(null);
    const avatarRingRef = useRef(null);
    const IdleTimeRef = useRef(null);


    const startTalking = async () => {

        if(IsAudioPlaying.current == true) return;
        IsAudioPlaying.current= true;
        
        if(!audioCtxRef.current)
        {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtxRef.current = new AudioContext();
            analyserRef.current =  audioCtxRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            
        }
        
        while(audioQueue.current.length > 0)
        {
            
            const PotentialURL = audioQueue.current.shift();
            const url = await PotentialURL;
            await new Promise(resolve => {
            const audio = new Audio(url);
            audio.crossOrigin = "anonymous";
            const source = audioCtxRef.current.createMediaElementSource(audio);
            source.connect(analyserRef.current);
            analyserRef.current.connect(audioCtxRef.current.destination)
            

            
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            
            const updateSpeechVisualizer = () => {
                analyserRef.current.getByteFrequencyData(dataArray)
                if(!audio.paused && !audio.ended)
                {
                    let sum = 0;
                    for(let i = 0; i < dataArray.length; i++)
                    {
                        sum += dataArray[i];
                    }
                    const averageVolume = sum/dataArray.length;
                    if(avatarRingRef.current)
                    {
                        const glowRadius = averageVolume * 0.8;
                        const opacity = Math.min(averageVolume / 30, 1);
                        avatarRingRef.current.style.boxShadow = `0 0 ${glowRadius}px rgba(244, 114, 182, ${opacity})`;
                        avatarRingRef.current.style.borderColor = `rgba(244,114,182, ${opacity})`;
                    }
                    requestAnimationFrame(updateSpeechVisualizer);
                }
                else
                {
                    if (avatarRingRef.current) {
                        avatarRingRef.current.style.boxShadow = 'none';
                        avatarRingRef.current.style.borderColor = ''
                }
                }
            }

            audio.play().then(() => {
            updateSpeechVisualizer();
            console.log("Audio đang phát...");
            }).catch(err => {
                console.error("Trình duyệt chặn phát hoặc lỗi file:", err);
                resolve(); 
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


    const resetIdleTimer = () => {
        const min = 300000;
        if(IdleTimeRef.current){
            clearTimeout(IdleTimeRef.current);
        }
        IdleTimeRef.current = setTimeout(() =>
        {
            triggerProactiveChat();

        }, Math.floor(Math.random() * 300000) + min);    
    };
    const HandleChatFrame = async (chatHistory, chatModel, persona) =>{
        let sentence = "";
        let speechBuffer = "";
        const sentenceEndings = /[.!?\n。！？]/;
        const HistoryToSend = chatHistory;
        const fChatModel = ChatModel;
        const fPersonaID = PersonaID;
        let AssistantMessageObj = {
                role: "assistant",
                content: "",
                translation: ""
        };
        const reader = await GetChatResponse(HistoryToSend, fChatModel, fPersonaID);
            const decoder = new TextDecoder();
            setChatHistory(prev => [...prev, AssistantMessageObj]);
            let translationArray= [];
            let translationCount = 0;
            while(true){
                const {done, value} = await reader.read();
                if(done) break;
                const chunk = decoder.decode(value);
                {    
                    
                    
                    setChatHistory(prev => {
                    const newHistory = [...prev];
                    const lastIndex = newHistory.length - 1;
                    newHistory[lastIndex] = {
                        ...newHistory[lastIndex],
                        content: newHistory[lastIndex].content + chunk,
                        translation: newHistory[lastIndex].translation
                    };
                    return newHistory;
                    });

                    sentence += chunk;
                    const end_sentence = sentence.match(sentenceEndings);
                    if(end_sentence)
                    {
                        const sentence_end_index = end_sentence.index;
                        const rawSengment = sentence.slice(0, sentence_end_index+1);
                        console.log(rawSengment)
                        const completedSetence = rawSengment;
                        const needsNewline = rawSengment.includes('\n');
                        sentence = sentence.slice(sentence_end_index+1);
                        if(completedSetence.length > 0)
                        {
                                const CurrentIndex = translationCount++;
                                translateToNativeLanguage(completedSetence).then(translatedText => {
                                    if(translatedText)
                                    {
                                        const lastChar = rawSengment.charAt(rawSengment.length-1);
                                        const suffix = (lastChar === '\n') ? '\n' : (lastChar===' ' ? ' ' : '');
                                        translationArray[CurrentIndex] = translatedText+ " " +suffix;
                                        const orderedTranslation = translationArray.join("");
                                        setChatHistory(prev => {
                                        const newHistory = [...prev];
                                        const lastIndex = newHistory.length - 1;
                                        const oldTranslation = newHistory[lastIndex].translation;
                                        newHistory[lastIndex] = {
                                            ...newHistory[lastIndex],
                                            content: newHistory[lastIndex].content,
                                            translation: orderedTranslation
                                        };
                                        return newHistory;
                                        });
                                    }
                                });
                                
                                if(VoiceModel.name != "No Voice" && !chunk.startsWith("__IMAGE__:"))
                                {
                                    speechBuffer += completedSetence;
                                    if(speechBuffer.length >=30)
                                    {
                                        const speechPromise = GetSpeechResponse(speechBuffer.trim(), VoiceModel.Url);
                                        audioQueue.current.push(speechPromise);
                                        startTalking();
                                        speechBuffer = "";
                                    }  
                                }
                        }
                        
                    }
                } 
            }
            if(speechBuffer.length >0)
            {
                const speechPromise = GetSpeechResponse(speechBuffer);
                audioQueue.current.push(speechPromise);
                startTalking();
                speechBuffer = "";
            }
    }

    const triggerProactiveChat = async() => {
        if(isLoading || IsAudioPlaying.current){
            return;
        }
        const proactivePrompt = "[SYSTEM TRIGGER: Say something to arouse user intererts";
        let UserMessageObj = {
            role:"user",
            content:proactivePrompt,
            translation:""

        };
        const HistoryToSend = [...chatHistory, UserMessageObj].slice(-maxHistory).map(msg => {
            let safeContent = msg.content;

            // Xử lý rút gọn nếu nội dung là chuỗi (chứa ảnh Base64 hoặc tag __IMAGE__)
            if (typeof(safeContent) === 'string') {
                const isBase64 = safeContent.startsWith("data:") && safeContent.includes(";base64,");
                
                // Đã sửa lại vị trí dấu ngoặc và dùng toán tử || (HOẶC)
                if (safeContent.startsWith("__IMAGE__:") || isBase64) {
                    safeContent = "[System: successfully create and send a picture]";
                }
            }
            return {
                role: msg.role,
                content: safeContent
        };
        });
        await HandleChatFrame(HistoryToSend,ChatModel, PersonaID);
    };


    useEffect(() => {
        resetIdleTimer();
        return () => clearTimeout(IdleTimeRef.current);
    }, [chatHistory]);

    useEffect(()=>
    {
        let interval;
        if(isLoading){
            interval = setInterval(() => {
                setRingVisible(prev => !prev)
            }, 500);
            }
        else
        {
            setRingVisible(false)
        }
        return () => clearInterval(interval);
    },[isLoading]);  
    const [previewUrl, setPreviewUrl] = useState("");
    const getBase64FromUrl =(file) => {
        return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file); // Bắt đầu đọc file dưới dạng Base64
        reader.onload = () => resolve(reader.result); // Thành công thì trả về chuỗi
        reader.onerror = (error) => reject(error); // Thất bại thì báo lỗi
        });
    }
    let IsUsetool = useRef(false);
    useEffect(() => {
    if (!AttachedFile) {
        setPreviewUrl("");
        return;
    }

    let url = "";
    if (AttachedFile.type.startsWith('image/')) {
        // Nếu là ảnh, tạo URL ảo
        url = URL.createObjectURL(AttachedFile);
    } else if (AttachedFile.type === 'application/pdf') {
        url = "https://cdn-icons-png.flaticon.com/512/337/337946.png";
    } else if (AttachedFile.type.includes('word')) {
        url = "https://cdn-icons-png.flaticon.com/512/337/337948.png";
    } else {
        url = "https://cdn-icons-png.flaticon.com/512/1091/1091916.png";
    }

    setPreviewUrl(url);

    // Cleanup: Xóa URL cũ khỏi RAM khi file thay đổi hoặc component đóng
    return () => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    };
    }, [AttachedFile]);
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
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const droppedfile = e.dataTransfer.files[0];
        if(!droppedfile) return;
        setIsAttachFile(false);
        setAttachedFile(droppedfile);

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
        {ID: 0, name: "No Voice", Url : ""},
        {ID : 1, name:"Elysia", Url : "679de93ad4634728900347063142e930"},
        {ID: 2, name:"Sarah",Url : "933563129e564b19a115bedd57b7406a"},
        {ID: 3, name:"E-Girl", Url:"98655a12fa944e26b274c535e5e03842"},
        {ID: 4, name:"E-maid", Url:"7bcd8078cfbc496cb50bf8d8ef137df4"}
    ];

    const [VoiceModel, setVoiceModel] = useState(VoiceList[0]);

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
            if(ClipboardItem[i].kind === 'file')
            {
                const file = ClipboardItem[i].getAsFile();
                if(!file) continue;
                const file_type = file.type;
                if (file_type.startsWith('image/') ||
                file_type === 'application/pdf' ||
                file_type.includes('word')||
                file_type.includes('officedocument'))
                {
                    setAttachedFile(file);
                }
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
        
        setOutlineColor("ring-green-500");
       
        setUserMessage("");
        setPasteImage("");
        if (IsListening) stopListening();
        let bottext = "";


        
        

        
        try{
            let UserMessageObj =  {
            role: "user",
            content: userMessage,
            translation:""
            }
            if(AttachedFile)
            {
                let resizeImageBase64OrUrl = "";
                if(AttachedFile.type.startsWith('image/'))
                {
                    const base64Raw = await getBase64FromUrl(AttachedFile);
                    resizeImageBase64OrUrl= await(ResizeImage(base64Raw));
                    UserMessageObj = {
                    role: "user",
                    content: [
                        {type:"text", text: userMessage},
                        {type:"image_url", image_url:{url: resizeImageBase64OrUrl } }
                    ],
                    };
                }
                else
                {
                    const PdfMessage = {
                        role: "user",
                        content: AttachedFile.name
                    }
                    setChatHistory((prev) => [...prev,PdfMessage]);
                }
            }
           
            let AssistantMessageObj = {
                role: "assistant",
                content: "",
                translation: ""
            }


            setChatHistory((prev) => [...prev,UserMessageObj]);

            const HistoryToSend = [...chatHistory, UserMessageObj].slice(-maxHistory).map(msg => {
            let safeContent = msg.content;

            // Xử lý rút gọn nếu nội dung là chuỗi (chứa ảnh Base64 hoặc tag __IMAGE__)
            if (typeof(safeContent) === 'string') {
                const isBase64 = safeContent.startsWith("data:") && safeContent.includes(";base64,");
                
                // Đã sửa lại vị trí dấu ngoặc và dùng toán tử || (HOẶC)
                if (safeContent.startsWith("__IMAGE__:") || isBase64) {
                    safeContent = "[System: successfully create and send a picture]";
                }
            }

           
            return {
                role: msg.role,
                content: safeContent
            };
            });   
            
            
            let ChosenTools = [];
            let file_format = new FormData();
            file_format.append("file", AttachedFile);
            if(AttachedFile && file_format)
            {
                setAttachedFile(null);
                setOutlineRingColor("ring-green-200");   
                await PostDocResponse(file_format);
                setOutlineRingColor("ring-white");
            }
            
            await HandleChatFrame(HistoryToSend, ChatModel, PersonaID);
        }
        
        catch (err){
            setChatHistory(prev => [...prev, {role:"assistant", content:"ERROR"}]);
        }
        finally{
            setIsLoading(false);
        }
        setOutlineColor("ring-white");
        setIsLoading(false);
    }
    return(
        <div ref={avatarRingRef} className={` hover:bg-gray-500/60 ${IsUITrasparent ? 'hover:opacity-100 opacity-0' : 'opacity-100'} hover:border-gray-300 border-gray-600  relative mt-5 p-2 pb-30 transition-colors   w-full h-full border-5 rounded-4xl bg-transparent transform-3d   ease-in-out`}>
            <div className=' mt-10 space-y-6 h-[80dvh] overflow-auto '>
                {chatHistory.map((chatMessage, i) =>(
                    <ChatFrame key={i} role={chatMessage.role} message={chatMessage.content} translate={chatMessage.translation}></ChatFrame>
                ))}
            </div>
             <div className='absolute z-10 bottom-2 w-[95%] left-1/2 -translate-x-1/2 '>
                <div className='bg-gray-600 rounded-2xl h-auto z-10 shadow-2xl transition-all relative ' onDragOver = {handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                {IsDragging && (
                    <div className='absolute inset-0 z-50 bg-red-300/20 rounded-2xl pointer-events-none'></div>
                )}
                <form className='align-bottom items-center mt-5' onSubmit={OnSubmitForm}>
                <div className={`h-fit ml-5 w-fit rounded-2xl relative`}>
                    {AttachedFile && (
                        <div className='w-fit h-fit shadow-2xs relative'>
                            <img src = {previewUrl} className='w-16 h-16 object-fill'></img>
                            <span className = 'absolute text-[10px] bottom-0 left-0'>{AttachedFile.type.startsWith('image/') ? "" : AttachedFile.name}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 absolute bg-red-200 rounded-3xl  top-0 right-0 hover:bg-red-400 shadow-2xl transition-all" onClick={() => setAttachedFile(!AttachedFile)}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </div>
                    )}
                </div>
                <div className = 'flex'>
                    <textarea onKeyDown={HandleTexareKedown} placeholder='Type something my dear~~' value={userMessage}   className = {` overflow-auto ring-4 p-2 transition-all text-white focus:outline-none m-5 mb-0 mt-4 border-4 rounded-2xl 
                    ${OutlineColor}
                    ${isLoading ? (ringVisible ? 'ring-green-500' : 'ring-green-500/0') : 'ring-green-500/0'}
                     h-[5dvh] w-[80dvh]`}
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
                        <button className='hover:bg-pink-500 transition-colors shadow-2xl m-2 ml-5 mt-0 p-2 bg-pink-200 w-[10dvh] rounded-2xl' onClick={() => setIsBoxOpened(!IsBoxOpened)}>{VoiceModel.name}</button>    
                        {IsBoxOpened && (
                            <ul className=' rounded-2xl absolute z-10 w-[10dvh] items-center max-h-60 bg-gray-900  overflow-auto'>
                                {
                                    VoiceList.map((VoiceObj, i) => (
                                        <li key = {i} className='relative p-2  bg-gray-600 text-white hover:bg-gray-800'  onClick={() => {setIsBoxOpened(!IsBoxOpened); setVoiceModel(VoiceObj); VoiceObj.name != "No Voice" ?  setOutlineColor("border-pink-200") : setOutlineColor("border-white");}}>{VoiceObj.name}</li>
                                    ))
                                }
                            </ul>
                        )} 
                    </div>
                     <div>
                        <button className='hover:bg-pink-500 transition-colors shadow-2xl m-2 ml-5 mt-0 p-2 bg-pink-200 w-[10dvh] rounded-2xl' onClick={() => setIsPersonaIDOpen(!IsPersonaIDOpen)}>{PersonaID}</button>   
                        {
                            IsPersonaIDOpen &&
                            (
                                <ul className=' rounded-2xl absolute z-10 w-[10dvh] items-center max-h-60 bg-gray-900  overflow-auto'>
                                    {
                                        PersonaSetting.map((persona, i) => (
                                            <li key = {i} className='relative p-2  bg-gray-600 text-white hover:bg-gray-800'  onClick={() => {setPersonaID(persona.ID); setIsPersonaIDOpen(!IsPersonaIDOpen)}}>{persona.ID}</li>
                                        ))
                                    }
                             </ul>
                            )
                        }
                   
                        
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
            
        </div>
    )
}
export default ChatBox;
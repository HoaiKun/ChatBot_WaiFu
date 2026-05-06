import React, { useState, useRef, useEffect } from  'react';
import { GetChatHistoryGeneral ,CreateNewChatSession, DeleteSection} from '../hooks/CallApi';
import { pass } from 'three/src/nodes/display/PassNode.js';
import { useContext } from 'react';
import { ChatContext } from './ChatContext';
import { Sessions } from 'openai/resources/beta/realtime/sessions.js';
const SidePanel = () => {

    const [HistoryGeneral, setHistoryGeneral] = useState([{session: "123" , topic: "General1"}, {session:"123" , topic: "General1"},{session:"123" , topic: "General1"}]);
    const UserName = "hust_coder"; 
    const {chatHistory, setChatHistory} = useContext(ChatContext);
    const {ChatSession, setChatSession} = useContext(ChatContext);
    const {isLoading, setIsLoading} = useContext(ChatContext);
    let HistoryTopicList;
    const initHistory = async(username) => {
            HistoryTopicList = await GetChatHistoryGeneral(username);
            if(HistoryTopicList)
            {
                console.log(HistoryTopicList);
                setHistoryGeneral(HistoryTopicList);
                
            }
            else
            {
                setHistoryGeneral([{session: 'error', topic: 'error'}]);
            }
        };
    useEffect(() => {
        initHistory(UserName);
    }, [ChatSession]);
    
    const CreateNewChat = async() => {
        if(isLoading) return;
        setChatSession({session_id:"defaultid", topic:''});
    }

    const DeleteSectionFromPanel = async (session_id, user_id) => {
        if(isLoading) return;
        if(session_id == ChatSession.session_id) 
        {   
            setChatSession({session_id:"defaultid", topic:''});
        }
        await DeleteSection(session_id, user_id);
        await initHistory(UserName);
    }
    return <div>
        <div className="bg-gray-900/70 w-1/3 h-screen relative gap-1 overflow-auto">
            <button className='bg-gray-300 w-full hover:bg-pink-300 transition-all rounded-l-2xl text-orange-600 p-1 pl-2.5 text-2xl' onClick={() => CreateNewChat()}>Create new chat</button>
            <h1 className='text-2xl bg-gray-900 rounded-l-2xl text-white p-1 pl-2.5 hover:bg-gray-500 transition-all'>USER</h1>
            <div>
                <h1 className='text-2xl bg-gray-400 rounded-l-2xl text-white p-1 pl-2.5  transition-all'>Chat History</h1>
                <ul className='overflow-auto'>
                    {
                        HistoryGeneral.map((topic, i) => (
                            <div key={i} className={`flex p-1 ${topic.session_id == ChatSession.session_id ? 'bg-gray-400' : 'bg-transparent'} rounded-l-2xl text-xl hover:bg-gray-400 text-white transition-all`} >
                                <li  className='w-[50dvh]'
                                onClick={() => {setChatSession(topic)}}>{topic.topic}</li>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6" className='w-[5dvh] h-fit rounded-4xl bg-red-300 hover:bg-red-500' 
                                onClick={() => DeleteSectionFromPanel(topic.session_id, topic.user_id)}>
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>

                            </div>
                             
                        ))
                    }
                </ul>
            </div>
        </div>
    </div>
}

export default SidePanel;
import React, { useState, useRef, useEffect } from  'react';
import { GetChatHistoryGeneral ,CreateNewChatSession, DeleteSection} from '../hooks/CallApi';
import { pass } from 'three/src/nodes/display/PassNode.js';
import { useContext } from 'react';
import { ChatContext } from './ChatContext';
import { Sessions } from 'openai/resources/beta/realtime/sessions.js';
import { useAuth } from './AuthContext';
const SidePanel = () => {

    const [HistoryGeneral, setHistoryGeneral] = useState([]);
    const {chatHistory, setChatHistory} = useContext(ChatContext);
    const {ChatSession, setChatSession} = useContext(ChatContext);
    const {isLoading, setIsLoading} = useContext(ChatContext);
    const {token, user,logout} = useAuth();
    let HistoryTopicList;
    const initHistory = async() => {
            HistoryTopicList = await GetChatHistoryGeneral();
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
        initHistory();
    }, [ChatSession]);
    
    const CreateNewChat = async() => {
        if(isLoading) return;
        setChatSession({session_id:"defaultid", topic:''});
    }

    const DeleteSectionFromPanel = async (session_id) => {
        if(isLoading) return;
        if(session_id == ChatSession.session_id) 
        {   
            setChatSession({session_id:"defaultid", topic:''});
        }
        await DeleteSection(session_id);
        await initHistory();
    }
    return <div>
        <div className="bg-gray-900/70 w-1/3 h-screen relative gap-1 overflow-auto">
            <button className='bg-gray-300 w-full hover:bg-pink-300 transition-all rounded-l-2xl text-orange-600 p-1 pl-2.5 text-2xl' onClick={() => CreateNewChat()}>Create new chat</button>
            <div className='flex'>
                <h1 className='text-2xl bg-gray-900 rounded-l-2xl w-full text-white p-1 pl-2.5  transition-all'>{user}</h1>
                <button className='bg-red-400 hover:bg-red-500 transition-all' onClick={() => logout()}>LOG-OUT</button>
            </div>
            
            <div>
                <h1 className='text-2xl bg-gray-500 rounded-l-2xl text-white p-1 pl-2.5  transition-all'>Chat History</h1>
                <ul className='overflow-auto'>
                    {
                        HistoryGeneral.map((topic, i) => (
                            <div key={i} className={`flex p-1 ${topic.session_id == ChatSession.session_id ? 'bg-blue-400' : 'bg-transparent'} rounded-l-2xl text-xl flex flex-row items-center hover:bg-blue-400 text-white transition-all`} >
                                <li  className='w-[50dvh]'
                                onClick={() => {setChatSession(topic)}}>{topic.topic}</li>
                                <svg  onClick={() => DeleteSectionFromPanel(topic.session_id)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                                className='fill-red-300 hover:fill-red-500 size-18 h-fit'>
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
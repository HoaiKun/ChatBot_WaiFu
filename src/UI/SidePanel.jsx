import React, { useState, useRef, useEffect } from  'react';
import { GetChatHistoryGeneral ,CreateNewChatSession} from '../hooks/CallApi';
import { pass } from 'three/src/nodes/display/PassNode.js';
import { useContext } from 'react';
import { ChatContext } from './ChatContext';
import { Sessions } from 'openai/resources/beta/realtime/sessions.js';
const SidePanel = () => {

    const [HistoryGeneral, setHistoryGeneral] = useState([{session: "123" , topic: "General1"}, {session:"123" , topic: "General1"},{session:"123" , topic: "General1"}]);
    const UserName = "hust_coder"; 
    const {chatHistory, setChatHistory} = useContext(ChatContext);
    const {ChatSession, setChatSession} = useContext(ChatContext)
    let HistoryTopicList;
    useEffect(() => {
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
        initHistory(UserName)
    }, []);
    
    const CreateNewChat = async() => {
        setChatHistory([]);
        setChatSession([{session:"defaultid", topic:''}]);
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
                             <li key={i} className={`p-1 bg-gray-600 text-xl hover:bg-gray-400 text-white transition-all`} onClick={() => {setChatSession(topic)}}>{topic.topic}</li>
                        ))
                    }
                </ul>
            </div>
        </div>
    </div>
}

export default SidePanel;
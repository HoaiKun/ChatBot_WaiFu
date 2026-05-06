import { createContext, useState } from "react";

export const ChatContext = createContext();

export const ChatProvider = ({children}) => {
    const [ChatSession, setChatSession] = useState({session_id:'defaultid' , topic:''});
    const [chatHistory, setChatHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [user_id, setUserId] = useState('');
    return (
        <ChatContext.Provider value={{ChatSession, setChatSession, chatHistory, setChatHistory, user_id, setUserId,isLoading, setIsLoading}}>
            {children}
        </ChatContext.Provider>
    )
}
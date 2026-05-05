import { createContext, useState } from "react";

export const ChatContext = createContext();

export const ChatProvider = ({children}) => {
    const [ChatSession, setChatSession] = useState({session_id:'defaultid' , topic:''});
    const [chatHistory, setChatHistory] = useState([]);
    return (
        <ChatContext.Provider value={{ChatSession, setChatSession, chatHistory, setChatHistory}}>
            {children}
        </ChatContext.Provider>
    )
}
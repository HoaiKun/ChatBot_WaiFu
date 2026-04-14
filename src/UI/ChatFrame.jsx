import React, { useState } from  'react';

const ChatFrame = ({frame_id,role,message}) =>{
    const isUser = (role == 'user');
    return (
        <div className={`m-5 pt-2 pb-2 pl-2 pr-2 max-w-[75%] w-fit h-fit p-5px flex-col border-black rounded-2xl 
        ${isUser ? 'ml-auto' : 'mr-auto'}
        `}>
            <p1 className='p-2 text-white'>{message}</p1>
        </div>
    )
}
export default ChatFrame;
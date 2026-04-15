import React, { useState } from  'react';

const ChatFrame = ({frame_id,role,message}) =>{
    const isUser = (role == 'user');
    let isImage = false;
    let image_url = "";
    let content = "";
    if(typeof(message) ==='string')
    {
        isImage = (message.startsWith('__IMAGE__'));
        if(isImage)
        {
            image_url = message.replace("__IMAGE__","");
        }
        else content = message;
    }
    else if(Array.isArray(message))
    {
        content = message.filter(item => item.type ==='text')
            .map(item => item.text)
            .join(" ");
        const imageObj = message.find(item => item.type === 'image_url');
        if (imageObj) {
            image_url = imageObj.image_url?.url;
            isImage = true;
        }
    }
    return (
        <div className={`m-2 pt-2 pb-2 pl-2 pr-2 max-w-[75%] w-fit h-fit p-5px flex-col bg-black/50 hover:bg-black border-black rounded-2xl 
        ${isUser ? 'ml-auto' : 'mr-auto'}
        `}>
            {isImage ?
            (
                <div>
                <img src={image_url}
                alt = {image_url}></img>
                 <p className='p-1 text-[1.5dvh] text-white'>{content}</p>
                </div>
            )
            :
            (
                 <p className='p-1 text-[1.5dvh] text-white'>{content}</p>
            )
        }
           
        </div>
    )
}
export default ChatFrame;

import { useState, useRef, useContext } from 'react'
import WaifuFace from './Right_Frame'
import SidePanel from './SidePanel'
import { ChatProvider } from './ChatContext'
import { useAuth } from './AuthContext'
import ChatBox from './Left_Frame'
const UserUI = () => {
    return (
    <div className=" relative flex h-screen w-screen bg-pink-200">
        <div className='relative z-20 w-1/3'>
            <SidePanel className= 'w-fit h-full'></SidePanel>
        </div>
        <div className = 'relative z-10 w-5xl h-fit'>
            <ChatBox className= ''></ChatBox>
        </div>
    </div>
    )
}
export default UserUI;
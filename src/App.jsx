import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import { Chat } from 'openai/resources.js'
import ChatBox from './UI/Left_Frame'
import WaifuFace from './UI/Right_Frame'
import SidePanel from './UI/SidePanel'
import { ChatProvider } from './UI/ChatContext'
function App() {
  const [count, setCount] = useState(0)

  return (
    <div className=" relative flex h-screen w-screen bg-pink-200">
      <ChatProvider>
          <div className='relative z-20 w-1/3'>
            <SidePanel className= 'w-fit h-full'></SidePanel>
          </div>

          <div className = 'relative z-10 w-5xl h-fit'>
            <ChatBox ></ChatBox>
          </div>
      </ChatProvider>
      
    </div>
      
  )
}

export default App;

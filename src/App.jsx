import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import { Chat } from 'openai/resources.js'
import ChatBox from './UI/Left_Frame'
import WaifuFace from './UI/Right_Frame'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className=" relative flex flex-col items-center h-screen w-full bg-pink-200">
      
      <div className = 'absolute inset-0 z-0'>
      <WaifuFace ></WaifuFace>
      </div>
      <div className = 'relative z-10 m-5 w-1/2'v>
        <ChatBox ></ChatBox>
      </div>
      
    </div>
      
  )
}

export default App;

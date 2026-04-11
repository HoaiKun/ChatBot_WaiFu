import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import ChatBox from './UI/Left_Frame'
import { Chat } from 'openai/resources.js'
import WaifuFace from './UI/Right_Frame'
function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex h-screen w-full bg-pink-200">
      <ChatBox></ChatBox>
      <WaifuFace></WaifuFace>
    </div>
      
  )
}

export default App;

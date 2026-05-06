import { useState, useContext } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import UserUI from './UI/UserUI'
import { AuthProvider } from './UI/AuthContext'
import { ChatProvider } from './UI/ChatContext'
import MainFlow from './UI/MainFlow'
function App() {
  const [count, setCount] = useState(0)
  
  return (
    <div className=" relative flex h-screen w-screen bg-pink-200">
      <AuthProvider>
        <ChatProvider>
          <MainFlow></MainFlow>
        </ChatProvider>
      </AuthProvider>
    </div>
      
  )
}

export default App;

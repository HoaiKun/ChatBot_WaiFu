import { useState, useContext, useRef } from "react";
import { useAuth } from "./AuthContext";
import { SignUp, LogIn } from "../hooks/CallApi";
import { Stats } from "@react-three/drei";
const LoginScreen = () => {

    const {user, token, setToken, login, logout} = useAuth();
    const UserCurrentData = useRef(null);
    const [IsSignUp, setIsSignUp] = useState(false);
    const [StateMessage, setStateMessage] = useState('');
    const [UserLoginData, setUserLoginData] = useState({
        username:'',
        password:'',
        email:''
    })

    const handleChange = (e) => {
        const {name, value} = e.target;
        setUserLoginData(
            {
                ...UserLoginData,
                [name]:value
            }
        );
    };

    const handleSubmitForm = (e) => {
        e.preventDefault();
        
    }

    const handleSignUp = async() =>{
       
        
        const status = await SignUp(UserLoginData.username, UserLoginData.password, UserLoginData.email);
        setUserLoginData({
        username:'',
        password:'',
        email:''
        });
        let status_value = status?.status;
        console.log(status);
        if(status_value)
        {
            if(status_value == 'success'){
                setStateMessage('Done Created User')
            }
        }
        UserCurrentData.current = null;
    }
    
    const handleLogIn = async() => {
        
        
        const status = await LogIn(UserLoginData.username, UserLoginData.password);
        setUserLoginData({
        username:'',
        password:'',
        email:''
        });
        console.log(status);
        login(status);
        UserCurrentData.current = null;
    }
    
    return(
        <div className="w-screen h-screen flex items-center">
            <div className="bg-gray-600 flex items-center transition-all hover:bg-gray-800 w-[75dvh] h-[40dvh] shadow-2xl rounded-2xl m-auto">
                <form className="h-1/2 w-full m-auto " onSubmit={handleSubmitForm}>
                <div className="flex flex-col items-center pt-[3dvh]">
                    <div className="flex w-2/3 h-[5dvh] flex-row items-center ">
                        <h1 className=" w-[15dvh] text-3xl font-bold text-white mr-[1dvh]">USERNAME</h1>
                        <input onChange={handleChange} value={UserLoginData.username} name="username" type="text" 
                        className="w-2/3 h-2/3 p-2  t-[1.5dvh] bg-white text-black focus:outline-none
                        rounded-2xl shadow-2xl"></input>
                    </div>
                    <div className="flex w-2/3 h-[5dvh] flex-row items-center ">
                        <h1 className="text-3xl w-[15dvh] font-bold text-white mr-[1dvh]">PASSWORD</h1>
                        <input onChange={handleChange} value={UserLoginData.password} name="password" type="password" 
                        className="w-2/3 h-2/3 p-2 t-[1.5dvh] bg-white text-black focus:outline-none
                        rounded-2xl shadow-2xl"></input>
                    </div>
                    {
                        IsSignUp &&
                        (<div className="flex w-2/3 h-[5dvh] flex-row items-center ">
                            <h1 className="text-3xl w-[15dvh] font-bold text-white mr-[1dvh]">EMAIL</h1>
                            <input onChange={handleChange} value={UserLoginData.email} name="email" type="email" 
                            className="w-2/3 h-2/3 p-2 t-[1.5dvh] bg-white text-black focus:outline-none
                            rounded-2xl shadow-2xl"></input>
                        </div>)
                    }
                    <div>
                        {
                            !IsSignUp ?
                            <div >
                            <button onClick={() => {handleLogIn(); setStateMessage('');} } className="m-[1dvh] transition-all rounded-2xl shadow-2xl hover:bg-blue-600 text-[2dvh] w-[10dvh] h-[4dvh] bg-blue-400">LOGIN</button>
                            <button className="m-[1dvh] transition-all rounded-2xl shadow-2xl hover:bg-yellow-600 text-[2dvh] w-[10dvh] h-[4dvh] bg-yellow-400"
                            onClick={() => {setIsSignUp(true); setStateMessage('');}}>SIGN UP</button>
                            </div>
                            :
                            <div>
                            <button onClick={() => {handleSignUp(); setStateMessage('');} } className="m-[1dvh] transition-all rounded-2xl shadow-2xl hover:bg-green-600 text-[2dvh] w-[10dvh] h-[4dvh] bg-green-400">SIGN UP</button>
                            <button className="m-[1dvh] transition-all rounded-2xl shadow-2xl hover:bg-red-600 text-[2dvh] w-[10dvh] h-[4dvh] bg-red-400"
                            onClick={() => {setIsSignUp(false); setStateMessage('');}}>CANCEL</button>
                            </div>
                        }
                    </div>
                    
                    <p className="text-white text-1xl mt-[1dvh]">{StateMessage}</p>
                </div>
                </form>
            </div>
        </div>
    )
};
export default LoginScreen;   
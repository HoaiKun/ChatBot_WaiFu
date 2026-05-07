import { useState, useRef, useContext, useEffect } from 'react'
import UserUI from "./UserUI"
import LoginScreen from "./LoginScreen";
import api from '../hooks/api';
import { useAuth } from "./AuthContext";




const MainFlow = () => {

    

    let {user, token, setToken, login, logout} = useAuth();
    const [IsChecking, setIsChecking] = useState(true);

    useEffect(() => {
        if(!token) return;
        const heartBeat = setInterval(() => {
            api.get('/check-auth').catch(() => {});
        },14*60*1000);
        return () => clearInterval(heartBeat);
    }, [token]);

    useEffect(() => {
        const verifyToken = async() =>{
            const savedToken = localStorage.getItem('waifu_token');

            try{
                const res = await api.get('/GetChatSessionGeneral');

                setToken(localStorage.getItem('waifu_token'));
            } catch (err)
            {
                console.log('Login session ended');
                setToken(null);
                localStorage.removeItem('waifu_token');
            }
            finally
            {
                setIsChecking(false);
            }
        }
        verifyToken();
    },[setToken])
    if(IsChecking)
    {
        return (
            <div className='flex items-center flex-col'>
                <h1 className='text-3xl text-green-600'>PROCESSING</h1>
            </div>
        )
    }
    return(
        <div>
            {
                !token ? 
                <div>
                    <LoginScreen></LoginScreen>
                </div>
                :
                <div>
                    <UserUI>
                    </UserUI>
                </div>
            }
        </div>
    )
}
export default MainFlow;
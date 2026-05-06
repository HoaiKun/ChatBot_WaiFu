import { useState, useRef, useContext } from 'react'
import UserUI from "./UserUI"
import LoginScreen from "./LoginScreen";
import { useAuth } from "./AuthContext";
const MainFlow = () => {
    let {user, token, setToken, login, logout} = useAuth();
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
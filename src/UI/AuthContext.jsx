import { createContext, useState, useContext } from "react";

const AuthContext = createContext();

export const AuthProvider = ({children}) => {
    const [user, setUser] = useState(localStorage.getItem('username') || null);
    const [token, setToken] = useState(null);

    const login = (userData) => {
        setUser(userData.username)
        setToken(userData.access_token)
        localStorage.setItem('username', userData.username)
        localStorage.setItem('waifu_token', userData.access_token);
    }

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('username');
        localStorage.removeItem('waifu_token');
    }
    return (
        <AuthContext.Provider value={{user, token, setToken, login, logout}}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);



"use client";
import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios"

interface UserContextType {
    verified: boolean;
    updateVerification: (verified: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const UserContextProvider = ({ children }: { children: React.ReactNode }) => {
    const [verified, setVerified] = useState<boolean>(false);

    useEffect(()=>{
        async function getVerifiedStatus(){
            try {
                const response = await axios.get("/api/user/get-verification")
                if(response.status === 200){
                    setVerified(response.data.result)
                }
                console.log(response)
            } catch (error) {
                console.log(error)
            }
        }
        getVerifiedStatus()
    }, [])

    const updateVerification = (status: boolean) => {
        setVerified(status);
    };

    return (
        <UserContext.Provider value={{ verified, updateVerification }}>
            {children}
        </UserContext.Provider>
    );
};

const useUserContext = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUserContext must be used within a UserContextProvider");
    }
    return context;
};

export { UserContextProvider, useUserContext };

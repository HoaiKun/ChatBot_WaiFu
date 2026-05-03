
import { useState, useEffect, useRef } from 'react';

const ConvertSpeechToText = (options = {lang: 'vi-VN', continuous: false}) =>
{
    const [SpeechText, setSpeechText] = useState("");
    const [IsListening, setIsListening] = useState(false);
    let recognitionRef = useRef();
    useEffect(() => 
    {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if(!SpeechRecognition)
        {
            console.error("Ko lay dc mic");
            return;
        }
        

        const recognition = new SpeechRecognition();
        recognition.lang = options.lang
        recognition.continuous = options.continuous;
        recognition.interimResults = true;
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event) =>
        {
            let text = "";
            for(let i = 0; i < event.results.length; i++)
            {
                console.log("Mảng kết quả từ Browser:", event.results);
                text += event.results[i][0].transcript;
            }
            setSpeechText(text);
        }
        recognitionRef.current = recognition;
        }, []
    );
    const startListening = () => recognitionRef.current?.start();
    const stopListening = () => recognitionRef.current?.stop();
    return {SpeechText, IsListening, startListening, stopListening, setSpeechText, setIsListening};
}

export default ConvertSpeechToText;
import {useState, useRef} from 'react'
import { PostSpeechToText } from '../hooks/CallApi';
export const RecordSpeech = (language = null) => {
    const [SpeechText, setSpeechText] = useState("");
    const [IsListening, setIsListening] = useState(false);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const streamRef = useRef(null);
    const silenceTimerRef = useRef(null)

    const SILENCE_THRESHOLD = 0.01;
    const SILENCE_DURATION = 2000;

    const startListening = async() => {
        setSpeechText("");
        audioChunksRef.current = [];

        try{
            const stream = await navigator.mediaDevices.getUserMedia({audio:true});
            streamRef.current = stream;

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;
            source.connect(analyser);

            const bufferLength = analyser.fftSize;
            const dataArray = new Float32Array(bufferLength);

            const detectSilence = () => {
                if(mediaRecorderRef.current?.state !== "recording") return;
                analyser.getFloatTimeDomainData(dataArray);

                let sum = 0;
                for(let  i = 0; i < bufferLength; i++){
                    sum += dataArray[i] * dataArray[i];
                }
                const rms = Math.sqrt(sum/bufferLength);

                if(rms > SILENCE_THRESHOLD)
                {
                    if(silenceTimerRef.current)
                    {
                        clearTimeout(silenceTimerRef.current);
                        silenceTimerRef.current = null;
                    }
                }
                else
                {
                    if(!silenceTimerRef.current) {
                        silenceTimerRef.current = setTimeout(() => {
                            console.log("Auto stopped");
                            stopListening();
                        }, SILENCE_DURATION);
                    }
                }
                
                if(mediaRecorderRef.current?.state === "recording"){
                    requestAnimationFrame(detectSilence);
                }
            }

            const options = { mimeType: 'audio/webm;codecs=opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'audio/webm'; // Fallback nếu không hỗ trợ opus cụ thể
            }
            mediaRecorderRef.current = new MediaRecorder(stream, options);
            mediaRecorderRef.current.ondataavailable = (event) => {
                if(event.data.size > 0)
                {
                    audioChunksRef.current.push(event.data);
                }
            };
            mediaRecorderRef.current.onstop = async() => {
                const audioBlob = new Blob(audioChunksRef.current, {type:'audio/webm'});
                let data = new FormData();
                data.append("file", audioBlob, "recorded_audio.webm");
                data.append("language", language);
                const decoder = new TextDecoder();
                let fulltext = "";
                const reader = await PostSpeechToText(data)
                while(true)
                {
                    const {done, value} = await reader.read();
                    if(done) break;
                    const chunk = decoder.decode(value);
                    fulltext += chunk;
                    setSpeechText(fulltext);

                }
                stream.getTracks().forEach(track => track.stop());
               
                audioContext.close();
                
            }

            mediaRecorderRef.current.start();
            setIsListening(true);
            detectSilence();
        }
        catch (err)
        {
            console.error("Mic error");
            setIsListening(false);
        }
             
        
    }
    const stopListening = () => {
        if(mediaRecorderRef.current &&  mediaRecorderRef.current.state !=="inactive")
        {
            mediaRecorderRef.current.requestData();
            setTimeout(() => {
                mediaRecorderRef.current.stop();
                setIsListening(false);
            },10);
            
        }
    }
    return {SpeechText, IsListening, setIsListening, startListening, stopListening}
}
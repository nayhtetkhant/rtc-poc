'use client';

import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react"
import { useRtc } from "../../hooks/useRtc";
import { usePusherClient } from "@/app/libs/wsClient";
import { ChildProps } from "./rtc";

export default function PhoneCall({userId} : ChildProps) {
    const [isAudio , setIsAudio] = useState<boolean>(true);
    const [isVideo , setIsVideo] = useState<boolean>(false);

    const LocalVideoRef = useRef<HTMLVideoElement | null>(null);
    const RemoteVideoRef = useRef<HTMLVideoElement | null>(null);

    const {createOffer , createAnswer , addIceCandidate , addAnswer} = useRtc(RemoteVideoRef);
    const {pusherClient} = usePusherClient();

    useEffect(() => {
        const startCamera = async() => {
            if (LocalVideoRef.current) {
                LocalVideoRef.current.srcObject = await navigator.mediaDevices.getUserMedia({video : isVideo , audio : isAudio});
            }
        }
        startCamera();
    } , [isVideo])


    useEffect(() => {
        console.log('pusher effect run');

        let channel : any;

        if(pusherClient()) {
            channel = pusherClient().subscribe('phoneCallChannel');
        }

        channel.bind('iceCandidateEvent' , (data:any) => {

            let payload = data.data || data;
            addIceCandidate(payload);
        })

        channel.bind('phoneCallEvent' , (data:any) => {
            const payload = data.data;

            if(payload.requesterId === userId) return;

            const formattedOffer: RTCSessionDescriptionInit = {
                type: data.data.type,
                sdp: data.data.sdp 
            };
            
            createAnswer(formattedOffer ,true , userId , isAudio , payload.isVideo);
            console.log("payloadVideo" , payload.isVideo);
            setIsVideo(payload.isVideo);

        })

        channel.bind('phoneAnswerEvent' , (data:any) => {
            if(data.data.responserId == userId ) return;
            console.log('run');
            if(!data.data.isAccepted) {
                console.log('u have been rejected');
            }
            addAnswer(data.data.answer);
        })

        return () => {
            channel.unbind_all();
            channel.unsubscribe();
            pusherClient().disconnect();
        };
    } , [])


    const createVCCallHandler = () => {
        createOffer(
            isAudio,
            true,
            userId
        );
        setIsVideo(true);
    }

    const createPhoneCallHandler = () => {
        createOffer(
            isAudio,
            false,
            userId
        )
    } 

    return(<div>
        <Button variant="outline" onClick={createPhoneCallHandler}>phone call</Button>
        <Button variant="outline" onClick={createVCCallHandler}>vc call</Button>
        <div className="flex gap-4 mt-4 w-full max-w-4xl">
            <div className="flex-1 bg-neutral-900 rounded-lg p-2 text-center">
                <h1 className="mb-2 text-white font-bold">local</h1>
                <video
                ref={LocalVideoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-auto object-cover rounded bg-black"
                />
                
            </div>
            <br /><br /><br /><br /><br />
            <div className="flex-1 bg-neutral-900 rounded-lg p-2 text-center">
                <h1 className="mb-2 text-white font-bold">remote</h1>
                <video
                ref={RemoteVideoRef}
                playsInline
                autoPlay
                className="w-full h-auto object-cover rounded bg-black"
                />
            </div>
        </div>
        
    </div>)
}
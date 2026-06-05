'use client';

import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react"
import { useRtc } from "../../hooks/useRtc";
import Pusher from "pusher-js";

export default function PhoneCall() {
    const [isAudio , setIsAudio] = useState<boolean>(true);
    const [isVideo , setIsVideo] = useState<boolean>(true);

    const LocalVideoRef = useRef<HTMLVideoElement | null>(null);
    const RemoteVideoRef = useRef<HTMLVideoElement | null>(null);

    const {createOffer , createAnswer , addIceCandidate , addAnswer} = useRtc(RemoteVideoRef);


    useEffect(() => {
        const userId: number = Number(sessionStorage.getItem('userId'));

        const startCamera = async() => {
            if (LocalVideoRef.current) {
                LocalVideoRef.current.srcObject = await navigator.mediaDevices.getUserMedia({video : isVideo , audio : isAudio});
            }
        }
        startCamera();

        const pusher = new Pusher('a610752a65d36fd18fb2', {
            cluster: 'ap1'
        });
        const channel = pusher.subscribe('phoneCallChannel');

        channel.bind('iceCandidateEvent' , (data:any) => {

            let payload = data.data || data;
            

            addIceCandidate(payload);
        })

        channel.bind('phoneCallEvent' , (data:any) => {
            if(data.data.requesterId === userId) return;

            const formattedOffer: RTCSessionDescriptionInit = {
                type: data.data.type,
                sdp: data.data.sdp 
            };
            
            createAnswer(formattedOffer ,true , userId , true , true);
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
            pusher.disconnect();
        };
    } , [createAnswer , addAnswer , addIceCandidate])


    const createOfferHandler = () => {
        createOffer(
            isAudio,
            isVideo,
            Number(sessionStorage.getItem('userId'))
        );
    }

    return(<div>
        <Button variant="outline" onClick={createOfferHandler}>offer</Button>
        <div className="w-50 h-50">
            <h1>local</h1>
            <video
            ref={LocalVideoRef}
            playsInline
            autoPlay
            muted/>
            
        </div>
        <br /><br /><br /><br /><br />
        <div className="w-50 h-50">
            <h1>remote</h1>
            <video
            ref={RemoteVideoRef}
            playsInline
            autoPlay
            muted
            />
        </div>
        
    </div>)
}
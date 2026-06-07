'use client';

import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react"
import { useRtc } from "../../hooks/useRtc";
import { usePusherClient } from "@/app/libs/wsClient";
import { ChildProps } from "./rtc";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { phoneEndPusher } from "@/app/libs/ws";

interface IncomingPayloadType {
    formattedOffer : RTCSessionDescriptionInit,
    userId : number ,
    isVideo : boolean
}

export default function PhoneCall({userId} : ChildProps) {
    const [isAudio , setIsAudio] = useState<boolean>(true);
    const [isVideo , setIsVideo] = useState<boolean>(false);
    const [isIncomingCall  , setIsIncomingCall] = useState<boolean>(false);
    const [isHold , setIsHold] = useState<boolean>(true);
    const [isAccepted , SetIsAccepted] = useState<boolean>(false);
    const [isRejected , setIsRejected] = useState<boolean>(false);

    const LocalVideoRef = useRef<HTMLVideoElement | null>(null);
    const RemoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const IncomingPayloadRef = useRef<IncomingPayloadType | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    const {createOffer , createAnswer , addIceCandidate , addAnswer , endConnection} = useRtc(RemoteVideoRef);
    const {pusherClient} = usePusherClient();

    useEffect(() => {
        const startCamera = async() => {
            if ((isVideo || isAudio) && LocalVideoRef.current) {
                const stream = await navigator.mediaDevices.getUserMedia({video : isVideo , audio : isAudio});
                LocalVideoRef.current.srcObject = stream;
                localStreamRef.current = stream;
            }
        }
        startCamera();
    } , [isVideo , isAudio])


    useEffect(() => {

        let channel : any;

        if(pusherClient()) {
            channel = pusherClient().subscribe('phoneCallChannel');
        }

        channel.bind('iceCandidateEvent' , (payload:any) => {
            addIceCandidate(payload);
        })

        channel.bind('phoneCallEvent' , (payload:any) => {
            if(payload.requesterId === userId) return;
            setIsIncomingCall(true);
            const formattedOffer: RTCSessionDescriptionInit = {
                type: payload.type,
                sdp: payload.sdp 
            };
            IncomingPayloadRef.current = {
                formattedOffer , 
                userId, 
                isVideo : payload.isVideo
            }
            setIsVideo(payload.isVideo);

        })

        channel.bind('phoneEndEvent' , (payload:any) =>  {
            if(!payload.isEnd) return;
            endConnection();
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
                localStreamRef.current = null;
            }
            if (LocalVideoRef.current) LocalVideoRef.current.srcObject = null;
            if (RemoteVideoRef.current) RemoteVideoRef.current.srcObject = null;
            setIsAudio(false);
            setIsVideo(false);
            setIsIncomingCall(false);
            setIsHold(true);
            SetIsAccepted(false);
            IncomingPayloadRef.current = null;

        })

        channel.bind('phoneAnswerEvent' , (payload:any) => {
            if(payload.responserId == userId ) return;
            if(!payload.isAccepted) {
                setIsRejected(true);
            }
            addAnswer(payload.answer);
        })
        return () => {
            channel.unbind_all();
            channel.unsubscribe();
            pusherClient().disconnect();
        };
    } , [])

    useEffect(() => {
        if(isHold) return;
        const payload = IncomingPayloadRef.current;
        if(payload) {
            createAnswer(payload?.formattedOffer ,isAccepted , userId , isAudio , payload.isVideo);
        }
    } , [isHold])


    const createVCCallHandler = () => {
        createOffer(
            true,
            true,
            userId
        );
        setIsAudio(true);
        setIsVideo(true);
    }

    const createPhoneCallHandler = () => {
        createOffer(
            true,
            false,
            userId
        )
        setIsAudio(true);
    } 

    const endCallHandler = () => {
        phoneEndPusher({
            isEnd : true
        })
    }

    return(<div>
        <Button variant="outline" onClick={createPhoneCallHandler}>phone call</Button>
        <Button variant="outline" onClick={createVCCallHandler}>vc call</Button>
        <Dialog open={isRejected}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        u have been rejected here
                    </DialogTitle>
                </DialogHeader>
                <Button variant={"outline"} onClick={() => setIsRejected(false)}>
                    ok
                </Button>
            </DialogContent>
        </Dialog>
        <Dialog open= {isIncomingCall}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Incoming call
                    </DialogTitle>
                    <DialogDescription>
                        userId {userId} is calling you
                    </DialogDescription>
                    <Button variant="outline" onClick={() => {
                        setIsHold(false);
                        SetIsAccepted(true);
                        setIsIncomingCall(false)
                    }}>
                        accept
                    </Button>
                    <Button variant="outline" onClick={() => {
                        setIsHold(false);
                        SetIsAccepted(false);
                        setIsIncomingCall(false);
                    }}>
                        reject
                    </Button>
                </DialogHeader>
            </DialogContent>
        </Dialog>
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
            <div>
                <Button variant={"outline"} onClick={endCallHandler}>end call</Button>
            </div>
        </div>
    </div>)
}
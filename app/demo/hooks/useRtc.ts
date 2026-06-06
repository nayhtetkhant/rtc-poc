'use client';

import { useEffect, useRef } from "react";
import { configuration } from "../data/data";
import { iceCandidatePusher, phoneAnswerPusher, phoneCallPusher } from "@/app/libs/ws";

export function useRtc(remoteVideoRef: React.RefObject<HTMLVideoElement | null>) {
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const candidateQueue = useRef<any[]>([]);

    useEffect(() => {
        peerConnection.current = new RTCPeerConnection(configuration);

        peerConnection.current.onicecandidate = async (event) => {
            if(event.candidate) {
                iceCandidatePusher(event.candidate.toJSON());
            }else {
                iceCandidatePusher({isEnd : true});
            }
        }

        peerConnection.current.ontrack = async (event) => {
            console.log("TRACK RECEIVED", event);
            console.log("streams", event.streams);

            if(remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
            
        };

        peerConnection.current.onconnectionstatechange = () => {
            console.log(
                "connection:",
                peerConnection.current?.connectionState
            );
        };

        peerConnection.current.oniceconnectionstatechange = () => {
            console.log(
                "ice:",
                peerConnection.current?.iceConnectionState
            );
        };

        return () => {
            peerConnection.current?.close();
        };
    }, []);

    const createOffer = async (isAudio : boolean , isVideo : boolean , userId : number) => {
        if(peerConnection.current) {
            const localStream = await navigator.mediaDevices.getUserMedia({video : isVideo , audio : isAudio});

            localStream.getTracks().forEach((track) => {
                peerConnection.current?.addTrack(track , localStream);
            })

            const offer =  await peerConnection.current.createOffer();
            await peerConnection.current.setLocalDescription(offer);

            phoneCallPusher({
                requesterId: userId,
                isVideo,
                type: offer.type,
                sdp: offer.sdp 
            });

            
        }
    }

    const createAnswer = async(offer : RTCSessionDescriptionInit ,isAccepted : boolean , responserId : number , isAudio : boolean , isVideo : boolean) => {
        if(!isAccepted) {
            phoneAnswerPusher({
                isAccepted,
                responserId,
                answer : null
            })
            return;
        }

        if(peerConnection.current) {
            const localStream = await navigator.mediaDevices.getUserMedia({video : isVideo , audio : isAudio});

            localStream.getTracks().forEach((track) => {
                peerConnection.current?.addTrack(track , localStream);  
            })

            await peerConnection.current.setRemoteDescription(offer);

            await flushCandidateQueue();

            let answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);

            phoneAnswerPusher({
                isAccepted,
                responserId,
                answer
            })
        }
    }

    const addAnswer = async (answer:any) => {

        console.log('run');
        if(peerConnection.current) {
            if(!peerConnection.current.currentRemoteDescription) {
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));

                await flushCandidateQueue();
            }
            
        }
    }

    const addIceCandidate = async (candidate : any) => {
        if(!candidate || candidate.isEnd || Object.keys(candidate).length === 0) return;
        if(peerConnection.current) {
            if(!peerConnection.current.remoteDescription) {
                candidateQueue.current.push(candidate);
                return;
            }

            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate))
        }
    }

    const flushCandidateQueue = async () => {
    if (!peerConnection.current) return;

    while (candidateQueue.current.length > 0) {
        const candidate = candidateQueue.current.shift();

        await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(candidate)
        );
    }
};

    return {
        createOffer,
        createAnswer,
        addIceCandidate,
        addAnswer
    }
}
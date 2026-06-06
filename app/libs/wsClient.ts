'use client';

import Pusher from "pusher-js";
import { useEffect, useRef } from "react";

export const usePusherClient = () => {
    const pusherClientRef = useRef<any>(null);
    useEffect(() => {
        pusherClientRef.current = new Pusher ('a610752a65d36fd18fb2', {
            cluster: 'ap1'
        });
    } , []);

    const pusherClient = () => {
        if(pusherClientRef.current){
            return pusherClientRef.current
        }
    }

    return {
        pusherClient
    }
}
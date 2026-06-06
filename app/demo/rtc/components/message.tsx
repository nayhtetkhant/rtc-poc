'use client';

import { broadCast } from "@/app/libs/ws";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Pusher from "pusher-js";
import { useEffect, useState } from "react";
import { ChildProps } from "./rtc";

export interface Message {
    id : number ,
    message : string
}

type MessageList = Message[];

export default function Message({userId} : ChildProps) {
    const [messageLists , setMessageList] = useState<MessageList>([]);
    const [message , setMessage] = useState<string>("");

    const SentMessageHandler = () => {
        broadCast({
            id :  userId, 
            message
        });

        setMessage("");
    }

    useEffect(() => {
        const pusher = new Pusher('a610752a65d36fd18fb2', {
            cluster: 'ap1'
        });

        const channel = pusher.subscribe('signallingChannel');

        channel.bind('signallingEvent' , (data:any) => {
            setMessageList((prev) => [
                ...prev,
                data.message
            ]);
        })

        return () => {
            channel.unbind_all();
            channel.unsubscribe();
            pusher.disconnect();
        };
    }, [])

    return(<div>
        {messageLists.map((message , key) => {
            return(
                <div key={key}>
                    <span >{message.id}</span>
                    <span>  {">>>>"} </span>
                    <span>{message.message}</span>
                </div>
            )
        })}
        <Input type="text" onChange={(e) => setMessage(e.target.value)} value={message} className="border-amber-400"/>
        <Button variant="outline" onClick={SentMessageHandler}>sent</Button>
    </div>)
}
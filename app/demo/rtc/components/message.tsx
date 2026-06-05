'use client';

import { broadCast } from "@/app/libs/ws";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { run } from "node:test";
import Pusher from "pusher-js";
import { useEffect, useState } from "react";

export interface Message {
    id : number ,
    message : string
}

type MessageList = Message[];

export default function Message() {
    const [messageLists , setMessageList] = useState<MessageList>([]);
    const [message , setMessage] = useState<string>("");

    const SentMessageHandler = () => {
        broadCast({
            id :  Number(sessionStorage.getItem('userId')!) , 
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
            // if(data.message.id == Number(sessionStorage.getItem('userId')!)) return;

            console.log(data.message);

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
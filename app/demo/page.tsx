'use client';

import { Button } from "@/components/ui/button";
import Echo from "laravel-echo";
import { useEffect, useState } from "react"

export default function DemoPage() {
    const [age , setAge] = useState<number>(0);
    const AddHandler = () => setAge(age + 1);

    useEffect(()=> {
        const echo = new Echo({
            broadcaster: "reverb", // သို့မဟုတ် "pusher" mf
            key: process.env.NEXT_PUBLIC_REVERB_APP_KEY,
            wsHost: process.env.NEXT_PUBLIC_REVERB_HOST,
            wsPort: 1,
            forceTLS: process.env.NEXT_PUBLIC_REVERB_SCHEME === "https",
            disableStats: true,
            enabledTransports:["ws", "wss"],
        });

        return () => {
            echo.disconnect();
        }
    }, [])

    return(<div>
        <p>
            {age}
        </p>
        <Button onClick={() => AddHandler()}>
            add 1
        </Button>
    </div>)
}
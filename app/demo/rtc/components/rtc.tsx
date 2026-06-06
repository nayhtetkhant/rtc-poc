'use client';

import { useEffect, useState } from "react";
import { Userdata } from "../../data/data";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import PhoneCall from "./phoneCall";
import Message from "./message";

export interface ChildProps  {
    userId : number
};

export default function Rtc() {
    const searchParams = useSearchParams();

    const currentUserId = Number(searchParams.get("userId"));
    
    console.log(currentUserId);

    return(<div>
        <label>rtc poc</label>
        <Message userId={currentUserId}></Message>
        <PhoneCall userId={currentUserId}></PhoneCall>
    </div>)
}
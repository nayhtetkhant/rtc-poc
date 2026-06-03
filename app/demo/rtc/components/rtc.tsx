'use client';

import { useEffect, useState } from "react";
import { Userdata } from "../../data/data";

export default function Rtc() {
    const [userId , setUserId] = useState<number>(() => {
        if(typeof Window !== "undefined") {
            const userId = sessionStorage.getItem('userId');
            return userId ? Number(userId) : 1;
        }
        return 1;
    });

    useEffect(() => {
        sessionStorage.setItem('userId' , userId + "")
    } , [userId]);

    return(<div>
        <label>user id selection</label>
        <br /><br />
        <select value={userId} onChange={(e) => setUserId(+e.target.value)}>
            {Userdata.map((user) => <option key={user.id} value={user.id} >{user.id}</option>)}
        </select>
    </div>)
}
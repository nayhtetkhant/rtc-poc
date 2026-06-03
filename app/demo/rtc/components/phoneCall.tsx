'use client';

import { useEffect } from "react"

export default function PhoneCall() {

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({video : true , audio : true}).then(stream => console.log(stream)).catch(err => console.log('err' , err));
    } , [])

    return(<div>

    </div>)
}
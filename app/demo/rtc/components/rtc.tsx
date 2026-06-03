'use client';

import { Userdata } from "../../data/data";

export default function Rtc() {
    return(<div>
        <label>user id selection</label>
        <br /><br />
        <select>
            {Userdata.map((user) => <option key={user.id} value={user.id}>{user.id}</option>)}
        </select>
    </div>)
}
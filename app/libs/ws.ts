'use server';

import Pusher from "pusher";
import { Message } from "../demo/rtc/components/message";

const pusher = new Pusher({
    appId: "2162573",
    key: "a610752a65d36fd18fb2",
    secret: "def2237b3ecaae2cac26",
    cluster: "ap1",
    useTLS: true
});

export async function broadCast(message:Message) {
  await pusher.trigger("signallingChannel", "signallingEvent", {
    message
  });
}

export async function phoneCallPusher(data:object) {
  await pusher.trigger("phoneCallChannel" , "phoneCallEvent" , {
    data
  })
}

export async function iceCandidatePusher(data:object) {
  await pusher.trigger("phoneCallChannel" , "iceCandidateEvent" , {
    data
  })
}

export async function phoneAnswerPusher(data:object) {
  await pusher.trigger("phoneCallChannel" , "phoneAnswerEvent" , {
    data
  })
}
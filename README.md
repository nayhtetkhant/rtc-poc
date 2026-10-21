# rtc-poc

A proof-of-concept for real-time audio/video communication in the browser using **WebRTC**, with **Pusher** as the signalling channel and **Next.js server actions** as the bridge between the client and Pusher.

Open the demo page in two browsers (or two devices on the same network), call the other user, and talk — the media streams flow directly peer-to-peer; only the call setup messages pass through the server.

## How it works

WebRTC needs a signalling mechanism to exchange **SDP offers/answers** and **ICE candidates** before a peer-to-peer connection can be established. This PoC uses Pusher channels for that, mediated by Next.js server actions so the Pusher **app secret never has to live in the browser**.

### Architecture

```mermaid
flowchart LR
    subgraph BrowserA["Browser A (userId=1)"]
        UI_A["React UI<br/>phoneCall.tsx / message.tsx"]
        RTC_A["RTCPeerConnection<br/>(useRtc hook)"]
        PJ_A["pusher-js"]
        UI_A --> RTC_A
        UI_A -->|server actions| PJ_A
    end

    subgraph Server["Next.js Server"]
        SA["app/libs/ws.ts<br/>'use server' actions<br/>pusher.trigger(...)"]
    end

    subgraph Pusher["Pusher (ap1 cluster)"]
        CH["Channels<br/>signallingChannel<br/>phoneCallChannel"]
    end

    subgraph BrowserB["Browser B (userId=2)"]
        PJ_B["pusher-js"]
        RTC_B["RTCPeerConnection<br/>(useRtc hook)"]
        UI_B["React UI<br/>phoneCall.tsx / message.tsx"]
        PJ_B --> UI_B
        RTC_B --> UI_B
    end

    STUN["STUN server<br/>stun.l.google.com:19302"]

    PJ_A -->|HTTPS (server action call)| SA
    SA -->|trigger events| CH
    CH -->|WebSocket| PJ_B
    PJ_B -.->|respond via server actions| SA
    SA -->|trigger events| CH
    CH -.->|WebSocket| PJ_A

    RTC_A <== SDP + ICE via signalling ==> CH
    RTC_A <== "media (SRTP, P2P)" ==> RTC_B
    RTC_A -.->|NAT discovery| STUN
    RTC_B -.->|NAT discovery| STUN
```

### Call flow

```mermaid
sequenceDiagram
    participant A as Caller (userId=1)
    participant S as Next.js Server
    participant P as Pusher
    participant B as Callee (userId=2)

    A->>S: phoneCallPusher({requesterId, sdp: offer, isVideo})
    S->>P: trigger("phoneCallChannel", "phoneCallEvent")
    P-->>B: phoneCallEvent (incoming call dialog)
    B->>B: user clicks Accept → setRemoteDescription(offer)
    B->>S: phoneAnswerPusher({isAccepted: true, answer})
    S->>P: trigger("phoneCallChannel", "phoneAnswerEvent")
    P-->>A: phoneAnswerEvent → setRemoteDescription(answer)

    loop ICE candidate exchange
        A->>S: iceCandidatePusher(candidate)
        S->>P: trigger("phoneCallChannel", "iceCandidateEvent")
        P-->>B: iceCandidateEvent → addIceCandidate
        B->>S: iceCandidatePusher(candidate)
        S->>P: trigger(..., "iceCandidateEvent")
        P-->>A: iceCandidateEvent → addIceCandidate
    end

    A<==>| media flows peer-to-peer (SRTP) |B

    A->>S: phoneEndPusher({isEnd: true})
    S->>P: trigger("phoneCallChannel", "phoneEndEvent")
    P-->>B: phoneEndEvent → close connection, stop tracks
```

If the callee **rejects** the call, `phoneAnswerEvent` is sent with `isAccepted: false`, and the caller sees a "rejected" dialog.

### Signalling channels

| Channel | Event | Payload | Purpose |
|---|---|---|---|
| `signallingChannel` | `signallingEvent` | `{ id, message }` | Broadcast chat demo |
| `phoneCallChannel` | `phoneCallEvent` | `{ requesterId, type, sdp, isVideo }` | SDP offer / incoming call |
| `phoneCallChannel` | `phoneAnswerEvent` | `{ isAccepted, responserId, answer }` | SDP answer or rejection |
| `phoneCallChannel` | `iceCandidateEvent` | `RTCIceCandidate` or `{ isEnd: true }` | ICE candidate exchange |
| `phoneCallChannel` | `phoneEndEvent` | `{ isEnd: true }` | Hang up / teardown |

## Project structure

```
app/
├── libs/
│   ├── ws.ts                # 'use server' actions — pusher.trigger() for all signalling events
│   └── wsClient.ts          # usePusherClient hook (pusher-js wrapper)
├── demo/
│   ├── hooks/
│   │   └── useRtc.ts        # RTCPeerConnection lifecycle: offer/answer, ICE queue, teardown
│   ├── data/
│   │   └── data.ts          # Mock users + ICE configuration (Google STUN)
│   └── rtc/
│       ├── page.tsx         # Demo route: /demo/rtc?userId=<id>
│       └── components/
│           ├── rtc.tsx      # Reads userId from query params, composes the demo
│           ├── phoneCall.tsx# Call UI: place/accept/reject/end call, local+remote video
│           └── message.tsx  # Broadcast chat over the signalling channel
└── components/ui/           # shadcn/ui primitives (button, input, dialog)
```

### Key pieces

- **`app/libs/ws.ts`** — Server actions that wrap `pusher.trigger()`. Because they run on the server, the Pusher **app secret stays server-side**.
- **`app/libs/wsClient.ts`** — `usePusherClient()` hook that creates and exposes a `pusher-js` client instance.
- **`app/demo/hooks/useRtc.ts`** — Owns the `RTCPeerConnection`. Implements `createOffer`, `createAnswer`, `addAnswer`, `addIceCandidate` (with a **candidate queue** for candidates that arrive before the remote description is set), and `endConnection`.
- **`app/demo/rtc/components/phoneCall.tsx`** — Subscribes to `phoneCallChannel`, binds all call events, and renders the call controls, incoming-call dialog, rejection dialog, and the local/remote `<video>` tiles.

## Getting started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/)
- A [Pusher](https://pusher.com) Channels app (the default credentials in `app/libs/ws.ts` are for a demo app)

### Run locally

```bash
pnpm install
pnpm dev
```

The dev script binds to a LAN address (`192.168.1.119`) so a second device on the same network can connect. Adjust the `-H` flag in `package.json` to match your own IP.

### Try the demo

1. Open the demo on two browsers or devices:
   - Device A: `http://<your-ip>:3000/demo/rtc?userId=1`
   - Device B: `http://<your-ip>:3000/demo/rtc?userId=2`
2. On either side, click **phone call** (audio) or **vc call** (audio + video).
3. The other side gets an incoming-call dialog — **accept** or **reject**.
4. Once connected, media flows directly between the two peers.
5. Click **end call** to hang up; both sides release the microphone/camera and close the connection.

> The `?userId=` query param identifies the caller so a client can ignore its own signalling events. The demo users (`mgmg` = 1, `aung aung` = 2) are defined in `app/demo/data/data.ts`.

## Tech stack

- [Next.js](https://nextjs.org) (App Router, Server Actions) + React 19
- [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) (`RTCPeerConnection`, `getUserMedia`)
- [Pusher Channels](https://pusher.com/channels) — `pusher` (server) + `pusher-js` (client)
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)

## Known limitations (it's a PoC)

- **No TURN server** — only a STUN server is configured, so calls will fail behind symmetric NATs or strict firewalls. Add a TURN server (e.g. [Twilio TURN](https://www.twilio.com/stun-turn) or [coturn](https://github.com/coturn/coturn)) to `configuration.iceServers` in `app/demo/data/data.ts` for production-grade connectivity.
- **Hardcoded Pusher credentials**, including the app secret, live in `app/libs/ws.ts`. Move them to environment variables (`.env.local`) before this goes anywhere near production, and rotate the exposed secret.
- **Single peer connection** — one `RTCPeerConnection` per page; no multi-party / mesh / SFU support.
- **Broadcast signalling** — every client receives every event on `phoneCallChannel` and filters by `requesterId`/`responserId` locally. Use per-user private/presence channels at scale.
- **No authentication or call history** — identity is just a query param, and nothing is persisted.

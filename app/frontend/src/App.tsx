import { useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

import { Recorder } from "./recorder";

import "./App.css";

let audioRecorder: Recorder;
let buffer: Uint8Array = new Uint8Array();
const BUFFER_SIZE = 4800;

function App() {
    const [recording, setRecording] = useState(false);

    //Public API that will echo messages sent to it back to the client
    const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket("wss://echo.websocket.org", {
        onOpen: () => console.log("Websocket connection opened"),
        onClose: () => console.log("Websocket connection closed"),
        onError: event => console.error("WebSocket error:", event),
        onMessage: event => console.log("Websocket onMessage:", event)
    });

    const connectionStatus = {
        [ReadyState.CONNECTING]: "Connecting",
        [ReadyState.OPEN]: "Open",
        [ReadyState.CLOSING]: "Closing",
        [ReadyState.CLOSED]: "Closed",
        [ReadyState.UNINSTANTIATED]: "Uninstantiated"
    }[readyState];

    function combineArray(newData: Uint8Array) {
        const newBuffer = new Uint8Array(buffer.length + newData.length);
        newBuffer.set(buffer);
        newBuffer.set(newData, buffer.length);
        buffer = newBuffer;
    }

    function processAudioRecordingBuffer(data: Iterable<number>) {
        const uint8Array = new Uint8Array(data);
        combineArray(uint8Array);

        if (buffer.length >= BUFFER_SIZE) {
            const toSend = new Uint8Array(buffer.slice(0, BUFFER_SIZE));
            buffer = new Uint8Array(buffer.slice(BUFFER_SIZE));

            const regularArray = String.fromCharCode(...toSend);
            const base64 = btoa(regularArray);

            sendJsonMessage({
                event: "add_user_audio",
                data: base64
            });
        }
    }

    const onTalk = async () => {
        if (!recording) {
            sendJsonMessage({ event: "Start talking" });

            audioRecorder = new Recorder(processAudioRecordingBuffer);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioRecorder.start(stream);

            setRecording(true);
        } else {
            sendJsonMessage({ event: "Stop talking" });

            if (audioRecorder) {
                audioRecorder.stop();
            }

            setRecording(false);
        }
    };

    return (
        <>
            <h1>Talk to your data</h1>
            <div className="card">
                <button className="button" onClick={onTalk}>
                    {recording ? "Stop" : "Start"}
                </button>
                <p className="note">{recording ? "Listening..." : "Press to start talking"}</p>
                <p className="note">Websocket status: {connectionStatus}</p>
                <p className="note">Websocket last message: {lastJsonMessage ? JSON.stringify(lastJsonMessage) : ""}</p>
            </div>
        </>
    );
}

export default App;

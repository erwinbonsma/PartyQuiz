export function handleResponse(websocket, onSuccess, onFailure) {
    const handleMessage = (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === "response") {
            if (msg.result === "ok") {
                onSuccess(msg);
            } else {
                console.error("Error: ", msg);
                if (onFailure) {
                    onFailure(msg);
                }
            }
        }

        websocket.removeEventListener('message', handleMessage);
    };

    websocket.addEventListener('message', handleMessage);
}
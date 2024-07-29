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

export function labelForChoiceIndex(index) {
    return String.fromCharCode(65 + index);
}

export function getConfigSetting(document, name) {
    return document.querySelector(`meta[name='${name}']`)?.getAttribute('content');
}

export function getConfigSettings(document, name) {
    return Array.from(document.querySelectorAll(`meta[name='${name}']`)
                     ).map((v) => v.getAttribute('content'));
}
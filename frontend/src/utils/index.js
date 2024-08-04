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

export function addToSet(elems, elem) {
    const newElems = new Set(elems);
    newElems.add(elem);
    return newElems;
}

export function removeFromSet(elems, elem) {
    const newElems = new Set(elems);
    newElems.delete(elem);
    return newElems;
}

export function collectionSize(elems) {
    return (elems.size || elems.length || 0);
}

export function isNotEmpty(elems) {
    return collectionSize(elems) > 0;
}

export function storeValue(name, value) {
    // Let cookie lifetime default to deletion on browser closure
    document.cookie = `${name}=${encodeURIComponent(value)};path=/`;
}

export function loadValue(name) {
    const prefix = `${name}=`;
    const fields = decodeURIComponent(document.cookie).split(';');
    const values = (fields.map(v => v.trim())
                    .filter(v => v.indexOf(prefix) == 0)
                    .map(v => v.substring(prefix.length)));

    const value = values.length > 0 ? values[0] : undefined;
    console.info(`${name}=${value}`);

    return value;
}
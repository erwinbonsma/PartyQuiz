import './App.css';
import { useState, useEffect } from 'react';

import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack';

import { PlayerApp } from './PlayerApp.js'

export function AppSelector() {
    const [appMode, setAppMode] = useState();

    // Get mode from HTML page. This is how it should work in production.
    useEffect(() => {
        const mode = document.querySelector("meta[name='app-mode']")?.getAttribute("content");
        console.info(`app-mode from document = ${mode}`);

        setAppMode(mode);
    }, []);

    return (<div className="App">
        { (appMode === "player"
        ? <PlayerApp/>
        : (appMode === "host"
            ? <p>HostApp</p>
            : <Stack gap={3}>
                <Button onClick={() => setAppMode("player")}>Player App</Button>
                <Button onClick={() => setAppMode("host")}>Host App</Button>
            </Stack>))
        }
    </div>);
}
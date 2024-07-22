import './App.css';
import { useState, useEffect } from 'react';

import Button from 'react-bootstrap/Button';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';

import { HostApp } from './HostApp.js'
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
            ? <HostApp/>
            : <ButtonToolbar>
                <Button className="mx-2" onClick={() => setAppMode("player")}>Player App</Button>
                <Button className="mx-2" onClick={() => setAppMode("host")}>Host App</Button>
            </ButtonToolbar>))
        }
    </div>);
}
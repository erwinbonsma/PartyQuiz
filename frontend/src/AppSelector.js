import './App.css';
import { useState, useMemo } from 'react';

import Button from 'react-bootstrap/Button';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';

import { HostApp } from './HostApp.js'
import { PlayerApp } from './PlayerApp.js'

import { getConfigSetting } from './utils';

function getAppMode() {
    const mode = getConfigSetting(document, 'cfg-app-mode');
    console.info(`app-mode from document = ${mode}`);

    return mode;
}

export function AppSelector() {
    const [appMode, setAppMode] = useState(useMemo(getAppMode, [document]));

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
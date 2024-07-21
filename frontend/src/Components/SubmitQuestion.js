import { useState } from 'react';

import Button from 'react-bootstrap/Button';

export function SubmitQuestion({ websocket, quizId, onDone }) {
    return <>
        <Button onClick={onDone}>Submit Question</Button>
    </>;
}

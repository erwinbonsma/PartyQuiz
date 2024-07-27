import { useState } from 'react';
import Button from 'react-bootstrap/Button';

import { QuizSetupStats } from './QuizSetupStats';

export function HostQuiz({ websocket, quizId }) {
    const [quizStarted, setQuizStarted] = useState(false);
    const [viewLobby, setViewLobby] = useState(false);

    const startQuiz = () => {
        setQuizStarted(true);
        setViewLobby(false);
    }
    const enterLobby = () => {
        setViewLobby(true);
    }

    return (<div className="HostQuiz">
        { (quizStarted && !viewLobby)
        ? <>
            <p>Quiz started</p>
            <Button onClick={enterLobby}>View Lobby</Button>
        </>
        : <>
            <QuizSetupStats websocket={websocket} quizId={quizId} />
            <Button onClick={startQuiz}>{quizStarted ? "Resume Quiz" : "Start Quiz"}</Button>
        </>}
    </div>);
}
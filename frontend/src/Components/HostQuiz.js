import { useState } from 'react';
import Button from 'react-bootstrap/Button';

import { QuizSetupStats } from './QuizSetupStats';

export function HostQuiz({ websocket, quizId }) {
    const [quizStarted, setQuizStarted] = useState(false);

    const startQuiz = () => {
        setQuizStarted(true);
    }

    return (<div className="HostQuiz">
        { quizStarted
        ? <p>Quiz started</p>
        : <>
            <QuizSetupStats websocket={websocket} quizId={quizId} />
            <Button className="mx-2" onClick={startQuiz}>Start Quiz</Button>
        </>}
    </div>);
}
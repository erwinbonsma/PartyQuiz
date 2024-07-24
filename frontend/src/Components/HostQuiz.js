import { useState } from 'react';
import Button from 'react-bootstrap/Button';

export function HostQuiz({ websocket, quizId }) {
    const [quizStarted, setQuizStarted] = useState(false);

    const startQuiz = () => {
        setQuizStarted(true);
    }

    return (<div className="HostApp">
        { quizStarted
        ? <p>Quiz started</p>
        : <><p>TODO: Show join stats</p><Button className="mx-2" onClick={startQuiz}>Start Quiz</Button></>
        }
    </div>);
}
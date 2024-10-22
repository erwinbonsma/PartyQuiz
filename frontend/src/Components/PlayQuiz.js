import { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack';
import ToggleButton from 'react-bootstrap/ToggleButton';

import { handleResponse, labelForChoiceIndex } from '../utils';

export function PlayQuiz({ websocket, quizId, onReviseQuestion }) {
    const [questionId, setQuestionId] = useState(0);
    const [isQuestionOpen, setQuestionIsOpen] = useState(false);
    const [answer, setAnswer] = useState();
    const [choices, setChoices] = useState();
    const [didAnswer, setDidAnswer] = useState(false);

    const handleMessage = (event) => {
        const msg = JSON.parse(event.data);
        console.info(msg);

        if (msg.type === "question-opened") {
            setQuestionId(msg.question_id);
            setChoices(msg.question.choices);
            setQuestionIsOpen(true);
            setAnswer(undefined);
            setDidAnswer(false);
        }
        if (msg.type === "question-closed") {
            setQuestionId(msg.question_id);
            setQuestionIsOpen(false);
        }
    };

    useEffect(() => {
        // Note: invoked twice in development (for stress testing)
        // This results in an extra message, but that's fine.

        websocket.addEventListener('message', handleMessage);

        // Check if a question is already open
        websocket.send(JSON.stringify({
			action: "get-question",
            quiz_id: quizId,
        }));

		return function cleanup() {
            websocket.removeEventListener('message', handleMessage);
		}
	}, [websocket, quizId]);

    const sendAnswer = () => {
        handleResponse(websocket,
            () => { setDidAnswer(true); },
            (msg) => {
                if (msg.error_code === 8) {
                    // Already answered
                    setDidAnswer(true);
                }
            }
        );

        websocket.send(JSON.stringify({
			action: "answer",
            quiz_id: quizId,
            question_id: questionId,
            answer: answer,
		}));
    };

    const canAnswer = isQuestionOpen && !didAnswer;

    return (
        questionId > 0
        ? <>
            <h2>Question {questionId}</h2>
            { choices
            && <Stack gap={3} className="col-md-5 mx-auto">
                { choices.map((choice, idx) => (<ToggleButton
                    key={idx}
                    id={`radio-${idx}`}
                    type="radio"
                    variant="secondary"
                    size="lg"
                    disabled={!canAnswer}
                    checked={answer === idx + 1}
                    onChange={() => setAnswer(idx + 1)}
                    >{`${labelForChoiceIndex(idx)}. ${choice}`}</ToggleButton>))}
                <Button
                    onClick={sendAnswer}
                    disabled={!answer || !canAnswer}
                    variant="primary"
                    size="lg">Submit Answer</Button>
            </Stack>
            }</>
        : <>
            <h4>Waiting for quiz to start...</h4>
            <Button onClick={onReviseQuestion}>Revise Question</Button>
        </>);
}
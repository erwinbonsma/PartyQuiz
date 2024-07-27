import Button from 'react-bootstrap/esm/Button';
import Container from 'react-bootstrap/esm/Container';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import { labelForChoiceIndex } from '../utils';
import { AnswerChoice } from './AnswerChoice';

export function QuizQuestion({
    websocket, quizId, players, poolQuestions, questions, questionId, isQuestionOpen
}) {

    console.info({ players, poolQuestions, questions });
    const questionAuthors = Object.fromEntries(Object.entries(questions).map(
        ([_, v]) => [v.author_id, true]
    ));
    const availableQuestions = Object.values(poolQuestions).filter((question) => (
        !questionAuthors[question.author_id] && players[question.author_id].online
    ));

    const closeQuestion = () => {
        websocket.send(JSON.stringify({
            action: "close-question",
            quiz_id: quizId
        }));
    };
    const gotoNextQuestion = () => {
        const nextQuestion = availableQuestions[0];

        websocket.send(JSON.stringify({
            action: "open-question",
            quiz_id: quizId,
            ...nextQuestion
        }));
    };

    const q = questions[questionId];

    return (<div className="QuizQuestion">
        { q && <>
            <h1>Question {questionId}</h1>
            <div className="Question">{q.question}</div>
            <Container className="mb-3">
                <Row>{ q.choices.map((choice, idx) =>
                    <Col lg={6} key={idx} className="p-2">
                        <AnswerChoice label={labelForChoiceIndex(idx)} value={choice}/>
                    </Col>
                )}</Row>
            </Container>
        </>}
        { isQuestionOpen
        ? <>
            TODO: Progressbar
            <Button onClick={closeQuestion}>Close Question</Button>
        </>
        : ( availableQuestions.length > 0
            ? <Button onClick={gotoNextQuestion}>Next Question</Button>
            : <Button>End Quiz</Button>
        )}
    </div>);
}
import Button from 'react-bootstrap/esm/Button';
import Container from 'react-bootstrap/esm/Container';
import Col from 'react-bootstrap/Col';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Row from 'react-bootstrap/Row';

import { labelForChoiceIndex } from '../utils';
import { AnswerChoice } from './AnswerChoice';

export function QuizQuestion({
    websocket, quizId, players, poolQuestions, questions, questionId, isQuestionOpen, answers
}) {

    console.info({ players, poolQuestions, questions, answers });
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
    const numPlayers = Object.keys(players).length;
    const a = answers[questionId] || {};
    const numAnswers = Object.keys(a).length;

    return (<div className="QuizQuestion">
        { q && <>
            <h1>Question {questionId}</h1>
            <div className="Question">{q.question}</div>
            <Container className="mb-3">
                { isQuestionOpen
                ? <>
                    <Row>{ q.choices.map((choice, idx) =>
                        <Col lg={6} key={idx} className="p-2">
                            <AnswerChoice label={labelForChoiceIndex(idx)} value={choice}/>
                        </Col>
                    )}</Row>
                    <Row>
                        <ProgressBar now={100 * numAnswers / numPlayers} label={`${numAnswers}/${numPlayers}`}/>
                    </Row>
                </>
                : q.choices.map((choice, idx) => {
                    const n = Object.values(a).filter((answer) => (answer == idx + 1)).length;

                    return <Row>
                        <Col lg={12} key={idx} className="p-2">
                            <AnswerChoice label={labelForChoiceIndex(idx)} value={choice}/>
                            { numAnswers > 0 && <ProgressBar now={100 * n / numAnswers} label={n} /> }
                        </Col>
                    </Row>
                })}
            </Container>
        </>}
        { isQuestionOpen
        ? <Button onClick={closeQuestion}>Close Question</Button>
        : ( availableQuestions.length > 0
            ? <Button onClick={gotoNextQuestion}>Next Question</Button>
            : <Button>End Quiz</Button>
        )}
    </div>);
}
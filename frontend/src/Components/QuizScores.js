import Container from 'react-bootstrap/esm/Container';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import config from '../utils/config';
import { ScoreTable } from './ScoreTable';

function questionScoreFormula(numCorrect, numAnswers) {
    if (numAnswers < config.QSCORE_MIN_ANSWERS) {
        return 0;
    }

    const targetRatio = 5 / 8;
    const maxDelta = 3 / 8;
    const correctRatio = numCorrect / numAnswers;

    const badness = Math.abs(correctRatio - targetRatio) / maxDelta;
    const score = Math.round(Math.max(0, (1 - badness) * config.QSCORE_MAX));

    return score;
}

function questionScore(question, answers) {
    const numCorrect = Object.values(answers).filter(
        (answer) => (answer === question.answer)).length;
    const numAnswers = Object.keys(answers).length;

    return questionScoreFormula(numCorrect, numAnswers);
}

export function QuizScores({ players, questions, answers }) {
    const scores = Object.fromEntries(Object.keys(players).map((playerId) => [
        playerId,
        Object.entries(questions).map(([questionId, question]) =>
            answers[questionId]?.[playerId] === question.answer ? 1 : 0
        ).reduce((x, y) => x+y, 0)
    ]));
    const questionScores = Object.fromEntries(Object.entries(questions).map(([questionId, question]) => [
        question.author_id,
        questionScore(question, answers[questionId] || {})
    ]));
    const totalScores = Object.fromEntries(Object.entries(scores).map(([playerId, score]) => [
        playerId,
        score + (questionScores[playerId] || 0)
    ]));

    return <Container>
        <Row>
            <Col xl={6}>
                <ScoreTable players={players} scores={scores} header="Answers" maxSize={5} />
            </Col>
            <Col xl={6}>
                <ScoreTable players={players} scores={totalScores} header="Total" maxSize={5} />
            </Col>
        </Row>
    </Container>
}
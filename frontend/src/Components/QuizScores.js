import Container from 'react-bootstrap/esm/Container';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import { ScoreTable } from './ScoreTable';

export function QuizScores({ players, questions, answers }) {
    const scores = Object.fromEntries(Object.keys(players).map((player_id) => [
        player_id,
        Object.entries(questions).map(([question_id, question]) =>
            answers[question_id]?.[player_id] === question.answer ? 1 : 0
        ).reduce((x, y) => x+y, 0)
    ]));

    return <Container>
        <Row>
            <Col lg={6}>
                <ScoreTable players={players} scores={scores} header="Answers" maxSize={5} />
            </Col>
        </Row>
    </Container>
}
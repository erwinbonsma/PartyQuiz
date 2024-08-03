import Container from 'react-bootstrap/esm/Container';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import { PlayerBadge } from './PlayerBadge';

export function ScoreTable({ players, scores, maxSize, header }) {

    const sortedScores = Object.entries(scores).sort((a, b) => (b[1] - a[1]));
    const topScores = sortedScores.slice(0, maxSize);

    return (<Container className="ScoreTable">
        <Row><h2>{header}</h2></Row>
        <Row className="m-2">
            <Col xs={1}></Col>
            <Col xs={8}>Player</Col>
            <Col xs={3}>Score</Col>
        </Row>
        { topScores.map(([playerId, score], idx) =>
            <Row key={playerId} className="m-2 align-items-center">
                <Col xs={1}>{idx + 1}.</Col>
                <Col xs={8}><PlayerBadge playerName={players[playerId]?.name}
                             avatar={players[playerId]?.avatar}/></Col>
                <Col xs={3}>{score}</Col>
            </Row>
        )}
    </Container>);
}
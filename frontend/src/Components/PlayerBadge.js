import { ReactComponent as CheckmarkIcon } from './icons/checkmark.svg';
import { ReactComponent as ErrorIcon } from './icons/error.svg';

import Container from 'react-bootstrap/esm/Container';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

export function PlayerBadge({ playerName, avatar, status }) {
    const iconPath = process.env.PUBLIC_URL + '/icons/';

    return <Container className="PlayerBadge">
        <Row className="align-items-center px-2 py-1">
            <Col lg={2}>{avatar &&
                <img src={`${iconPath}${avatar}`} height={32} width={32} />}</Col>
            <Col lg={8} className="PlayerName">{playerName}</Col>
            { status &&
                <Col lg={2}>
                    {status.isPresent
                    ? (status.hasQuestion && <CheckmarkIcon height={24} width={24} />)
                    : <ErrorIcon height={24} width={24} />}
                </Col>}
        </Row>
    </Container>
}
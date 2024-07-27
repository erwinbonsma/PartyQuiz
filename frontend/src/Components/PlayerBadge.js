import { ReactComponent as AiIcon } from './icons/ai.svg';
import { ReactComponent as BoardGamesIcon } from './icons/meeple.svg';
import { ReactComponent as CheckmarkIcon } from './icons/checkmark.svg';
import { ReactComponent as ErrorIcon } from './icons/error.svg';
import { ReactComponent as FamilyIcon } from './icons/family.svg';
import { ReactComponent as GoIcon } from './icons/goban.svg';
import { ReactComponent as HighSchoolIcon } from './icons/high-school.svg';
import { ReactComponent as TennisIcon } from './icons/tennis.svg';
import { ReactComponent as UniversityIcon } from './icons/university.svg';


import Container from 'react-bootstrap/esm/Container';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

export function PlayerBadge({ playerName, avatar, status }) {
    const icons = {
        "ai": AiIcon,
        "board games": BoardGamesIcon,
        "family": FamilyIcon,
        "high school": HighSchoolIcon,
        "go": GoIcon,
        "tennis": TennisIcon,
        "university": UniversityIcon,
    };

    const Icon = icons[avatar];

    return <Container className="PlayerBadge">
        <Row className="align-items-center px-2 py-1">
            <Col lg={2}>{Icon && <Icon height={32} width={32} />}</Col>
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
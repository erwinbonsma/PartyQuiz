import { useEffect, useState } from 'react';

import Container from 'react-bootstrap/esm/Container';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import { ReactComponent as CheckmarkIcon } from './icons/checkmark.svg';

export function AnswerChoice({ label, value, isCorrect }) {
    const [reveal, setReveal] = useState(false);

    useEffect(() => {
        const task = setTimeout(() => {
            setReveal(true);
        }, 3000);

        return function cleanup() {
            clearTimeout(task);
        };
    }, []);

    return <Container className="AnswerChoice">
        <Row>
            <Col lg={1} />
            <Col lg={10}>{label}. {value}</Col>
            <Col lg={1} >{ (isCorrect && reveal)
                && <CheckmarkIcon height={24} width={24} />}</Col>
        </Row>
    </Container>;
}
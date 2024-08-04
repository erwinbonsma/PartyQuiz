import { useEffect, useState } from 'react';

import Container from 'react-bootstrap/esm/Container';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

import config from '../utils/config';
import { getRandomKey, isNotEmpty } from '../utils';
import { PlayerBadge } from './PlayerBadge';

export function PlayerLobby({ players, poolQuestions, websocket, observe }) {
    const [previewQuestion, setPreviewQuestion] = useState();
    const [enableQuestionPreview, setEnableQuestionPreview] = useState(false);

    useEffect(() => {
        if (!enableQuestionPreview || poolQuestions.length < config.QUESTION_PREVIEW_LIMIT) {
            setPreviewQuestion(undefined);
            return;
        }

        const task = setInterval(() => {
            setPreviewQuestion(poolQuestions[getRandomKey(poolQuestions)]);
        }, config.QUESTION_PREVIEW_TIME_MS);

        return function cleanup() {
            clearTimeout(task);
        }
    }, [poolQuestions, enableQuestionPreview]);

    useEffect(() => {
        const messageHandler = (event) => {
            const msg = JSON.parse(event.data);

            if (msg.type === "questions-preview") {
                setEnableQuestionPreview(msg.enable);
            }
        };

        websocket.addEventListener('message', messageHandler);

        return function cleanup() {
            websocket.removeEventListener('message', messageHandler);
        }
    }, [websocket]);

    const togglePreview = () => {
        websocket.send(JSON.stringify({
            action: "notify-hosts",
            message: {
                type: "questions-preview",
                enable: !enableQuestionPreview,
            }
        }));
    };

    return (<Container className="PlayerLobby my-3">
        <Row>{ Object.entries(players).map(([k, v]) =>
            <Col md={6} lg={4} xl={3} key={k} className="my-2"><PlayerBadge
                playerName={v.name}
                avatar={v.avatar}
                status={{ isPresent: isNotEmpty(v.connections), hasQuestion: !!poolQuestions[k] }} />
            </Col>
        )}</Row>
        <Row className="pt-3">
            { !observe && <Col md={3}><Form>
                <Form.Check type="switch" label="Preview questions" checked={enableQuestionPreview}
                 onClick={togglePreview}
                />
            </Form></Col>}
            { previewQuestion && <Col className="Question">{previewQuestion.question}</Col>}
        </Row>
    </Container>);
}
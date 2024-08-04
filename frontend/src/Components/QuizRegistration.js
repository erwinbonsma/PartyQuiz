import { useForm } from 'react-hook-form';

import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

import { getConfigSetting, getConfigSettings, handleResponse } from '../utils';

export function QuizRegistration({ getWebsocket, playerName, quizId, onDone }) {
    const {register, handleSubmit, formState: { errors }} = useForm();

    const avatarOptions = Object.fromEntries(
        getConfigSettings(document, 'cfg-avatar')
        .map((v) => {
            const pos = v.indexOf(';');
            return (pos < 0
                ? [v, v]
                : [v.slice(0, pos), v.slice(pos + 1)]);
        })
    );
    const numAvatarOptions = Object.keys(avatarOptions).length;

    const onSubmit = (data) => {
        const onRegister = (websocket) => {
            handleResponse(websocket, (msg) => {
                onDone(msg.client_id, msg.quiz_id);
            });

            const avatar = (numAvatarOptions > 1
                ? data.avatar
                : (numAvatarOptions == 1) ? avatarOptions.keys()[0] : undefined
            );

            websocket.send(JSON.stringify({
                action: "register",
                quiz_id: quizId,
                player_name: data.name,
                avatar: avatar,
            }));
        };

        getWebsocket(onRegister);
    };

    return <>
        <h1>Quiz Registration</h1>
        <Form onSubmit={handleSubmit(onSubmit)} noValidate className="mx-2">
            <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={5}>Name</Form.Label>
                <Col sm={7}>
                    <Form.Control type="input"
                     isInvalid={!!errors.name}
                     value={playerName}
                     {...register("name", { required: true, maxLength: 12 })}/>
                    {errors.name?.type === "required" && (
                        <Form.Control.Feedback type="invalid">This is required</Form.Control.Feedback>
                    )}
                    {errors.name?.type === "maxLength" && (
                        <Form.Control.Feedback type="invalid">Name is too long</Form.Control.Feedback>
                    )}
                </Col>
            </Form.Group>
            { numAvatarOptions > 1
            && <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={5}>{getConfigSetting(document, 'cfg-avatar-selection-label')}</Form.Label>
                <Col sm={7}>
                    <Form.Select defaultValue=""
                     isInvalid={!!errors.avatar}
                     {...register("avatar", { required: true, minLength: 1 })}>
                    <option disabled value="">Please select</option>
                    { Object.entries(avatarOptions).map(([k, v]) =>
                        <option value={k} key={k}>{v}</option>)}
                    </Form.Select>
                </Col>
            </Form.Group>}
            <Button type="submit">Register</Button>
        </Form>
    </>;
}
import { useForm } from 'react-hook-form';

import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

import config from '../utils/config';
import { handleResponse } from '../utils';

export function SubmitQuestion({ websocket, quizId, onDone }) {
    const {register, handleSubmit, formState: { errors }} = useForm();

    const choices = Array(config.NUM_CHOICES).fill(0).map((_, idx) => idx + 1);

    console.info("errors", errors);

    const onSubmit = (data) => {
        console.info(data);

        handleResponse(websocket, onDone);

        websocket.send(JSON.stringify({
            action: "set-pool-question",
            quiz_id: quizId,
            question: data.question,
            // TODO: Get dynamically
            choices: [data.choice_1, data.choice_2, data.choice_3, data.choice_4],
            answer: parseInt(data.answer)
        }));
    };

    return <>
        <h1>Your Question</h1>
        <Form onSubmit={handleSubmit(onSubmit)} noValidate className="mx-2">
            <Form.Group as={Row}>
                <Form.Label column sm={3} lg={2}>Question</Form.Label>
                <Col sm={9} lg={10}>
                    <Form.Control as="textarea" rows={3}
                     isInvalid={!!errors.question}
                     {...register("question", { required: true,
                                                minLength: config.RANGE_QUESTION_LENGTH[0],
                                                maxLength: config.RANGE_QUESTION_LENGTH[1] })}/>
                    {errors.question?.type === "required" && (
                        <Form.Control.Feedback type="invalid">This is required</Form.Control.Feedback>
                    )}
                    {errors.question?.type === "minLength" && (
                        <Form.Control.Feedback type="invalid">The question is too short</Form.Control.Feedback>
                    )}
                    {errors.question?.type === "maxLength" && (
                        <Form.Control.Feedback type="invalid">The question is too long</Form.Control.Feedback>
                    )}
                </Col>
            </Form.Group>
            <br/>
            { choices.map((choice, _) => {
                const fieldName = `choice_${choice}`;

                return <div key={choice}>
                    <Form.Group as={Row} className="mb-3">
                        <Form.Label column sm={3} lg={2}>Answer {choice}</Form.Label>
                        <Col sm={9} lg={10}>
                            <Form.Control type="input"
                            isInvalid={!!errors[fieldName]}
                            {...register(fieldName, { required: true,
                                                                minLength: config.RANGE_CHOICE_LENGTH[0],
                                                                maxLength: config.RANGE_CHOICE_LENGTH[1] })} />
                            {errors[fieldName]?.type === "required" && (
                                <Form.Control.Feedback type="invalid">This is required</Form.Control.Feedback>
                            )}
                            {errors[fieldName]?.type === "minLength" && (
                                <Form.Control.Feedback type="invalid">The answer is too short</Form.Control.Feedback>
                            )}
                            {errors[fieldName]?.type === "maxLength" && (
                                <Form.Control.Feedback type="invalid">The answer is too long</Form.Control.Feedback>
                            )}
                        </Col>
                    </Form.Group>
                </div>
            })}
            <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3} lg={2}>Solution</Form.Label>
                <Col sm={9} lg={10}>
                    <Form.Select
                     defaultValue=""
                     isInvalid={!!errors.answer}
                     {...register("answer", { required: true, minLength: 1 })}>
                    <option disabled value="">Please select</option>
                    { choices.map((choice, _) =>
                        <option value={choice} key={choice}>Answer {choice}</option>)}
                    </Form.Select>
                </Col>
            </Form.Group>
            <Button type="submit">Submit Question</Button>
        </Form>
    </>;
}

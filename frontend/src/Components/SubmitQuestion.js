import { useForm } from 'react-hook-form';

import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

import config from '../utils/config';
import { handleResponse, labelForChoiceIndex } from '../utils';

export function SubmitQuestion({ websocket, quizId, question, enableCancel, onDone }) {
    const {register, handleSubmit, formState: { errors }} = useForm();

    const choices = Array(config.NUM_CHOICES).fill(0).map((_, idx) => ({
        id: idx + 1,
        label: labelForChoiceIndex(idx),
    }));

    const onSubmit = (data) => {
        console.info(data);

        const question = {
            question: data.question,
            choices: choices.map((choice, _) => data[`choice_${choice.id}`]),
            answer: parseInt(data.answer),
        };

        handleResponse(websocket, () => {
            onDone({ ...question });
        });

        websocket.send(JSON.stringify({
            action: "set-pool-question",
            quiz_id: quizId,
            ...question
        }));
    };

    return <>
        <h1>Your Question</h1>
        <Form onSubmit={handleSubmit(onSubmit)} noValidate className="mx-2">
            <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3} lg={2}>Question</Form.Label>
                <Col sm={9} lg={10}>
                    <Form.Control as="textarea" rows={3}
                     defaultValue={question?.question}
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
            { choices.map((choice, idx) => {
                const fieldName = `choice_${choice.id}`;

                return <div key={choice.id}>
                    <Form.Group as={Row} className="mb-3">
                        <Form.Label column sm={3} lg={2}>Answer {choice.label}</Form.Label>
                        <Col sm={9} lg={10}>
                            <Form.Control type="input"
                            defaultValue={question?.choices[idx]}
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
                     defaultValue={question?.answer || ""}
                     isInvalid={!!errors.answer}
                     {...register("answer", { required: true, minLength: 1 })}>
                    <option disabled value="">Please select</option>
                    { choices.map((choice, _) =>
                        <option value={choice.id} key={choice.id}>Answer {choice.label}</option>)}
                    </Form.Select>
                </Col>
            </Form.Group>
            <Button type="submit">Submit Question</Button>
            { enableCancel && <Button onClick={() => onDone(question)}>Cancel</Button> }
        </Form>
    </>;
}

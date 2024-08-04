const configSettings = {
	SERVICE_ENDPOINT: 'ws://127.0.0.1:8765',
    //SERVICE_ENDPOINT: 'wss://ouj04zz7t3.execute-api.eu-west-1.amazonaws.com/dev',

    NUM_CHOICES: 4,

    RANGE_QUESTION_LENGTH: [10, 160],
    RANGE_CHOICE_LENGTH: [1, 80],

    QSCORE_MIN_ANSWERS: 5,
    QSCORE_MAX: 5,

    QUESTION_PREVIEW_LIMIT: 3,
    QUESTION_PREVIEW_TIME_MS: 3000,
};

export default configSettings;
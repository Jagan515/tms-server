const logger = require('../utility/logger');

const requiredEnvVars = [
    'PORT',
    'MONGO_DB_CONNECTION_URL',
    'JWT_SECRET',
    'CLIENT_URL'
];

const validateEnv = () => {
    const missingVars = requiredEnvVars.filter(key => !process.env[key]);

    if (missingVars.length > 0) {
        logger.error(` Missing mandatory environment variables: ${missingVars.join(', ')}`);
        logger.error('The server will not start until these are provided in the .env file.');
        process.exit(1);
    }

    logger.info(' Environment variables validated successfully.');
};

module.exports = validateEnv;

require('dotenv').config();
const { Model } = require('objection');
const Knex = require('knex');

const connectToDB = () => {

    const databaseUrl = process.env.DB_ENB == 'PROD' ? process.env.DB_HOST_OFFICE : process.env.DB_HOST_PROD;

    if (!databaseUrl) {
        console.error('DATABASE_URL is not set in environment variables.');
        process.exit(1);
    }

    const db = process.env.DB_DATABASE;
    const user = process.env.DB_USERNAME;
    const pwd = process.env.DB_PASSWORD;


    const connectionString = `mysql://${user}:${pwd}@${databaseUrl}:3306/${db}`;

    const knex = Knex({
        client: 'mysql2',
        connection: connectionString,
        pool: {
            min: 2,
            max: 10,
            acquireTimeoutMillis: 30000,
            idleTimeoutMillis: 30000,
            reapIntervalMillis: 5000,
        },
        debug: false,
    });

    knex
        .raw('SELECT 1+1 AS result')
        .then(() => {
            console.log('Database connection successful!');
            Model.knex(knex);
        })
        .catch((err) => {
            console.error('Database connection error:', err);
            process.exit(1);
        });

    knex.on('error', async (err) => {
        console.error('Knex error:', err);
        if (err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.log('Reconnecting to MySQL...');
            await knex.destroy();
            connectToDB();
        }
    });

    // Keep-alive query to prevent MySQL from closing idle connections
    setInterval(async () => {
        try {
            await knex.raw('SELECT 1');
            console.log('Keep-alive query executed.');
        } catch (err) {
            console.error('Keep-alive query failed:', err);
        }
    }, 60000); // Every 60 seconds

    return knex;
};

module.exports = connectToDB;

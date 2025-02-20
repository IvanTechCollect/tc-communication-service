require('dotenv').config();
const { Model } = require('objection');
const Knex = require('knex');

const connectToDB = () => {
    const databaseUrl = process.env.DB_ENV === 'PROD' ? process.env.DB_HOST_PROD : process.env.DB_HOST_OFFICE;

    if (!databaseUrl) {
        console.error('DATABASE_URL is not set in environment variables.');
        process.exit(1);
    }

    const db = process.env.DB_DATABASE;
    const user = process.env.DB_USERNAME;
    const pwd = process.env.DB_PASSWORD;

    // ✅ Use an object instead of a raw connection string
    const knex = Knex({
        client: 'mysql2',
        connection: {
            host: databaseUrl,
            user: user,
            password: pwd,
            database: db,
            port: 3306,
            connectTimeout: 30000
        },
        pool: {
            min: 2,
            max: 10,
            acquireTimeoutMillis: 30000,
            idleTimeoutMillis: 30000,
            reapIntervalMillis: 5000,
        },
        debug: false,
    });

    knex.raw('SELECT 1+1 AS result')
        .then(() => {
            console.log('Database connection successful!');
            Model.knex(knex);
        })
        .catch((err) => {
            console.error('Database connection error:', err);
            process.exit(1);
        });

    // ✅ Ensure reconnection properly updates the global connection
    knex.on('error', async (err) => {
        console.error('Knex error:', err);
        if (err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.log('Reconnecting to MySQL...');
            await knex.destroy();
            global.knex = connectToDB();
        }
    });

    // ✅ Run keep-alive only if connection is active
    setInterval(async () => {
        if (!global.knex) return;
        try {
            await global.knex.raw('SELECT 1');
            console.log('Keep-alive query executed.');
        } catch (err) {
            console.error('Keep-alive query failed, reconnecting:', err);
            global.knex = connectToDB();
        }
    }, 60000);

    return knex;
};

// ✅ Store the connection globally
global.knex = connectToDB();

module.exports = connectToDB;

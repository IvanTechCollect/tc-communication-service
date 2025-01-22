require('dotenv').config();

const { Model } = require('objection');

const Knex = require('knex');


const connectToDB = () => {

    const env = process.env.DB_ENV;

    let host = env === 'LOCAL' ? process.env.DB_HOST_OFFICE : process.env.DB_HOST_PROD;
    let databaseName = env === 'LOCAL' ? process.env.DB_DATABASE_LOCAL : process.env.DB_DATABASE;

    const knex = Knex({
        client: 'mysql2',
        connection: {
            host: host,      // DB_HOST
            port: process.env.DB_PORT,              // DB_PORT
            user: process.env.DB_USERNAME,      // DB_USERNAME
            password: process.env.DB_PASSWORD,
            database: databaseName,  // DB_DATABASE
        },
    });

    knex.raw('select 1+1 as result')
        .then(() => {
            console.log('Database connection successful!');
            Model.knex(knex);
        })
        .catch(err => {
            console.error('Database connection error:', err.message);
        });


}



module.exports = connectToDB;
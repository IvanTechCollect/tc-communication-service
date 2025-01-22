require('dotenv').config();

const express = require('express');
const app = express();
const PORT = process.env.PORT || 7500;

const connectDb = require('./config/db.Conn');
const startRedis = require('./config/redis');
const createQueue = require('./config/bullQueue');
const { readLog } = require('./controllers/communicationController');
const sgClient = require('@sendgrid/client');

const connectToMongoDb = require('./config/mongoDbConn');
const apiKeyMiddleware = require('./middleware/checkAuth');


//connectDb();
app.use(express.json()); // For JSON bodies
app.use(express.urlencoded({ extended: true })); // For URL-encoded bodies

connectDb();
connectToMongoDb();


app.get('/', async (req, res) => {
    res.send('Hello World');
})

app.post('/webhook', (req, res) => {

    console.log(req.body);
    res.send('WEBHOOK');
})


app.get('/sendgrid', async (req, res) => {
    sgClient.setApiKey(process.env.SENDGRID_API_KEY);
    console.log(process.env.SENDGRID_API_KEY);
    try {
        const response = await sgClient.request({
            method: 'GET',
            url: '/v3/messages',
            qs: {
                query: `last_event_time BETWEEN TIMESTAMP '2025-01-14T00:00:00' AND TIMESTAMP '2025-01-21T23:59:59'`,
                limit: 10, // Number of records to retrieve
            },
        });

        const data = response[1].messages; // The activity data
        console.log('Activity Feed:', data);

        let result = [];

        data.forEach(message => {
            result.push({
                Status: message.status,
                To: message.to_email,
                Subject: message.subject,
                LastEventTime: message.last_event_time,
                Opens: message.opens_count || 0,
                Clicks: message.clicks_count || 0,
            });
        });

        return res.json(result);

    } catch (error) {
        res.sendStatus(500);
        console.error('Error fetching activity feed:', error.response ? error.response.body : error.message);
    }

})

app.use('/private', apiKeyMiddleware, require('./routes/private'))

app.listen(PORT, () => {

    console.log('Server Listening on Port', PORT);

})



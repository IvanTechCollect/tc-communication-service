require('dotenv').config();

const express = require('express');
const app = express();
const PORT = process.env.PORT || 7500;

const connectDb = require('./config/db.Conn');
const startRedis = require('./config/redis');
const { readLog, sendCommunicationCall } = require('./controllers/communicationController');

const connectToMongoDb = require('./config/mongoDbConn');
const apiKeyMiddleware = require('./middleware/checkAuth');
const { testQueue } = require('./jobs/testJob');
const { uploadBlob } = require('./controllers/azureController');
const { convertHtmlToPdfFile } = require('./controllers/fileController');
const { addLetterToQueue } = require('./jobs/letterJob');
const { makeCall } = require('./controllers/twilioController');
const { addCallToQueue } = require('./jobs/callJob');


//connectDb();
app.use(express.json()); // For JSON bodies
app.use(express.urlencoded({ extended: true })); // For URL-encoded bodies

connectDb();
connectToMongoDb();
startRedis();

// Endpoint to add a job to the queue
app.get('/', async (req, res) => {

    return res.send('Hello World');

});







// Process the jobs in the queue


app.post('/oauth/token', async (req, res) => {

    try {
        console.log(req.body);

        return res.send(null);
    } catch (error) {

        console.log(error);
    }



})




app.use('/webhooks', require('./routes/webhook'));


app.use('/private', apiKeyMiddleware, require('./routes/private'))

app.listen(PORT, () => {

    console.log('Server Listening on Port', PORT);

})



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
startRedis();

app.get('/', async (req, res) => {
    res.send('Hello World. Starting the process');

    setTimeout(() => {

        console.log('Process Finished');

    }, 5000)
})


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



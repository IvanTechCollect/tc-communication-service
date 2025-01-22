const mongoose = require('mongoose');
require('dotenv').config();

const connectToMongoDB = async () => {
    const URI = process.env.MONGO_URI;
    const options = {

    };

    try {
        await mongoose.connect(URI, options);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
    }
};



module.exports = connectToMongoDB;

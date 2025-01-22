const fs = require('fs').promises;
const path = require('path');


const createLog = async (action, message, success, logType) => {


    try {
        const fileName = logType === 'queue' ? 'queue.log' : 'communication.log';
        const filePath = path.join(__dirname, '..', 'logs', fileName);

        const newLog = {
            action: action,
            message: message,
            success: true,
            date: new Date()
        }

        fs.appendFile(filePath, `${JSON.stringify(newLog)}\n`);

    } catch (error) {
        const filePath = path.join(__dirname, '..', 'logs', 'error.log');

    }


}

module.exports = { createLog };
const createQueue = require("../config/bullQueue");
const { createLog } = require("./logController")

const readLog = async (req, res) => {


    const writeToFile = async (data) => {

        await createLog('writeFile', `writing file ${data.i}`);

    }


    //for item of items run create a 

    const logQueue = createQueue('logQueue', writeToFile, { concurrency: 1, duration: 3000 })

    let i = 0;

    while (i < 5) {
        await logQueue.addJob({ i: i });
        console.log(`Job ${i} added`);
        i++;
        await new Promise((resolve) => setTimeout(resolve, 3000)); // 1-second delay
    }


    return res.sendStatus(200);


}


module.exports = { readLog }    
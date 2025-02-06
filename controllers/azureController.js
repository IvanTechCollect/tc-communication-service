const { BlobServiceClient } = require('@azure/storage-blob');
const { convertHtmlToPdfFile } = require('./fileController');
require('dotenv').config();

const connectionString = process.env.AZURE_CONNECTION;

const env = process.env.DB_ENV;

let containerName = '';

switch (env) {
    case 'LOCAL':
        containerName = 'techcollectstaging';
        break;
    case 'PROD':
        containerName = 'techcollectprod';
        break;
}

const uploadBlob = async (fileContent, fileName) => {

    try {
        const blobClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobClient.getContainerClient(containerName);

        const blobName = fileName;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        let content = fileContent;

        if (blobName.includes('.pdf')) {
            content = await convertHtmlToPdfFile(fileContent);
        }


        const uploadedResponse = await blockBlobClient.upload(content, content.length);

        console.log(`Upload block blob ${blobName} successfully`);

        return { result: true, url: blockBlobClient.url };
    } catch (error) {
        console.log(containerName, connectionString);
        return { result: false }
    }



}




module.exports = { uploadBlob }
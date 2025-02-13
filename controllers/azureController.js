const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require("@azure/storage-blob");
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

const getAzureFileSAS = async (fileName) => {
    try {
        // Create BlobServiceClient
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(fileName);

        // Define permissions (read-only) and expiry time
        const expiresOn = new Date();
        expiresOn.setHours(expiresOn.getHours() + 1); // Expires in 1 hour
        const sasOptions = {
            expiresOn: expiresOn, // Link valid for 1 hour
            permissions: BlobSASPermissions.parse("r"), // Read-only permission
        };

        // Generate SAS token
        const sasToken = generateBlobSASQueryParameters(
            {
                containerName: containerName,
                blobName: fileName,
                permissions: sasOptions.permissions,
                expiresOn: sasOptions.expiresOn,

            },
            new StorageSharedKeyCredential(process.env.AZURE_ACCOUNT,
                process.env.AZURE_KEY)
        );

        // Construct the download link
        const downloadLink = `${blobClient.url}?${sasToken}`;
        return downloadLink;

    } catch (error) {
        console.error("Error generating download link:", error.message);
        return null;
    }



}




module.exports = { uploadBlob, getAzureFileSAS }
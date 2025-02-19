const axios = require('axios');
const FormData = require('form-data');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const saveLetterToZipFile = async (pdfBuffer, foundUnit, foundCompany, foundCommunity, fileName, pdfName) => {

    try {
        const tabValues = generateTabValues(foundUnit, foundCompany, foundCommunity, pdfName);

        const zipFilePath = path.join('/tmp', `${fileName}.zip`);

        // Create a file output stream
        const output = fs.createWriteStream(zipFilePath);

        // Create an archiver instance
        const archive = archiver('zip', {
            zlib: { level: 9 } // Set compression level (0-9)
        });

        // Pipe archive data to the output file
        archive.pipe(output);

        // Add the PDF file buffer to the ZIP archive
        archive.append(pdfBuffer, { name: `${pdfName}.pdf` });

        // Optionally, add other files or metadata to the ZIP

        const tabFileContent = writeTabbedFile(tabValues, false);

        archive.append(tabFileContent, { name: `${pdfName}.tab` });

        // Finalize the archive
        await archive.finalize();

        return true; // Return the path of the saved zip file
    } catch (error) {
        console.log(error);
        return false;
    }

};

const generateTabValues = (foundUnit, foundCompany, foundCommunity, pdfName) => {

    const userName = `${foundUnit.unit_name}`;
    const unitId = foundUnit.id;
    let mailAddress = '';
    let cityStateZip = '';

    if (!foundUnit.mail_address) {
        mailAddress = foundCompany.address1;
        cityStateZip = `${foundUnit.city}, ${foundUnit.state} ${foundUnit.zip_code}`
    } else {
        mailAddress = foundUnit.mail_address;
        cityStateZip = `${foundUnit.mail_city}, ${foundUnit.mail_state} ${foundUnit.mail_zip_code}`;
    }

    const returnUserName = `${foundCommunity.community_name}, c/o ${foundCompany.company_name}`;
    const returnMailAddress = foundCompany.address1;
    const returnCityStateZip = `${foundCompany.city}, ${foundCompany.state} ${foundCompany.zip_code}`;

    const trackingData = unitId + Date.now();
    return [
        [unitId, userName, mailAddress, cityStateZip, '', '', '1', '1', pdfName, returnUserName, returnMailAddress, returnCityStateZip, '', trackingData]
    ]

}

const writeTabbedFile = (array, saveKeys = false) => {
    let content = '';

    // Iterate over each row in the array of arrays
    for (let row of array) {
        // Iterate over each element in the row
        row = row.map(val => typeof val === 'string' ? val.replace(/\t/g, ' ') : val); // Replace tabs in values

        // If saving keys, include them as the first row
        if (saveKeys) {
            content += row.join('\t') + '\n';
            saveKeys = false; // Prevent keys from being added more than once
        } else {
            content += row.join('\t') + '\n';
        }
    }

    try {

        return content;

    } catch (error) {
        console.error(error);
        return false;
    }
}

const sendLetterToOsg = async (certified = 0, processorId) => {
    console.log("Certified:", certified);

    try {
        const form = new FormData();
        let product = certified === 1 ? 'CRT' : 'GM';
        form.append('product', product);
        form.append('processor_id', processorId);

        // Set correct file path in Render (use /tmp/)
        const filePath = path.join('/tmp', 'tempLetter.zip');

        // Ensure file exists
        if (!fs.existsSync(filePath)) {
            console.error("❌ Error: ZIP file does not exist at", filePath);
            return [false, "File not found"];
        }

        // Check file size
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
            console.error("❌ Error: ZIP file is empty", filePath);
            return [false, "Empty file"];
        }
        console.log("✅ File exists, size:", stats.size, "bytes");

        // Attach file (must match Laravel behavior)
        form.append('file', fs.createReadStream(filePath), {
            filename: 'invoicezipfile.zip',
            contentType: 'application/zip',
        });

        // Authentication
        const username = process.env.OSG_USERNAME;
        const password = process.env.OSG_PWD;
        if (!username || !password) {
            console.error("❌ Error: Missing OSG credentials.");
            return [false, "Missing credentials"];
        }

        const authString = Buffer.from(`${username}:${password}`).toString('base64');

        // Log headers for debugging
        console.log("🔍 Headers Sent:", form.getHeaders());

        const formEntries = {};
        for (const [key, value] of form) {
            formEntries[key] = value instanceof fs.ReadStream ? `File: ${value.path}` : value;
        }
        console.log("🔍 FormData Contents:", formEntries);


        // Send request
        const response = await axios.post('https://orders.optimaloutsource.com/rest/api/1/order/new/', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Basic ${authString}`,
            },
            maxBodyLength: Infinity, // Prevents file size errors
        });



        const data = response.data;

        if (data.portal_number) {
            console.log("✅ Upload successful:", data);

            // Delete temporary file
            fs.unlinkSync(filePath);
            console.log("✅ Temporary ZIP file deleted:", filePath);

            return [true, data];
        } else {
            console.error("❌ Error: No portal_number received", data);
            return [false, "No portal number"];
        }
    } catch (error) {
        if (error.response) {
            console.error("❌ Axios Error:", error.response.status, error.response.data);
            return [false, error.response.data];
        } else {
            console.error("❌ Unexpected Error:", error.message);
            return [false, error.message];
        }
    }
};


module.exports = { saveLetterToZipFile, sendLetterToOsg }
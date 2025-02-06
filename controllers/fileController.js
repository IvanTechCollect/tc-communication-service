const fsPromises = require('fs').promises;
const htmlPdf = require('html-pdf-node');
const pdfParse = require('pdf-parse');

// Convert PDF to base64-encoded string
const convertPdfToBlob = async (filePath) => {
    try {
        // Read the PDF file and convert it to base64
        const result = await fsPromises.readFile(filePath, 'base64');
        return result; // return the base64 string
    } catch (error) {
        console.error('Error reading PDF file:', error);
        return false; // return false on error
    }
};

// Convert HTML to a text file (without base64 encoding)
async function convertHtmlToPdfFile(htmlContent, returnNumPages = null) {
    const options = { format: 'Letter' }; // Specify PDF options
    const file = { content: htmlContent };

    try {
        // Generate PDF and wait for it to complete
        const pdfBuffer = await htmlPdf.generatePdf(file, options);
        // Save the PDF to the output file path

        if (returnNumPages) {
            const pdfMetadata = await pdfParse(pdfBuffer);
            const numPages = pdfMetadata.numpages;
            return { pdfBuffer, numPages };
        }

        return pdfBuffer;

    } catch (error) {
        console.error('Error creating PDF:', error);
        return false;
    }
}

module.exports = { convertPdfToBlob, convertHtmlToPdfFile };

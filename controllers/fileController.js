const fsPromises = require('fs').promises;
const htmlPdf = require('html-pdf-node');
const pdfParse = require('pdf-parse');
const puppeteer = require('puppeteer');

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
async function convertHtmlToPdfFile(htmlContent, returnNumPages = null) {
    try {
        // Launch Puppeteer instance (Docker-friendly settings)
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required for Docker & server environments
            headless: true,
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle2' });

        // Generate PDF
        const pdfBuffer = Buffer.from(await page.pdf({
            format: 'Letter',
            printBackground: true,
        }));


        await browser.close();

        if (returnNumPages) {
            const pdfMetadata = await pdfParse(pdfBuffer);
            return { pdfBuffer, numPages: pdfMetadata.numpages };
        }

        return pdfBuffer;

    } catch (error) {
        console.error('Error creating PDF:', error);
        return false;
    }
}

// Convert HTML to a text file (without base64 encoding)



module.exports = { convertHtmlToPdfFile };


module.exports = { convertPdfToBlob, convertHtmlToPdfFile };

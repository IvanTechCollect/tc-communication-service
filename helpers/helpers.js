
const Credential = require('../models/Credential');
const { JSDOM } = require('jsdom');
const htmlPdf = require('html-pdf-node');

const getCredentials = async (companyId) => {

    const foundCredentials = await Credential.findOne({ companyId: companyId }).exec();

    return foundCredentials;

}

function cleanHTML(input) {
    // Parse the HTML string with jsdom
    const dom = new JSDOM(input);
    const document = dom.window.document;

    // Remove <style> tags
    document.querySelectorAll('style').forEach(style => style.remove());

    // Extract and clean the text content
    const cleanedText = Array.from(document.body.childNodes)
        .map(node => node.textContent.trim())
        .filter(text => text.length > 0) // Remove empty strings
        .join(' '); // Combine text into a single string

    return cleanedText;
}



const puppeteer = require('puppeteer');
const fs = require('fs').promises;

async function createPDF(htmlContent, outputPath) {
    const options = { format: 'Letter' }; // Specify PDF options
    const file = { content: htmlContent };

    try {
        // Generate PDF and wait for it to complete
        const pdfBuffer = await htmlPdf.generatePdf(file, options);

        // Save the PDF to the output file path
        await fs.writeFile(outputPath, pdfBuffer);

        return true;

    } catch (error) {
        console.error('Error creating PDF:', error);
        return false;
    }
}

async function convertPDFToBase64(filePath) {
    try {
        // Read the PDF file as a Buffer
        const fileBuffer = await fs.readFile(filePath);

        // Convert Buffer to Base64 string
        const base64String = fileBuffer.toString('base64');
        return base64String;
    } catch (error) {
        console.error('Error reading the PDF file:', error);
    }
}

module.exports = { getCredentials, cleanHTML, createPDF, convertPDFToBase64 }


// Generate the PDF and convert it to Base64
const outputPath = 'output.pdf';

/*  */

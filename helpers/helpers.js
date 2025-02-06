
const Credential = require('../models/Credential');
const { JSDOM } = require('jsdom');
const htmlPdf = require('html-pdf-node');

const getCredentials = async (companyId) => {

    const foundCredentials = await Credential.findOne({ companyId: companyId }).exec();

    return foundCredentials;

}

function htmlToString(input) {

    const hasHTMLTags = /<\/?[a-z][\s\S]*>/i.test(input);
    if (!hasHTMLTags) {
        return input.trim(); // Return plain text as-is
    }

    // Parse the HTML with JSDOM
    const dom = new JSDOM(input);
    const document = dom.window.document;

    // Remove <style> and <script> tags
    document.querySelectorAll("style, script").forEach((el) => el.remove());

    // Get plain text and decode HTML entities
    const cleanedText = document.body?.textContent.trim() || "";

    return cleanedText;
}

function cleanHTML(input) {
    // Check if the input contains HTML-like structures
    const hasHTMLTags = /<\/?[a-z][\s\S]*>/i.test(input);

    if (!hasHTMLTags) {
        return input.trim(); // Return plain text as-is
    }

    // Parse the HTML string with JSDOM
    const dom = new JSDOM(input);
    const document = dom.window.document;

    // Remove <style> tags
    document.querySelectorAll("style").forEach((style) => style.remove());

    // Ensure document.body exists before accessing childNodes
    const cleanedText = document.body
        ? Array.from(document.body.childNodes)
            .map((node) => node.textContent.trim())
            .filter((text) => text.length > 0)
            .join(" ")
        : input.trim(); // Fallback for non-HTML input

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

function prepareHTMLForTranslation(html) {
    // Extract Base64 image sources
    const base64Regex = /<img\s+[^>]*src=["'](data:image\/[^;]+;base64,[^"']+)["'][^>]*>/gi;
    let base64Images = [];

    let cleanedHTML = html.replace(base64Regex, (match, base64Data) => {
        base64Images.push(base64Data);
        return `<img src="IMAGE_PLACEHOLDER">`;
    });

    return { cleanedHTML, base64Images };
}

function restoreBase64Images(translatedHTML, base64Images) {
    let index = 0;
    return translatedHTML.replace(/IMAGE_PLACEHOLDER/g, () => base64Images[index++] || '');
}

module.exports = { getCredentials, cleanHTML, createPDF, convertPDFToBase64, htmlToString, prepareHTMLForTranslation, restoreBase64Images }


// Generate the PDF and convert it to Base64
const outputPath = 'output.pdf';

/*  */

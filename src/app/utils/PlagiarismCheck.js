if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const axios = require('axios');
const mammoth = require('mammoth');
const PDFParser = require('pdf-parse');

async function wordConverter(buffer) {
    // Read .docx file and extract text content
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
}

async function pdfConverter(pdfBuffer) {
    const data = await PDFParser(pdfBuffer);

    return data.text; // Extracted text content
}

function divideText(input, maxChars) {
    const paragraphs = input.trim().split(/\n+/);
    const segments = [];
    let currentSegment = '';

    for (let i = 0; i < paragraphs.length; i++) {
        if (paragraphs[i].trim() === '') continue;
        if (currentSegment.length + paragraphs[i].length <= maxChars) {
            currentSegment += paragraphs[i];
        } else {
            segments.push(currentSegment);
            currentSegment = paragraphs[i];
        }
    }

    if (currentSegment) {
        segments.push(currentSegment);
    }

    const finalSegments = [];
    let currentText = '';
    for (let i = 0; i < segments.length; i++) {
        if (currentText.length + segments[i].length <= maxChars) {
            currentText += segments[i];
        } else {
            finalSegments.push(currentText);
            currentText = segments[i];
        }
    }

    if (currentText) {
        finalSegments.push(currentText);
    }

    return finalSegments;
}

const checkForPlagiarism = async (buffer, mimetype) => {
    let text;
    const maxCharsPerSegment = 4000; // Maximum words per segment
    const apiKey = process.env.API_KEY;
    const url =
        'https://plagiarism-checker-and-auto-citation-generator-multi-lingual.p.rapidapi.com/plagiarism';

    if (mimetype == 'application/pdf') text = await pdfConverter(buffer);
    else if (mimetype == 'application/msword')
        text = await wordConverter(buffer);
    else if (mimetype.startsWith('text')) text = buffer.toString('utf8');

    const segments = divideText(text, maxCharsPerSegment);
    const options = {
        method: 'POST',
        url: url,
        headers: {
            'content-type': 'application/json',
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host':
                'plagiarism-checker-and-auto-citation-generator-multi-lingual.p.rapidapi.com',
        },
        data: {
            text: segments[0],
            language: 'en',
            includeCitations: false,
            scrapeSources: false,
        },
    };

    const { data } = await axios.request(options);

    return data;
};

module.exports = { checkForPlagiarism };

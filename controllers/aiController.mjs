import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();

const ai = new OpenAI({
    apiKey: process.env.OPENAI_KEY
});

export const translateToDifferentLanguage = async (input, langCode) => {


    let language = 'Spanish';

    switch (langCode) {

        case 'es':
            language = 'Spanish';
            break;
        default:
            language = 'English';
            break;
    }

    try {
        console.log('Translation to: ', language);
        const response = await ai.chat.completions.create({
            model: "gpt-4", // ✅ Specify the model (e.g., gpt-4 or gpt-3.5-turbo)
            messages: [
                {
                    role: 'system',
                    content: `Translate User Input to ${language}. Do not touch anything like |PAUSE|, any HTML Tags, or anything address related.`
                },
                {
                    role: 'user',
                    content: input
                }
            ]
        });
        return response.choices[0].message.content; // ✅ Correct response structure
    } catch (error) {
        console.log("OpenAI API Error", error);
        return "Translation error occurred.";
    }
};

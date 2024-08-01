import OpenAI from 'openai';
import config from 'config';
import { createReadStream } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

class OpenAi {

    roles = {
        ASSISTANT: 'assistant',
        USER: 'user',
        SYSTEM: 'system'
    }

    constructor(apiKey) {
        this.openai = new OpenAI({
            apiKey: apiKey
        });
    }

    async chat(messages) {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages
            });
            return response.choices[0].message;
        } catch (error) {
            console.error(error.message);
            process.exit(1);
        }
    }

    async transcription(filePath) {
        try {
            const response = await this.openai.audio.transcriptions.create({
                file: createReadStream(filePath),
                model: 'whisper-1'
            });
            return response.text;
        } catch (error) {
            console.error('Error with transcription:', error.message);
        }
    }
}

export const openai = new OpenAi(config.get('OPENAI_API'));

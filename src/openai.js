import { Configuration, OpenAIApi } from "openai"
import config from 'config'
import {createReadStream} from 'fs'
import { createRequire } from "module"

const require = createRequire(import.meta.url)

class OpenAi {

    roles = {
        ASSISTANT: 'assistant',
        USER: 'user',
        SYSTEM: 'system'
    }

    constructor(apiKey) {
        const configuration = new Configuration({
            apiKey
        })
        this.openai = new OpenAIApi(configuration)
    }

    async chat(messages) {
        try {
            const response = await this.openai.createChatCompletion({
                model:'gpt-3.5-turbo-1106',
                messages
            })
            return response.data.choices[0].message

        } catch (error) {
            console.log(error.message)
            process.on('exit', function () {
                require('child_process').spawn(process.argv.shift(), process.argv, {
                  cwd: process.cwd(),
                  detached: true,
                  stdio: 'inherit'
                });
              });
            process.exit(1) 
            }
    }


    async transcription(filePath) {
        try {
          const response = await this.openai.createTranscription(
            createReadStream(filePath),
            'whisper-1'
          )
          return response.data.text
        } catch (error) {
            console.log('error with transcription', error.message)
        }
    }
}




export const openai = new OpenAi(config.get('OPENAI_API'))

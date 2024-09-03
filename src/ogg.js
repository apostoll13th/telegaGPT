import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import { createWriteStream } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import installer from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

class OggConverter {
    constructor() {
        ffmpeg.setFfmpegPath(installer.path);
    }

    ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`Директория создана: ${dirPath}`);
        }
    }

    async create(url, fileName) {
        try {
            const voiceDir = resolve(__dirname, "../voice");
            this.ensureDirectoryExists(voiceDir);

            const oggPath = resolve(voiceDir, `${fileName}.ogg`);
            const response = await axios({
                method: "get",
                url,
                responseType: "stream",
            });

            return new Promise((resolve, reject) => {
                const stream = createWriteStream(oggPath);
                response.data.pipe(stream);
                stream.on('finish', () => resolve(oggPath));
                stream.on('error', (error) => {
                    console.error("Ошибка при записи файла:", error);
                    reject(error);
                });
            });
        } catch (error) {
            console.error("Ошибка при создании файла:", error.message);
            throw error;
        }
    }

    toMP3(input, output) {
        try {
            const outputPath = resolve(dirname(input), `${output}.mp3`);
            return new Promise((resolve, reject) => {
                ffmpeg(input)
                    .inputOption('-t 30')
                    .output(outputPath)
                    .on('end', () => resolve(outputPath))
                    .on('error', (error) => {
                        console.error('Ошибка при конвертации в MP3:', error);
                        reject(error);
                    })
                    .run();
            });
        } catch (error) {
            console.error('Ошибка при создании MP3:', error.message);
            throw error;
        }
    }
}

export const ogg = new OggConverter();

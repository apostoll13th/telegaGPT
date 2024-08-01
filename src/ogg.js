import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import { createWriteStream } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import installer from '@ffmpeg-installer/ffmpeg';

const __dirname = dirname(fileURLToPath(import.meta.url));

class OggConverter {
    constructor() {
        ffmpeg.setFfmpegPath(installer.path);
    }

    async create(url, fileName) {
        try {
            const oggPath = resolve(__dirname, "../voice/", `${fileName}.ogg`);
            const response = await axios({
                method: "get",
                url,
                responseType: "stream",
            });
            return new Promise((resolve) => {
                const stream = createWriteStream(oggPath);
                response.data.pipe(stream);
                stream.on('finish', () => resolve(oggPath));
            });
        } catch (error) {
            console.error("Error creating file:", error.message);
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
                    .on('error', (error) => reject(error.message))
                    .run();
            });
        } catch (error) {
            console.error('Error creating MP3:', error.message);
        }
    }
}

export const ogg = new OggConverter();

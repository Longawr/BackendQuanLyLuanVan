if (process.env.NODE_ENV !== 'production') require('dotenv');
const { Storage, File } = require('megajs');
const streamBuffers = require('stream-buffers');
const meganzEmail = process.env.MEGANZ_EMAIL;
const meganzPassword = process.env.MEGANZ_PASSWORD;
const meganzUserAgent = process.env.MEGANZ_USER_AGENT;

const bufferToStream = (buffer) => {
    let myReadableStreamBuffer = new streamBuffers.ReadableStreamBuffer({
        frequency: 10, // in milliseconds.
        chunkSize: 2048, // in bytes.
    });
    myReadableStreamBuffer.put(buffer);
    myReadableStreamBuffer.stop();
    return myReadableStreamBuffer;
};

class MeganzController {
    constructor() {
        this.storage = new Storage({
            email: meganzEmail,
            password: meganzPassword,
            userAgent: meganzUserAgent,
        });
        File.defaultHandleRetries = (tries, error, cb) => {
            if (tries > 8) {
                // Give up after eight retries
                cb(error);
            } else {
                // Wait some time then try again
                setTimeout(cb, 1000 * Math.pow(2, tries));
            }
        };

        this.storage.ready
            .then(() => console.log('Storage ready'))
            .catch((error) => console.error(error));
    }

    async closeStorage() {
        await this.storage.close();
        console.log('Storage closed successfully');
    }

    async uploadFile(filebuffer, filename, foldername) {
        const fileStream = bufferToStream(filebuffer);
        const size = Buffer.byteLength(filebuffer);

        let folder = this.storage.root.children?.find(
            (folder) => folder.name === foldername
        );
        if (folder == null) folder = await this.storage.mkdir(foldername);

        const fileExist = folder.children?.find(
            (file) => file.name === filename
        );
        if (fileExist != null)
            return { error: { name: 'Error', message: 'File already exists' } };

        await folder.upload({ name: filename, size: size }, fileStream)
            .complete;

        return { success: 'The file was uploaded!' };
    }

    async downloadFile(filename, foldername) {
        const folder = this.storage.root.children?.find(
            (folder) => folder.name === foldername
        );
        if (folder == null) throw new Error('Folder not found');

        const file = folder.children?.find((file) => file.name === filename);
        if (file == null) throw new Error('File not found');

        return file.download();
    }

    async removeFiles(files, foldername) {
        if (!Array.isArray(files) || files.length === 0)
            throw new Error('You must send a file name in the files field');

        const folder = this.storage.root.children?.find(
            (folder) => folder.name === foldername
        );
        if (folder == null) throw new Error('Folder not found');

        const promises = files.map((filename) => {
            const file = folder.children?.find(
                (file) => file.name === filename
            );
            if (file == null) throw new Error('File not found');
            return file.delete();
        });

        await Promise.all(promises);
        return { success: 'The file was deleted!' };
    }
}

module.exports = new MeganzController();

const { Storage } = require('@google-cloud/storage');
require('dotenv').config();
const projectId = process.env.PROJECT_ID;
const keyfilename = process.env.KEY_FILE_NAME;
const storage = new Storage({
    projectId,
    keyfilename
})

async function uploadFile(bucketName, file, fileOutputName) {
    try {
        const bucket = storage.bucket(bucketName);
        const ret = await bucket.upload(file, { destination: fileOutputName });
        return ret;
    } catch (error) {
        console.error('Error:', error);
    }
}
(async () => {
    const ret = await uploadFile(process.env.BUCKET_NAME, 'test.txt', 'test.txt');
    console.log(ret);
})();
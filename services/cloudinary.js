const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Uploads an in-memory file buffer (e.g. from multer memoryStorage) to
 * Cloudinary under FinanceDocs/{clientId}.
 */
function uploadDocumentToCloudinary(clientId, fileName, buffer) {

    return new Promise((resolve, reject) => {

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: `FinanceDocs/${clientId}`,
                public_id: fileName,
                 overwrite: true,
                resource_type: "auto"
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }
                resolve({
                    fileUrl: result.secure_url,
                    publicId: result.public_id
                });
            }
        );

        Readable.from(buffer).pipe(uploadStream);

    });

}

module.exports = {
    uploadDocumentToCloudinary
};
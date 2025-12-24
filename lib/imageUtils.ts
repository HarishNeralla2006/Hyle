
import imageCompression from 'browser-image-compression';

export const compressImage = async (file: File): Promise<string> => {
    const options = {
        maxSizeMB: 0.1, // constrained to 100KB per user request
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: 'image/jpeg',
    };

    try {
        const compressedFile = await imageCompression(file, options);
        return await convertToBase64(compressedFile);
    } catch (error) {
        console.error("Compression error:", error);
        throw error;
    }
};

const convertToBase64 = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

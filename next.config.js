/** @type {import('next').NextConfig} */
const nextConfig = {
    turbopack: {
        // Force the workspace root to be the current directory
        // to avoid warnings about lockfiles in parent directories.
        root: process.cwd(),
    },
    webpack: (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            "sharp$": false,
            "onnxruntime-node$": false,
        }
        return config;
    },
};

export default nextConfig;

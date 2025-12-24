/** @type {import('next').NextConfig} */
const nextConfig = {
    turbopack: {
        // Force the workspace root to be the current directory
        // to avoid warnings about lockfiles in parent directories.
        root: process.cwd(),
    },
};

export default nextConfig;


const fs = require('fs');
const path = 'public/icon-192.png';

// Minimal PNG header parser
const fd = fs.openSync(path, 'r');
const buffer = Buffer.alloc(24);
fs.readSync(fd, buffer, 0, 24, 0);
const width = buffer.readUInt32BE(16);
const height = buffer.readUInt32BE(20);
console.log(`Dimensions: ${width}x${height}`);
fs.closeSync(fd);

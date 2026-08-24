'use strict';

const net = require('node:net');

const EXTENSION_ID = 'com.dingdingprojects.asterisk.downloads';
const PIPE = '\\\\.\\pipe\\ding-pbx-download-ingress';
const MAX_MESSAGE_BYTES = 128 * 1024;

function readMessage() {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const read = () => {
      const header = buffer.length >= 4 ? buffer.readUInt32LE(0) : undefined;
      if (header !== undefined && header <= MAX_MESSAGE_BYTES && buffer.length >= header + 4) {
        const body = buffer.subarray(4, header + 4).toString('utf8');
        try { resolve(JSON.parse(body)); } catch { reject(new Error('The native message was not valid JSON.')); }
        return;
      }
      if (header !== undefined && (header > MAX_MESSAGE_BYTES || buffer.length > MAX_MESSAGE_BYTES + 4)) { reject(new Error('The native message exceeded its bounded size.')); return; }
      process.stdin.once('data', (chunk) => { buffer = Buffer.concat([buffer, chunk]); read(); });
      process.stdin.once('end', () => reject(new Error('The native message ended before its body arrived.')));
    };
    read();
  });
}

function writeMessage(value) {
  const body = Buffer.from(JSON.stringify(value), 'utf8');
  const header = Buffer.alloc(4); header.writeUInt32LE(body.length, 0);
  process.stdout.write(Buffer.concat([header, body]));
}

async function main() {
  try {
    const message = await readMessage();
    const keys = message && typeof message === 'object' ? Object.keys(message).sort().join(',') : '';
    if (keys !== 'extensionId,handoff,type' || message.type !== 'download-handoff' || message.extensionId !== EXTENSION_ID || !message.handoff || typeof message.handoff !== 'object') throw new Error('The extension identity or handoff shape was refused.');
    const socket = net.createConnection(PIPE);
    let response = '';
    socket.setTimeout(15_000, () => socket.destroy(new Error('The desktop ingress did not answer before its deadline.')));
    socket.on('data', (chunk) => { response += chunk.toString('utf8'); });
    await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('error', reject); });
    socket.write(`${JSON.stringify(message)}\n`);
    await new Promise((resolve, reject) => { socket.once('end', resolve); socket.once('error', reject); });
    try { response = JSON.parse(response.trim()); } catch { response = { accepted: false, detail: 'The desktop ingress returned an invalid response.' }; }
    writeMessage(response);
  } catch (error) {
    writeMessage({ accepted: false, detail: error instanceof Error ? error.message : 'The native messaging handoff was refused.' });
    process.exitCode = 1;
  }
}

void main();

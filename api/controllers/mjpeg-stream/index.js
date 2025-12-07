'use strict';

const HELPER_BASE = process.env.HELPER_BASE || "/opt/";
const Response = require(HELPER_BASE + 'response');
const Redirect = require(HELPER_BASE + 'redirect');

const UPDATE_INTERVAL = 5000;
const UDP_SEND_PORT = 1234;
const UDP_RECV_PORT = 1234;

const crypto = require('crypto');
const {
    fileTypeFromBuffer
} = require('file-type');
const LineStreamReader = require('./LineStreamReader');
const fs = require('fs').promises;
const path = require('path');
var ip = require('ip');
const dgram = require('dgram');
const socket = dgram.createSocket('udp4');

console.log("local ipaddress=" + ip.address());
let stream_list = {};
let waitingBuffer = null;

const filePath = path.join(__dirname, 'waiting.jpg');
fs.readFile(filePath)
    .then(buffer => {
        waitingBuffer = buffer;
    })
    .catch(error => {
        console.error(error);
    });

async function putFrame(buffer, name) {
    var type = await fileTypeFromBuffer(buffer);
    var list = stream_list[name];
    if (list) {
        list.latestBuffer = buffer;
        for (let item of list.client_list) {
            try {
                // 1/2
                item.stream.write(`--${item.boundary}\r\n`);
                item.stream.write(`Content-Type: ${type.mime}\r\n`);
                item.stream.write(`Content-Length: ${buffer.length}\r\n`);
                item.stream.write(`\r\n`);

                item.stream.write(buffer);
                item.stream.write(`\r\n`);

                // 2/2
                item.stream.write(`--${item.boundary}\r\n`);
                item.stream.write(`Content-Type: ${type.mime}\r\n`);
                item.stream.write(`Content-Length: ${buffer.length}\r\n`);
                item.stream.write(`\r\n`);

                item.stream.write(buffer);
                item.stream.write(`\r\n`);
            } catch (error) {
                console.error(error);
            }
        }
    }
}

exports.stream_handler = awslambda.streamifyResponse(async (event, responseStream, context) => {
    console.log(event.queryStringParameters);

    responseStream.on('close', () => {
        console.log('Client disconnected.');
    });

    const BOUNDARY = crypto.randomUUID();
    responseStream = awslambda.HttpResponseStream.from(responseStream, {
        statusCode: 200,
        headers: {
            "Content-Type": "multipart/x-mixed-replace; boundary=--" + BOUNDARY,
        }
    });

    var name = event.queryStringParameters["name"];
    if (!stream_list[name]) {
        const udp_send = () => {
            socket.send(JSON.stringify({
                ipaddress: ip.address(),
                port: UDP_RECV_PORT
            }), UDP_SEND_PORT, name);
        };
        stream_list[name] = {
            client_list: [],
            interval: setInterval(udp_send, UPDATE_INTERVAL)
        };
        udp_send();
    }
    stream_list[name].client_list.push({
        stream: responseStream,
        boundary: BOUNDARY
    });
    if (stream_list[name].latestBuffer)
        await putFrame(stream_list[name].latestBuffer, name);
    else
        await putFrame(waitingBuffer, name);

    responseStream.on('close', () => {
        console.log('Client disconnected.');
        var index = stream_list[name].client_list.findIndex(item => item.boundary == BOUNDARY);
        if (index >= 0)
            stream_list[name].client_list.splice(index, 1);
        if (stream_list[name].client_list.length <= 0) {
            clearInterval(stream_list[name].interval);
            stream_list[name] = undefined;
            console.log("destroyed");
        }
    });

//    responseStream.end();
});

exports.udp_handler = async (event, context) => {
    //  console.log(event);

    var name = event.remote.address;
    if (!stream_list[name])
        return;

    if (!stream_list[name].reader)
        stream_list[name].reader = new LineStreamReader(null);
    var reader = stream_list[name].reader;

    let {
        done,
        value
    } = reader.push(event.body);
    if (value) {
//		console.log(value);
        putFrame(Buffer.from(value, 'base64'), name);
    } else if (done) {}
};
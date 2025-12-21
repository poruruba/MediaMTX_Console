'use strict';

const HELPER_BASE = process.env.HELPER_BASE || "/opt/";
const Response = require(HELPER_BASE + 'response');
const Redirect = require(HELPER_BASE + 'redirect');

const UPDATE_INTERVAL = 5000;
const UDP_SEND_PORT = 1234;
const UDP_RECV_PORT = 1234;

const crypto = require('crypto');
const { fileTypeFromBuffer } = require('file-type');
const LineStreamReader = require('./LineStreamReader');
const fs = require('fs').promises;
var ip = require('ip');
const dgram = require('dgram');
const socket = dgram.createSocket('udp4');

console.log("local ipaddress=" + ip.address());
let stream_list = {};
let waitingBuffer = null;
(async ()=>{
    waitingBuffer = await fs.readFile(__dirname + "/waiting.jpg")
})();

async function putFrame(name) {
    var target = stream_list[name];
    if (target && target.buffer ) {
        var type = await fileTypeFromBuffer(target.buffer);
        for (let item of target.client_list) {
            try {
                item.stream.write(`--${item.boundary}\r\n`);
                item.stream.write(`Content-Type: ${type.mime}\r\n`);
                item.stream.write(`Content-Length: ${target.buffer.length}\r\n`);
                item.stream.write(`\r\n`);

                item.stream.write(target.buffer);
                item.stream.write(`\r\n`);
            } catch (error) {
                console.error(error);
            }
        }
    }
}

exports.handler = async (event, context, callback) => {
//    console.log(event);
//    console.log(context);

    if( event.path == "/mjpeg-upload"){
        if( event.body.length <= 0 )
            throw new Error("body invalid");
        var name = event.queryStringParameters["name"];
        if( !stream_list[name] ){
            stream_list[name] = {
                type: "file",
                buffer: event.body,
                client_list: [],
            };
        }else{
            if( stream_list[name].type != "file")
                throw new Error("Type mismatch");
            stream_list[name].buffer = event.body;
        }
        return new Response({});
    }else
    {
        throw new Error("Unknown endpoint");
    }
};

exports.stream_handler = awslambda.streamifyResponse(async (event, responseStream, context) => {
    console.log(event.queryStringParameters);

    var interval = event.queryStringParameters["interval"] ? parseInt(event.queryStringParameters["interval"]) : UPDATE_INTERVAL;
    var name = event.queryStringParameters["name"];
    var type = event.queryStringParameters["type"] || "file";

    const BOUNDARY = crypto.randomUUID();
    responseStream = awslambda.HttpResponseStream.from(responseStream, {
        statusCode: 200,
        headers: {
            "Content-Type": "multipart/x-mixed-replace; boundary=" + BOUNDARY,
        }
    });

    if (!stream_list[name]) {
        stream_list[name] = {
            type: type,
            buffer: waitingBuffer,
            client_list: [],
        };
    }
    if( !stream_list[name].interval ){
        if( type == "udp"){
        const udp_send = () => {
            socket.send(JSON.stringify({
                ipaddress: ip.address(),
                port: UDP_RECV_PORT
            }), UDP_SEND_PORT, name);
        };
            stream_list[name].interval = setInterval(udp_send, interval);
        udp_send();
        }else if( type == 'file'){
            const file_send = async () =>{
                await putFrame(name);
            };
            stream_list[name].interval = setInterval(file_send, interval);
        }
    }
    stream_list[name].client_list.push({
        stream: responseStream,
        boundary: BOUNDARY
    });

    responseStream.on('close', () => {
        console.log('Client disconnected.');
        var index = stream_list[name].client_list.findIndex(item => item.boundary == BOUNDARY);
        if (index >= 0)
            stream_list[name].client_list.splice(index, 1);
        if (stream_list[name].client_list.length <= 0) {
            if( stream_list[name].interval ){
            clearInterval(stream_list[name].interval);
                stream_list[name].interval = 0;
            }
            console.log("interval stoped");
        }
    });

    await putFrame(name);
    //    responseStream.end();
});

exports.udp_handler = async (event, context) => {
    //  console.log(event);

    var name = event.remote.address;
    if (!stream_list[name])
        return;

    var target = stream_list[name];

    if (!target.reader)
        target.reader = new LineStreamReader(null);

    let {
        done,
        value
    } = target.reader.push(event.body);
    if (value) {
        //		console.log(value);
        target.buffer = Buffer.from(value, 'base64');
        putFrame(name);
    } else if (done) {}
};
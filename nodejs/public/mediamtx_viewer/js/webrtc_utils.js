const webrtc_base_url = "https://[QNAPサーバ]:28889";
//const webrtc_base_url = "http://[QNAPサーバ]:8889";

async function webrtc_disconnect(pc){
    if( pc.sessionUrl ){
        try{
            var input = {
                url: pc.sessionUrl,
                method: "DELETE",
                response_type: "text"
            };
            var result = await do_http(input);
            console.log(result);
        }catch(error){
            console.error(error);
        }
    }
    const senders = pc.getSenders();
    senders.forEach(sender => {
        const track = sender.track;
        if (track) {
            track.stop();
        }
        pc.removeTrack(sender);
    });
    pc.close();
}

// input: user, password, timeout, name
async function webrtc_receive_connect(input, callback)
{
    var { user, password, timeout, name } = input;

    const pc = new RTCPeerConnection({
        iceServers: [ { urls: "stun:stun.l.google.com:19302" } ],
        iceTransportPolicy: 'all',
    });

    pc.addEventListener('track', event => {
        if (callback) callback('peer', { type: 'track', kind: event.track.kind, streams: event.streams, track: event.track });
    });

    pc.addEventListener('icecandidate', (event) => {
        if (callback) callback('peer', { type: 'icecandidate', candidate: event });
    });
    pc.addEventListener('connectionstatechange', (event) => {
        if (callback) callback('peer', { type: 'connectionstatechange', connectionState: event.target.connectionState });
    });
    pc.addEventListener('negotiationneeded', (event) => {
        if (callback) callback('peer', { type: 'negotiationneeded' });
    });
    pc.addEventListener('icegatheringstatechange', (event) => {
        if (callback) callback('peer', { type: 'icegatheringstatechange', iceGatheringState: event.target.iceGatheringState });
    });
    pc.addEventListener('iceconnectionstatechange', (event) => {
        if (callback) callback('peer', { type: 'iceconnectionstatechange', iceConnectionState: event.target.iceConnectionState });
    });
    pc.addEventListener('icecandidateerror', (event) => {
        if (callback) callback('peer', { type: 'icecandidateerror', errorCode: event.errorCode, errorText: event.errorText });
    });
    pc.addEventListener('signalingstatechange', (event) => {
        if (callback) callback('peer', { type: 'signalingstatechange', signalingState: event.target.signalingState });
    });

    pc.addTransceiver( 'video', { direction: "recvonly" });
    pc.addTransceiver( 'audio', { direction: "recvonly" });

    var offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await new Promise(resolve => {
        var timerid = setTimeout(resolve, timeout);
        pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === "complete") {
                clearTimeout(timerid);
                resolve();
            }
        };
    });

    var input = {
        url: `${webrtc_base_url}/${name}/whep`,
        headers: {
            "Authorization": "Basic " + btoa(user + ":" + password)
        },
        content_type: "application/sdp",
        body: pc.localDescription.sdp,
        response_type: "raw"
    };
    var response = await do_http(input);
    const location = response.headers.get("location");
    pc.sessionUrl = location.startsWith("http") ? location : webrtc_base_url + location;

    const answerSDP = await response.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSDP });

    return pc;
}

// input: stream, user, password, timeout, nameforce_h264
async function webrtc_send_connect(input, callback)
{
    var { stream, user, password, timeout, name } = input;

    const pc = new RTCPeerConnection({
        iceServers: [ { urls: "stun:stun.l.google.com:19302" } ],
        iceTransportPolicy: 'all',
    });

    pc.addEventListener('track', event => {
        if (callback) callback('peer', { type: 'track', kind: event.track.kind, streams: event.streams, track: event.track });
    });
    pc.addEventListener('icecandidate', (event) => {
        if (callback) callback('peer', { type: 'icecandidate', candidate: event });
    });
    pc.addEventListener('connectionstatechange', (event) => {
        if (event.target.connectionState === "disconnected" || event.target.connectionState === "failed" || event.target.connectionState === "closed") {
            stream.getTracks().forEach(track => track.stop());
            console.log("PeerConnection disconnected, MediaStream stopped.");
        }
        if (callback) callback('peer', { type: 'connectionstatechange', connectionState: event.target.connectionState });
    });
    pc.addEventListener('negotiationneeded', (event) => {
        if (callback) callback('peer', { type: 'negotiationneeded' });
    });
    pc.addEventListener('icegatheringstatechange', (event) => {
        if (callback) callback('peer', { type: 'icegatheringstatechange', iceGatheringState: event.target.iceGatheringState });
    });
    pc.addEventListener('iceconnectionstatechange', (event) => {
        if (callback) callback('peer', { type: 'iceconnectionstatechange', iceConnectionState: event.target.iceConnectionState });
    });
    pc.addEventListener('icecandidateerror', (event) => {
        if (callback) callback('peer', { type: 'icecandidateerror', errorCode: event.errorCode, errorText: event.errorText });
    });
    pc.addEventListener('signalingstatechange', (event) => {
        if (callback) callback('peer', { type: 'signalingstatechange', signalingState: event.target.signalingState });
    });

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // pc.addTransceiver("video", { direction: "sendonly" });
    // pc.addTransceiver("audio", { direction: "sendonly" });

    var offer = await pc.createOffer();
    if( input.force_h264 )
        offer.sdp = prioritizeH264(offer.sdp);
    await pc.setLocalDescription(offer);

    await new Promise(resolve => {
        var timerid = setTimeout(resolve, timeout);
        pc.onicegatheringstatechange = (event) => {
            if (pc.iceGatheringState === "complete") {
                clearTimeout(timerid);
                resolve();
            }
        };
    });

    var input = {
        url: `${webrtc_base_url}/${name}/whip`,
        headers: {
            "Authorization": "Basic " + btoa(user + ":" + password)
        },
        content_type: "application/sdp",
        body: pc.localDescription.sdp,
        response_type: "raw"
    };
    var response = await do_http(input);
    const location = response.headers.get("location");
    pc.sessionUrl = location.startsWith("http") ? location : webrtc_base_url + location;

    const answerSDP = await response.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSDP });

    return pc;
}

function prioritizeH264(sdp) {
  const h264pts = [...sdp.matchAll(/a=rtpmap:(\d+) H264\/90000/g)].map(m => m[1]);
  if (h264pts.length === 0)
    return sdp;

  const firstH264 = h264pts[0];
  return sdp.replace(/m=video .*\r\n/, (line) => {
    const parts = line.trim().split(" ");
    const header = parts.slice(0, 3).join(" "); // m=video 9 UDP/TLS/RTP/SAVPF
    const pts = parts.slice(3);

    const reordered = [firstH264, ...pts.filter(pt => pt !== firstH264)];
    return `${header} ${reordered.join(" ")}\r\n`;
  });
}



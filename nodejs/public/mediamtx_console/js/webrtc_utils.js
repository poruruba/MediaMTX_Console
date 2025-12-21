
function webrtc_disconnect(pc){
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
        response_type: "text"
    };
    const answerSDP = await do_http(input);
    await pc.setRemoteDescription({ type: "answer", sdp: answerSDP });

    return pc;
}

// input: stream, user, password, timeout, name
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
        response_type: "text"
    };
    const answerSDP = await do_http(input);
    await pc.setRemoteDescription({ type: "answer", sdp: answerSDP });

    return pc;
}

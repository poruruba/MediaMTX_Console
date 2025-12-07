'use strict';

//const vConsole = new VConsole();
//const remoteConsole = new RemoteConsole("http://[remote server]/logio-post");
//window.datgui = new dat.GUI();

const base_url = 'https://【HTTPSでのホスト名】:29997';
//const base_url = 'http://【MediaMTXサーバのホスト名】:9997';

const webrtc_base_url = "https://【HTTPSでのホスト名】:28889";
//const webrtc_base_url = "http://【MediaMTXサーバのホスト名】:8889";

var vue_options = {
    el: "#top",
    mixins: [mixins_bootstrap],
    store: vue_store,
    router: vue_router,
    data: {
        mediamtx_config: {},
        mediamtx_info: {},
        mediamtx_config_paths: [],
        mediamtx_paths: [],
        mediamtx_recordings: [],
        mediamtx_rtsp_sessions: [],
        mediamtx_webrtc_sessions: [],
        mediamtx_hls_muxers: [],

        params_config: {},
        pc_send: null,
        pc_receive: null,
        params_camera_record: {},
        remotePath: "",
    },
    computed: {
    },
    methods: {
        convertDateString: function(date_str){
            var date = new Date(date_str);
            return date.toLocaleString();
        },

        send_callback: async function(module, event){
            console.log(module, event);
        },
        recording_start: async function(){
            this.dialog_close('#dialog_record_start');
            var stream;
            try{
                this.progress_open();
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: true
                    });
                } catch (error) {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: false
                    });
                }
                var input = {
                    stream: stream,
                    user: this.params_camera_record.user,
                    password: this.params_camera_record.password,
                    name: this.params_camera_record.name,
                    timeout: 5000
                };
                this.pc_send = await webrtc_send_connect(input, this.send_callback);

                localStorage.setItem("mediamtx_config", JSON.stringify(this.params_camera_record));
            }catch(error){
                console.error(error);
                if( stream ){
                    stream.getTracks().forEach(track => {
                        track.stop();
                        console.log(`トラック '${track.kind}' を停止しました。`);
                    });
                }
                alert(error);
            }finally{
                this.progress_close();
            }
        },
        do_publish: async function(){
            console.log("do_publish");

            if( this.pc_send ){
                if( !confirm("録画を停止しますか？") )
                    return;

                webrtc_disconnect(this.pc_send);
                this.pc_send = null;
            }else{
                var conf = localStorage.getItem("mediamtx_config");
                if( conf ){
                    this.params_camera_record = JSON.parse(conf);
                }
                this.dialog_open("#dialog_record_start");
            }
        },

        do_update_config: async function(){
            localStorage.setItem("mediamtx_config", JSON.stringify(this.params_config));
            this.dialog_close("#dialog_config");
        },
        start_config: async function(){
            var conf = localStorage.getItem("mediamtx_config");
            if( conf ){
                this.params_config = JSON.parse(conf);
            }else{
                this.params_config = {};
            }
            this.dialog_open("#dialog_config");
        },
        receive_callback: async function(module, event){
            console.log(module, event);
            if( module == 'peer' && event.type == 'track' ){
                const video = document.getElementById("remoteVideo");
                video.srcObject = event.streams[0];
            }
        },
        webrtc_start: async function(name){
            var conf = localStorage.getItem("mediamtx_config");
            if( !conf ){
                alert("設定されていません。");
                return;
            }
            conf = JSON.parse(conf);
            try{
                this.progress_open();
                var input = {
                    name: name,
                    user: conf.user,
                    password: conf.password,
                    timeout: 5000
                };
                this.pc_receive = await webrtc_receive_connect(input, this.receive_callback);

                this.remotePath = name;
                this.dialog_open("#dialog_webrtc");
            }catch(error){
                console.error(error);
                alert(error);
            }finally{
                this.progress_close();
            }
        },
        webrtc_stop: async function(){
            webrtc_disconnect(this.pc_receive);
            this.pc_receive = null;
            this.dialog_close("#dialog_webrtc");

        },
        do_update: async function(){
            var conf = localStorage.getItem("mediamtx_config");
            if( !conf ){
                alert("設定されていません。");
                return;
            }
            conf = JSON.parse(conf);
            var input = {
                url: base_url + '/v3/info',
                method: 'GET',
                headers: {
                    Authorization: "Basic " + btoa("admin" + ":" + conf.admin_password)
                }
            };
            var result = await do_http(input);
            console.log(result);
            this.mediamtx_info = result;

            var input = {
                url: base_url + '/v3/config/global/get',
                method: 'GET',
                headers: {
                    Authorization: "Basic " + btoa("admin" + ":" + conf.admin_password)
                }
            };
            var result = await do_http(input);
            console.log(result);
            this.mediamtx_config = result;

            var input = {
                url: base_url + '/v3/config/paths/list',
                method: 'GET',
                headers: {
                    Authorization: "Basic " + btoa("admin" + ":" + conf.admin_password)
                }
            };
            var result = await do_http(input);
            console.log(result);
            this.mediamtx_config_paths = result.items;

            var input = {
                url: base_url + '/v3/paths/list',
                method: 'GET',
                headers: {
                    Authorization: "Basic " + btoa("admin" + ":" + conf.admin_password)
                }
            };
            var result = await do_http(input);
            console.log(result);
            this.mediamtx_paths = result.items;

            var input = {
                url: base_url + '/v3/recordings/list',
                method: 'GET',
                headers: {
                    Authorization: "Basic " + btoa("admin" + ":" + conf.admin_password)
                }
            };
            var result = await do_http(input);
            console.log(result);
            this.mediamtx_recordings = result.items;

            var input = {
                url: base_url + '/v3/rtspsessions/list',
                method: 'GET',
                headers: {
                    Authorization: "Basic " + btoa("admin" + ":" + conf.admin_password)
                }
            };
            var result = await do_http(input);
            console.log(result);
            this.mediamtx_rtsp_sessions = result.items;

            var input = {
                url: base_url + '/v3/webrtcsessions/list',
                method: 'GET',
                headers: {
                    Authorization: "Basic " + btoa("admin" + ":" + conf.admin_password)
                }
            };
            var result = await do_http(input);
            console.log(result);
            this.mediamtx_webrtc_sessions = result.items;

            var input = {
                url: base_url + '/v3/hlsmuxers/list',
                method: 'GET',
                headers: {
                    Authorization: "Basic " + btoa("admin" + ":" + conf.admin_password)
                }
            };
            var result = await do_http(input);
            console.log(result);
            this.mediamtx_hls_muxers = result.items;
        }
    },
    created: function(){
    },
    mounted: function(){
        proc_load();
    }
};
vue_add_data(vue_options, { progress_title: '' }); // for progress-dialog
vue_add_global_components(components_bootstrap);
vue_add_global_components(components_utils);

/* add additional components */
  
window.vue = new Vue( vue_options );


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

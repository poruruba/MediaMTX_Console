'use strict';

//const vConsole = new VConsole();
//const remoteConsole = new RemoteConsole("http://[remote server]/logio-post");
//window.datgui = new dat.GUI();

const mediamtx_base_url = 'https://home.poruru.work:29997';
//const mediamtx_base_url = 'http://qnap.myhome.or.jp:9997';

const webrtc_base_url = "https://home.poruru.work:28889";
//const webrtc_base_url = "http://qnap.myhome.or.jp:8889";

const base_url = "";

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
        pc_receive: null,
        source_list: [{}],
        remotePath: "",
        param_upimage: {},
        media_list: [],
        param_add_path: {}
    },
    computed: {
    },
    methods: {
        configpath_delete: async function(index){
            var input = {
                url: "https://asus.poruru.work" + "/mediamtx-delete-media",
                headers: {
                    Authorization: "Basic " + btoa("admin" + ":" + this.config.admin_password)
                },
                body: {
                    path: this.mediamtx_config_paths[index].name
                },
            };
            var result = await do_http(input);
            console.log(result);

            this.toast_show("削除しました。");
        },
        configpath_add: async function(){
            var input = {
                url: "https://asus.poruru.work" + "/mediamtx-add-media",
                headers: {
                    Authorization: "Basic " + btoa("admin" + ":" + this.config.admin_password)
                },
                body: {
                    path: this.param_add_path.path,
                    fname: this.param_add_path.fname
                }
            };
            var result = await do_http(input);
            console.log(result);

            this.toast_show("削除しました。");
        },
        upimage_selected: async function(files){
            if( files.length <= 0)
                return;

            this.upimage_file = files[0];
            this.$set(this.param_upimage, "src", URL.createObjectURL(this.upimage_file));
        },
        upimage_upload: async function(){
            if( !this.upimage_file ){
                alert("画像ファイルを選択してください。");
                return;
            }
            var input = {
                url: base_url + "/mjpeg-upload",
                method: "PUT",
                qs: {
                    name: "imagefile"
                },
                content_type: "application/octet-stream",
                body: this.upimage_file
            };
            var result = await do_http(input);
            console.log(result);
            this.toast_show("アップロードしました。");
        },
        item_append: function(){
            this.source_list.push({});
        },

        default_callback: async function(module, event){
            console.log(module, event);
        },

        recording_start: async function(index){
            const source = this.source_list[index];
            if( !source.path ){
                alert("pathが設定されていません。");
                return;
            }
            if( this.source_list.filter(item => item.path == source.path ).length > 1 ){
                alert("同じpathは指定できません。");
                return;
            }
            try{
                this.progress_open();

                if( source.type == 'imagefile'){
                    const canvas = document.querySelector('#localimage_view_' + index);
                    const update_image = () =>{
                        if( source.image ){
                            const ctx = canvas.getContext('2d');
                            canvas.width = source.image.naturalWidth;
                            canvas.height = source.image.naturalHeight;
                            ctx.drawImage(source.image, 0, 0, canvas.width, canvas.height);
                        }
                    };
                    source.interval = setInterval(update_image, 1000);
                    update_image();

                    var stream = canvas.captureStream(1);

                    var input = {
                        stream: stream,
                        user: this.config.user,
                        password: this.config.password,
                        name: source.path,
                        timeout: 5000
                    };
                    var peer = await webrtc_send_connect(input, (module, event) =>{
                        console.log(module, event);
                        if (module == 'peer' &&
                            (event.type == "connectionstatechange" &&
                                (event.connectionState == "disconnected" || event.connectionState == "failed" || event.connectionState == "closed")) ){
                            clearInterval(source.interval);
                            source.interval = null;
                            source.peer = null;
                        }
                    });
                    this.$set(this.source_list[index], "peer", peer);
                }else if( source.type == 'videofile'){
                    const video = document.querySelector('#localcamera_view_' + index);
                    if( source.chk_loop )
                        video.loop = true;
                    var stream = video.captureStream();
                    if( !source.chk_loop ){
                        video.addEventListener("ended", () => {
                            video.currentTime = 0;
                            video.pause();

                            const newStream = video.captureStream();
                            const newTrack = newStream.getVideoTracks()[0];

                            const sender = source.peer.getSenders().find(s => s.track.kind === "video");
                            sender.replaceTrack(newTrack);
                        });
                    }

                    var input = {
                        stream: stream,
                        user: this.config.user,
                        password: this.config.password,
                        name: source.path,
                        timeout: 5000
                    };
                    var peer = await webrtc_send_connect(input, this.default_callback);
                    this.$set(this.source_list[index], "peer", peer);
                }else if( source.type == 'audiofile'){
                    const audio = document.querySelector('#localaudio_view_' + index);
                    if( source.chk_loop )
                        audio.loop = true;
                    var stream = audio.captureStream();
                    if( !source.chk_loop ){
                        audio.addEventListener("ended", () => {
                            audio.currentTime = 0;
                            audio.pause();

                            const newStream = audio.captureStream();
                            const newTrack = newStream.getAudioTracks()[0];

                            const sender = source.peer.getSenders().find(s => s.track.kind === "audio");
                            sender.replaceTrack(newTrack);
                        });
                    }

                    var input = {
                        stream: stream,
                        user: this.config.user,
                        password: this.config.password,
                        name: source.path,
                        timeout: 5000
                    };
                    var peer = await webrtc_send_connect(input, this.default_callback);
                    this.$set(this.source_list[index], "peer", peer);
                }else if( source.type == 'usermedia' ){
                    var input = {
                        stream: source.stream,
                        user: this.config.user,
                        password: this.config.password,
                        name: source.path,
                        timeout: 5000
                    };
                    var peer = await webrtc_send_connect(input, this.default_callback);
                    this.$set(this.source_list[index], "peer", peer);
                }else if( source.type == 'screen' ){
                    var input = {
                        stream: source.stream,
                        user: this.config.user,
                        password: this.config.password,
                        name: source.path,
                        timeout: 5000
                    };
                    var peer = await webrtc_send_connect(input, this.default_callback);
                    this.$set(this.source_list[index], "peer", peer);
                }
            }catch(error){
                console.error(error);
                alert(error);
            }finally{
                this.progress_close();
            }
        },

        recording_stop: async function(index){
            const source = this.source_list[index];
            await webrtc_disconnect(source.peer);
            source.peer = null;
        },

        screen_selected: async function(index){
            var stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            const video = document.querySelector('#localscreen_view_' + index);
            video.srcObject = stream;
            await video.play();
            this.source_list[index].stream = stream;
        },
        usermedia_selected: async function(index){
            var stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
            } catch (error) {
                try{
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: false
                    });
                }catch(error){
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: false,
                        audio: true
                    });
                }
            }
            const video = document.querySelector('#localusermedia_view_' + index);
            video.srcObject = stream;
            await video.play();
            this.source_list[index].stream = stream;
        },
        image_selected: async function(files, index){
            if( files.length == 0 )
                return;

            const file = files[0];
            var source = this.source_list[index];

            const image = new Image();
            image.onload = () =>{
                if( source.image )
                    URL.revokeObjectURL(source.src);

                source.image = image;
                const canvas = document.querySelector('#localimage_view_' + index);
                const ctx = canvas.getContext('2d');
                canvas.width = source.image.naturalWidth;
                canvas.height = source.image.naturalHeight;
                ctx.drawImage(source.image, 0, 0, canvas.width, canvas.height);
            };
            image.src = URL.createObjectURL(file);
        },
        video_selected: async function(files, index){
            if( files.length == 0 ){
                this.source_list[index].file = null;
                return;
            }
            var file = files[0];
            const video = document.querySelector('#localcamera_view_' + index);
            const url = URL.createObjectURL(file);
            video.src = url;
            await video.play();
        },
        audio_selected: async function(files, index){
            if( files.length == 0 ){
                this.source_list[index].file = null;
                return;
            }
            var file = files[0];
            const audio = document.querySelector('#localaudio_view_' + index);
            const url = URL.createObjectURL(file);
            audio.src = url;
            audio.muted = true;
            await audio.play();
        },

        convertDateString: function(date_str){
            var date = new Date(date_str);
            return date.toLocaleString();
        },

        do_update_config: async function(){
            localStorage.setItem("mediamtx_config_admin", JSON.stringify(this.params_config));
            this.config = this.params_config;
            this.dialog_close("#dialog_config");
        },
        start_config: async function(){
            var conf = localStorage.getItem("mediamtx_config_admin");
            if( conf ){
                this.params_config = JSON.parse(conf);
            }else{
                this.params_config = {};
            }
            this.dialog_open("#dialog_config");
        },
        webrtc_start: async function(name){
            try{
                this.progress_open();
                var input = {
                    name: name,
                    user: this.config.user,
                    password: this.config.password,
                    timeout: 5000
                };
                this.pc_receive = await webrtc_receive_connect(input, (module, event) =>{
                    console.log(module, event);
                    if( module == 'peer' && event.type == 'track' ){
                        const video = document.getElementById("remoteVideo");
                        video.srcObject = event.streams[0];
                    }
                });

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
            var input = {
                url: mediamtx_base_url + '/v3/info',
                method: 'GET',
                headers: {
                    Authorization: "Basic " + btoa(this.config.user + ":" + this.config.password)
                }
            };
            var result = await do_http(input);
            console.log(result);
            this.mediamtx_info = result;

            var input = {
                url: mediamtx_base_url + '/v3/config/global/get',
                method: 'GET',
                headers: {
                    Authorization: "Basic " + btoa(this.config.user + ":" + this.config.password)
                }
            };
            var result = await do_http(input);
            console.log(result);
            this.mediamtx_config = result;

            var input = {
                url: mediamtx_base_url + '/v3/config/paths/list',
                method: 'GET',
                headers: {
                    Authorization: "Basic " + btoa(this.config.user + ":" + this.config.password)
                }
            };
            var result = await do_http(input);
            console.log(result);
            this.mediamtx_config_paths = result.items;

            var input = {
                url: mediamtx_base_url + '/v3/paths/list',
                method: 'GET',
                headers: {
                    Authorization: "Basic " + btoa(this.config.user + ":" + this.config.password)
                }
            };
            var result = await do_http(input);
            console.log(result);
            this.mediamtx_paths = result.items;

            var input = {
                url: mediamtx_base_url + '/v3/recordings/list',
                method: 'GET',
                headers: {
                    Authorization: "Basic " + btoa(this.config.user + ":" + this.config.password)
                }
            };
            var result = await do_http(input);
            console.log(result);
            this.mediamtx_recordings = result.items;

            var input = {
                url: mediamtx_base_url + '/v3/rtspsessions/list',
                method: 'GET',
                headers: {
                    Authorization: "Basic " + btoa(this.config.user + ":" + this.config.password)
                }
            };
            var result = await do_http(input);
            console.log(result);
            this.mediamtx_rtsp_sessions = result.items;

            var input = {
                url: mediamtx_base_url + '/v3/webrtcsessions/list',
                method: 'GET',
                headers: {
                    Authorization: "Basic " + btoa(this.config.user + ":" + this.config.password)
                }
            };
            var result = await do_http(input);
            console.log(result);
            this.mediamtx_webrtc_sessions = result.items;

            var input = {
                url: mediamtx_base_url + '/v3/hlsmuxers/list',
                method: 'GET',
                headers: {
                    Authorization: "Basic " + btoa(this.config.user + ":" + this.config.password)
                }
            };
            var result = await do_http(input);
            console.log(result);
            this.mediamtx_hls_muxers = result.items;

            var input = {
                url: base_url + "/mediamtx-get-media",
                headers: {
                    Authorization: "Basic " + btoa(this.config.user + ":" + this.config.password)
                }
            };
            var result = await do_http(input);
            console.log(result);
            this.media_list = result.list;
        }
    },
    created: function(){
    },
    mounted: function(){
        proc_load();

        var conf = localStorage.getItem("mediamtx_config_admin");
        if( conf ){
            this.config = JSON.parse(conf);
        }else{
            this.config = {};
        }
    }
};
vue_add_data(vue_options, { progress_title: '' }); // for progress-dialog
vue_add_global_components(components_bootstrap);
vue_add_global_components(components_utils);

/* add additional components */
  
window.vue = new Vue( vue_options );

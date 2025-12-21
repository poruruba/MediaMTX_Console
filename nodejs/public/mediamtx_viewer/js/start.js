'use strict';

//const vConsole = new VConsole();
//const remoteConsole = new RemoteConsole("http://[remote server]/logio-post");
//window.datgui = new dat.GUI();

const base_url = '';

const webrtc_base_url = "https://home.poruru.work:28889";
//const webrtc_base_url = "http://qnap.myhome.or.jp:8889";

var g_file;

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
        source_list: [{
            path: "test3",
        }],
        remotePath: "",

        connect_list: [{}],
        source_list: [],
    },
    computed: {
    },
    methods: {
        item_append: function(){
            this.connect_list.push({});
        },
        
        do_update_config: async function(){
            localStorage.setItem("mediamtx_config", JSON.stringify(this.params_config));
            this.config = this.params_config;
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

        webrtc_start: async function(index, name){
            try{
                this.progress_open();
                var input = {
                    name: name,
                    user: this.config.user,
                    password: this.config.password,
                    timeout: 5000
                };
                var peer = await webrtc_receive_connect(input, (module, event) =>{
                    console.log(module, event);
                    if( module == 'peer' && event.type == 'track' ){
                        const video = document.getElementById("remoteVideo_" + index);
                        video.srcObject = event.streams[0];
                    }
                });
                this.$set(this.connect_list[index], "peer", peer); 
            }catch(error){
                console.error(error);
                alert(error);
            }finally{
                this.progress_close();
            }
        },

        webrtc_stop: async function(index){
            webrtc_disconnect(this.connect_list[index].peer );
            this.$set(this.connect_list[index], "peer", null ); 
        },

        do_update: async function(){
            var input = {
                url: base_url + '/mediamtx-get-path',
                method: 'POST',
                headers: {
                    Authorization: "Basic " + btoa(this.config.user + ":" + this.config.password)
                }
            };
            var result = await do_http(input);
            console.log(result);
            this.mediamtx_paths = result.list;
        }
    },
    created: function(){
    },
    mounted: function(){
        proc_load();

        var conf = localStorage.getItem("mediamtx_config");
        if( conf ){
            this.config = JSON.parse(conf);
        }else{
            this.config = {};
        }

        this.do_update();
    }
};
vue_add_data(vue_options, { progress_title: '' }); // for progress-dialog
vue_add_global_components(components_bootstrap);
vue_add_global_components(components_utils);

/* add additional components */
  
window.vue = new Vue( vue_options );

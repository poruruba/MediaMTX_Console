'use strict';

//const vConsole = new VConsole();
//const remoteConsole = new RemoteConsole("http://[remote server]/logio-post");
//window.datgui = new dat.GUI();

var vue_options = {
    el: "#top",
    mixins: [mixins_bootstrap],
    store: vue_store,
    router: vue_router,
    data: {
        site_list: [],
    },
    computed: {
    },
    methods: {
    },
    created: function(){
    },
    mounted: async function(){
        proc_load();

        try{
            var first = false;
            var apikey = localStorage.getItem('api_key');
            if( !apikey ){
                first = true;
                apikey = prompt("api_key");
            }
            if( apikey ){
                var input = {
                    url: "/sites",
                    method: "GET",
                    api_key: apikey
                };
                var result = await do_http(input);
                this.site_list = result.list;
                if( first )
                    localStorage.setItem("api_key", apikey);
            }
        }catch(error){
            console.error(error);
        }
    }
};
vue_add_data(vue_options, { progress_title: '' }); // for progress-dialog
vue_add_global_components(components_bootstrap);
vue_add_global_components(components_utils);

/* add additional components */
  
window.vue = new Vue( vue_options );

const HELPER_BASE = process.env.HELPER_BASE || "/opt/";
const HttpUtils = require(HELPER_BASE + 'http-utils');

class MediaMtxUtis{
  constructor(base_url, user, password){
    this.base_url = base_url;
    this.user = user;
    this.password = password;
  }

  async path_list(){
		var input = {
				url: this.base_url + '/v3/paths/list',
				method: 'GET',
				headers: {
            Authorization: "Basic " + btoa(this.user + ":" + this.password)
				}
		};
		var result = await HttpUtils.do_http(input);
    return result;
  }

  async configpath_list(){
    var input = {
        url: this.base_url + '/v3/config/paths/list',
        method: 'GET',
        headers: {
            Authorization: "Basic " + btoa(this.user + ":" + this.password)
        }
    };
    var result = await HttpUtils.do_http(input);
    return result;
  }

  async path_add(name, input){
    var input = {
        url: this.base_url + '/v3/config/paths/add/' + name,
        method: 'POST',
        body: input,
        headers: {
            Authorization: "Basic " + btoa(this.user + ":" + this.password)
        },
        response_type: "text"
    };
    var result = await HttpUtils.do_http(input);
    return result;
  }

  async path_delete(name){
    var input = {
        url: this.base_url + '/v3/config/paths/delete/' + name,
        method: 'DELETE',
        headers: {
            Authorization: "Basic " + btoa(this.user + ":" + this.password)
        },
        response_type: "text"
    };
    var result = await HttpUtils.do_http(input);
    console.log(result); 

    return result;
  }

  async status_get(){
      var status = {};

      var input = {
          url: this.base_url + '/v3/info',
          method: 'GET',
          headers: {
            Authorization: "Basic " + btoa(this.user + ":" + this.password)
          }
      };
      var result = await HttpUtils.do_http(input);
      console.log(result);
      this.mediamtx_info = result;

      var input = {
          url: this.base_url + '/v3/config/global/get',
          method: 'GET',
          headers: {
            Authorization: "Basic " + btoa(this.user + ":" + this.password)
          }
      };
      var result = await HttpUtils.do_http(input);
      console.log(result);
      status.config = result;

      var input = {
          url: this.base_url + '/v3/config/paths/list',
          method: 'GET',
          headers: {
            Authorization: "Basic " + btoa(this.user + ":" + this.password)
          }
      };
      var result = await HttpUtils.do_http(input);
      console.log(result);
      status.config_paths = result.items;

      var input = {
          url: this.base_url + '/v3/paths/list',
          method: 'GET',
          headers: {
            Authorization: "Basic " + btoa(this.user + ":" + this.password)
          }
      };
      var result = await HttpUtils.do_http(input);
      console.log(result);
      status.paths = result.items;

      var input = {
          url: this.base_url + '/v3/recordings/list',
          method: 'GET',
          headers: {
            Authorization: "Basic " + btoa(this.user + ":" + this.password)
          }
      };
      var result = await HttpUtils.do_http(input);
      console.log(result);
      status.recordings = result.items;

      var input = {
          url: this.base_url + '/v3/rtspsessions/list',
          method: 'GET',
          headers: {
            Authorization: "Basic " + btoa(this.user + ":" + this.password)
          }
      };
      var result = await HttpUtils.do_http(input);
      console.log(result);
      status.rtsp_sessions = result.items;

      var input = {
          url: this.base_url + '/v3/webrtcsessions/list',
          method: 'GET',
          headers: {
            Authorization: "Basic " + btoa(this.user + ":" + this.password)
          }
      };
      var result = await HttpUtils.do_http(input);
      console.log(result);
      status.webrtc_sessions = result.items;

      var input = {
          url: this.base_url + '/v3/hlsmuxers/list',
          method: 'GET',
          headers: {
            Authorization: "Basic " + btoa(this.user + ":" + this.password)
          }
      };
      var result = await HttpUtils.do_http(input);
      console.log(result);
      status.hls_muxers = result.items;

      return status;
  }
}

module.exports = MediaMtxUtis;
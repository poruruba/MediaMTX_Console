'use strict';

const HELPER_BASE = process.env.HELPER_BASE || "/opt/";
const Response = require(HELPER_BASE + 'response');
const Redirect = require(HELPER_BASE + 'redirect');

const HttpUtils = require(HELPER_BASE + 'http-utils');
const MediaMtxUtls = require('./mediamtx_utils');
const qnapfiles = require('./qnap_files');
const mimetypes = require('mime-types');

const MEDIAMTX_ADMIN_USER = process.env.MEDIAMTX_ADMIN_USER;
const MEDIAMTX_ADMIN_PASSWORD = process.env.MEDIAMTX_ADMIN_PASSWORD;
const MEDIAMTX_USER_USER = process.env.MEDIAMTX_USER_USER;
const MEDIAMTX_USER_PASSWORD = process.env.MEDIAMTX_USER_PASSWORD;
const QNAP_USER = process.env.QNAP_USER;
const QNAP_PASSWORD = process.env.QNAP_PASSWORD;

const base_url = 'https://[QNAPサーバ]:29997';
//const base_url = 'http://[QNAPサーバ]:9997';
const qnap_media_dir = "/Documents/mediamtx/media";
const mediamtx_media_dir = "/media";
const recording_base_url = 'https://[QNAPサーバ]:29996';
const recording_base_url_old = 'http://[QNAPサーバ]:9996';

var mediamtx = new MediaMtxUtls(base_url, MEDIAMTX_ADMIN_USER, MEDIAMTX_ADMIN_PASSWORD);

function construct_ffmpeg_image(fname){
	return `ffmpeg -loop 1 -i ${mediamtx_media_dir}/${fname} -c:v libx264 -preset veryfast -tune stillimage -pix_fmt yuv420p -f rtsp -rtsp_transport tcp rtsp://${MEDIAMTX_USER_USER}:${MEDIAMTX_USER_PASSWORD}@127.0.0.1:$RTSP_PORT/$MTX_PATH`;
}

function construct_ffmpeg_mpeg(fname){
	return `ffmpeg -stream_loop -1 -re -i ${mediamtx_media_dir}/${fname} -c:v libx264 -preset veryfast -x264opts "bframes=0:scenecut=0" -pix_fmt yuv420p -c:a libopus -b:a 64k -f rtsp -rtsp_transport tcp rtsp://${MEDIAMTX_USER_USER}:${MEDIAMTX_USER_PASSWORD}@127.0.0.1:$RTSP_PORT/$MTX_PATH`;
}

function construct_ffmpeg_mjpeg(url){
	return `ffmpeg -re -i ${url} -c:v libx264 -preset veryfast -tune zerolatency -g 1 -pix_fmt yuv420p -profile:v baseline -color_range pc -an -err_detect ignore_err -f rtsp -rtsp_transport tcp rtsp://${MEDIAMTX_USER_USER}:${MEDIAMTX_USER_PASSWORD}@@127.0.0.1:$RTSP_PORT/$MTX_PATH`;
}

exports.handler = async (event, context, callback) => {
//	console.log(event);
	var body = JSON.parse(event.body);
	console.log(body);

	if( event.path == '/mediamtx-auth' ){
		if( body.action == 'api' ){
			if( body.user == MEDIAMTX_ADMIN_USER && body.password == MEDIAMTX_ADMIN_PASSWORD ){
				return new Response({});
			}
			console.log("auth failed");
			return new Response({}, 401 );
		}else{
			if( ( body.user == MEDIAMTX_ADMIN_USER && body.password == MEDIAMTX_ADMIN_PASSWORD ) ||
				( body.user == MEDIAMTX_USER_USER && body.password == MEDIAMTX_USER_PASSWORD )){
				return new Response({});
			}
			console.log("auth failed");
			return new Response({}, 401 );
		}
	}else

	if( event.path == '/mediamtx-get-recording'){
		var user = event.requestContext.basicAuth.basic[0];
		var password = event.requestContext.basicAuth.basic[1];

		var input = {
			url: recording_base_url_old + "/list?path=recording",
			method: "GET",
			headers: {
					Authorization: "Basic " + btoa(user + ":" + password)
			}
		};
		var result = await HttpUtils.do_http(input);
		console.log(result);

		result = result.map(item => {
			item.url_view = item.url.replace(recording_base_url_old, recording_base_url);
			return item;
		});
		return new Response({ list: result });
	}else

	if( event.path == '/mediamtx-get-path'){
		var user = event.requestContext.basicAuth.basic[0];
		var password = event.requestContext.basicAuth.basic[1];
		if( !( user == MEDIAMTX_ADMIN_USER && password == MEDIAMTX_ADMIN_PASSWORD ) &&
			 !( user == MEDIAMTX_USER_USER && password == MEDIAMTX_USER_PASSWORD ) ){
				throw new Error("invalid user");
		}

		var result = await mediamtx.path_list();
		console.log(result);

		return new Response({ list: result.items });
	}else

	if( event.path == '/mediamtx-get-media'){
		var user = event.requestContext.basicAuth.basic[0];
		var password = event.requestContext.basicAuth.basic[1];
		if( !( user == MEDIAMTX_ADMIN_USER && password == MEDIAMTX_ADMIN_PASSWORD ) &&
			 !( user == MEDIAMTX_USER_USER && password == MEDIAMTX_USER_PASSWORD ) ){
				throw new Error("invalid user");
		}

		var sid = await qnapfiles.signin(QNAP_USER, QNAP_PASSWORD);
		var list = await qnapfiles.get_list(sid, qnap_media_dir);

		return new Response({ list: list });
	}	else

	if( event.path == '/mediamtx-add-media'){
		var user = event.requestContext.basicAuth.basic[0];
		var password = event.requestContext.basicAuth.basic[1];
		if( !( user == MEDIAMTX_ADMIN_USER && password == MEDIAMTX_ADMIN_PASSWORD ) &&
			 !( user == MEDIAMTX_USER_USER && password == MEDIAMTX_USER_PASSWORD ) ){
				throw new Error("invalid user");
		}

		var body = JSON.parse(event.body);

		var type = mimetypes.lookup(body.fname);
		var runOnDemand;
		if( type.startsWith("image/") )
				runOnDemand = construct_ffmpeg_image(body.fname);
		else if( type.startsWith("video/") )
				runOnDemand = construct_ffmpeg_mpeg(body.fname);
		else
			throw new Error("file invalid");

		var result = await mediamtx.path_add(body.path, {
			name: body.path,
			runOnDemand: runOnDemand
		});
		console.log(result);

		return new Response({});
	}else

	if( event.path == '/mediamtx-delete-media'){
		var user = event.requestContext.basicAuth.basic[0];
		var password = event.requestContext.basicAuth.basic[1];
		if( !( user == MEDIAMTX_ADMIN_USER && password == MEDIAMTX_ADMIN_PASSWORD ) &&
			 !( user == MEDIAMTX_USER_USER && password == MEDIAMTX_USER_PASSWORD ) ){
				throw new Error("invalid user");
		}

		var body = JSON.parse(event.body);

		var result = await mediamtx.path_delete(body.path);
		console.log(result);

		return new Response({});
	}else

	{
		throw new Error("unknown endpoint");
	}
};

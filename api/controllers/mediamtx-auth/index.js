'use strict';

const HELPER_BASE = process.env.HELPER_BASE || "/opt/";
const Response = require(HELPER_BASE + 'response');
const Redirect = require(HELPER_BASE + 'redirect');

const MEDIAMTX_ADMIN_USER = process.env.MEDIAMTX_ADMIN_USER;
const MEDIAMTX_ADMIN_PASSWORD = process.env.MEDIAMTX_ADMIN_PASSWORD;
const MEDIAMTX_USER_USER = process.env.MEDIAMTX_USER_USER;
const MEDIAMTX_USER_PASSWORD = process.env.MEDIAMTX_USER_PASSWORD;

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
	{
		throw new Error("unknown endpoint");
	}
};

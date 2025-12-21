'use strict';

const { URLSearchParams } = require('url');
const fetch = require('node-fetch');
const Headers = fetch.Headers;

// input: url, method, headers, qs, body, params, response_type, content_type, token, api_key
async function do_http(input){
  const method = input.method ? input.method : "POST";
  const content_type = input.content_type ? input.content_type : "application/json";
  const response_type = input.response_type ? input.response_type : "json";

  const headers = new Headers();
  if( input.headers ){
    for( const key of Object.keys(input.headers))
      headers.append(key, input.headers[key]);
  }

  if( content_type != "multipart/form-data" )
    headers.append("Content-Type", content_type);
  if( input.basic )
    headers.append("Authorization", "Basic " + Buffer.from(input.basic).toString('base64'));
  if( input.token )
    headers.append("Authorization", "Bearer " + input.token);
  if( input.api_key )
    headers.append("x-api-key", input.api_key);

  let body;
  if( content_type == "application/json" ){
    body = JSON.stringify(input.body);
  }else if( content_type == "application/x-www-form-urlencoded"){
    body = new URLSearchParams(input.params);
  }else if( content_type == "multipart/form-data"){
    body = Object.entries(input.params).reduce((l, [k, v]) => { if(v !== undefined) l.append(k, v); return l; }, new FormData());
  }else if( content_type == "application/octet-stream" ){
    body = input.body;
  }

  const params = new URLSearchParams(input.qs);
  var params_str = params.toString();
  var postfix = (params_str == "") ? "" : ((input.url.indexOf('?') >= 0) ? ('&' + params_str) : ('?' + params_str));

  return fetch(input.url + postfix, {
    method: method,
    body: body,
    headers: headers,
    cache: "no-store"
  })
  .then((response) => {
    if (!response.ok)
      throw new Error('status is not 200');

    if( response_type == "json" )
      return response.json();
    else if( response_type == "raw" )
      return response;
    else if( response_type == 'blob')
      return response.blob();
    else if( response_type == 'file'){
      const disposition = response.headers.get('Content-Disposition');
      let filename = "";
      if( disposition ){
        filename = disposition.split(/;(.+)/)[1].split(/=(.+)/)[1];
        if (filename.toLowerCase().startsWith("utf-8''"))
            filename = decodeURIComponent(filename.replace(/utf-8''/i, ''));
        else
            filename = filename.replace(/['"]/g, '');
      }
      return response.blob()
      .then(blob =>{
        return new File([blob], filename, { type: blob.type })      
      });
    }
    else if( response_type == 'binary')
      return response.arrayBuffer();
    else // response_type == "text"
      return response.text();
  });
}

module.exports = {
  do_http,

};


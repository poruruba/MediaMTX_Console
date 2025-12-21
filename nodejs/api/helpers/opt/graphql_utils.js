'use strict';

const fetch = require('node-fetch');
const Headers = fetch.Headers;

function gql_isString(obj) {
  return typeof (obj) == "string" || obj instanceof String;
};

function gql_templ(strings, ...keys) {
  return (function(values) {
    var result = [strings[0]];
    keys.forEach(function(key, i) {
      var value = values[key];
      if( gql_isString(value) )
        value = gql_escape(value);
      result.push(value, strings[i + 1]);
    });
    return result.join('');
  });
}

function gql_escape(str){
  var t = JSON.stringify({ p: str });
  return t.slice(5, -1);
}

// input: url, headers, qs, exp, variables, token, api_key
async function do_gql_query(input){
  var body;  
  if( input.exps instanceof Function ){
    body = {
      query: input.exps(input.variables)
    };
  }else{
    body = {
      query: input.exps,
    };
    if( input.variables )
      body.variables = input.variables;
  }
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  if( input.headers ){
    for( const key of Object.keys(input.headers))
      headers.append(key, input.headers[key]);
  }
  if( input.token )
    headers.append("Authorization", "Bearer " + input.token);
  if( input.api_key )
    headers.append("x-api-key", input.api_key);

  const params = new URLSearchParams(input.qs);
  var params_str = params.toString();
  var postfix = (params_str == "") ? "" : ((input.url.indexOf('?') >= 0) ? ('&' + params_str) : ('?' + params_str));

  var response = await fetch(input.url + postfix, {
    method: "POST",
    body: JSON.stringify(body),
    headers: headers,
    cache: "no-store"
  });
  var json = await response.json();
  if( json.errors )
    throw json.errors;
  return json.data;
}

module.exports = {
  do_gql_query,
  gql_templ
};

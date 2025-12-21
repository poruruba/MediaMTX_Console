'use strict';

const THIS_BASE_PATH = process.env.THIS_BASE_PATH;
const MAX_DATA_SIZE = process.env.MAX_DATA_SIZE || '1mb';
const CONTROLLERS_BASE = THIS_BASE_PATH + '/api/controllers/';

const TARGET_FNAME = "mcp.yaml";

const { StreamableHTTPServerTransport  } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const fs = require('fs');
const yaml = require('yaml');
const express = require('express');
const router = express.Router();
const jsonParser = express.json({limit: MAX_DATA_SIZE});
let mcp_basePath = '/';

// mcp.yamlの検索
const folders = fs.readdirSync(CONTROLLERS_BASE);
folders.forEach(folder => {
  try{
    const stats_dir = fs.statSync(CONTROLLERS_BASE + folder);
    if( !stats_dir.isDirectory() )
        return;

    const fname = CONTROLLERS_BASE + folder + "/" + TARGET_FNAME;
    if( !fs.existsSync(fname) )
      return;
    const stats_file = fs.statSync(fname);
    if( !stats_file.isFile() )
      return;

    // mcp.yamlの解析
    const mcp = yaml.parseDocument(fs.readFileSync(fname, 'utf-8'));
    parse_mcp_yaml(mcp, CONTROLLERS_BASE + folder);
  }catch(error){
    console.log(error);
    return;
  }
});

function parse_mcp_yaml(mcp, folder)
{
  // paths配下のみ参照
  const paths = mcp.get('paths');
  paths.items.forEach(docPath =>{
    const path = docPath.key.value;
    docPath.value.items.forEach(docMethod =>{
      // method=postのみ
      if (docMethod.key.value != 'post')
        return;

      let handler = "handler";
      const docHandler = docMethod.value.items.filter(item => item.key.value == 'x-handler');
      if (docHandler.length == 1)
        handler = docHandler[0].value.value;

      try{
        const func = require(folder)[handler];
        const server = func();

        router.post(path, jsonParser, async (req, res) => {
          // console.log('Received MCP request ' + req.method);

          // In stateless mode, create a new instance of transport and server for each request
          // to ensure complete isolation. A single instance would cause request ID collisions
          // when multiple clients connect concurrently.
          
          try {
            const transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: undefined
            });
            res.on('close', () =>{
//              console.log('Request closed');
              transport.close();
            });
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
          } catch (error) {
            console.error('Error handling MCP request:', error);
            if (!res.headersSent) {
              res.status(500).json({
                jsonrpc: '2.0',
                error: {
                  code: -32603,
                  message: 'Internal server error',
                },
                id: null,
              });
            }
          }
        });
        console.log(path, "post", "mcp", handler);
      }catch(error){
        console.error(error);
      }
    });
  });
}

module.exports = {
  router: router,
  basePath: mcp_basePath
};

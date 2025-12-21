'use strict';

const { McpServer, ResourceTemplate } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require("zod");

exports.handler = () => {
    const server = new McpServer({
        name: "McpTest",
        version: "1.0.0"
    });

    // Add tools
    server.tool("testtool1", "2つの数値を加算します。",
        { a: z.number().describe("数値1"), b: z.number().describe("数値2") },
        async (args) => {
          return {
            content: [
              {
                type: "text",
                text: String(args.a + args.b)
              }
            ]
          }
        }
    );
    server.tool("testtool2", "2つの数値を減算します。",
      { a: z.number().describe("数値1"), b: z.number().describe("数値2") },
      async (args) => {
        return {
          content: [
            {
              type: "text",
              text: String(args.a - args.b)
            }
          ]
        }
      }
    );

    // Add a dynamic greeting resource
    server.resource(
        "greeting",
        new ResourceTemplate("greeting://{name}", { list: async () => {
            return {
                resources:
                    [
                      { name: "hogehoge", uri: "greeting://hogehoge"},
                    ]
            };
          }}
        ),
        async (uri, variables) => {
          return {
              contents: [{
                  uri: uri.href,
                  text: `Hello, ${variables.name}!`
              }]
          }
        }
    );
    
    return server;
};

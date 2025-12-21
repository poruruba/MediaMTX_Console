'use strict';

const HELPER_BASE = process.env.HELPER_BASE || "/opt/";
const Response = require(HELPER_BASE + 'response');
const Redirect = require(HELPER_BASE + 'redirect');

exports.handler = async (req, res) => {
  console.log('--- get() called ---')
  console.log(req.query)
  res.send('Done')
};

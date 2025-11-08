// amplify/backend/function/applms4426e4c8/src/index.js
const AWS = require('aws-sdk');

// ===== Helpers =====
function pickEnv(suffix) {
  for (const [k, v] of Object.entries(process.env)) {
    if (k.endsWith(suffix) && v) return v;
  }
  return undefined;
}
const USERPOOL_ID =
  process.env.USERPOOL_ID ||
  pickEnv('_USERPOOLID');

const REGION =
  process.env.REGION ||
  pickEnv('_REGION') ||
  process.env.AWS_REGION ||
  'ap-southeast-1';

AWS.config.update({ region: REGION });
const cognito = new AWS.CognitoIdentityServiceProvider();

const ok = (body) => ({
  statusCode: 200,
  headers: {
    'Access-Control-Allow-Origin': '*',            // prod: đổi thành domain của bạn
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  },
  body: JSON.stringify(body),
});

const err = (code, message) => ({
  statusCode: code || 500,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  },
  body: JSON.stringify({ error: message }),
});

// ===== Main handler (router) =====
exports.handler = async (event) => {
  try {
    // Preflight CORS
    if (event.httpMethod === 'OPTIONS') return ok({});

    const path = (event.path || '').toLowerCase();
    const method = event.httpMethod || 'GET';

    // Parse body nếu là POST
    let body = {};
    if (event.body) {
      try { body = JSON.parse(event.body); } catch { body = {}; }
    }

    // 1) GET /listusers
    if (method === 'GET' && path.endsWith('/listusers')) {
      const data = await cognito.listUsers({ UserPoolId: USERPOOL_ID }).promise();
      return ok({ users: data.Users });
    }

    // 2) GET /listgroupsforuser?username=alice
    if (method === 'GET' && path.endsWith('/listgroupsforuser')) {
      const username = event.queryStringParameters?.username;
      if (!username) return err(400, 'missing username');
      const data = await cognito.adminListGroupsForUser({
        UserPoolId: USERPOOL_ID,
        Username: username,
      }).promise();
      return ok({ Groups: data.Groups });
    }

    // 3) POST /addusertogroup   { username, groupName }
    if (method === 'POST' && path.endsWith('/addusertogroup')) {
      const { username, groupName } = body;
      if (!username || !groupName) return err(400, 'missing username/groupName');
      await cognito.adminAddUserToGroup({
        UserPoolId: USERPOOL_ID,
        Username: username,
        GroupName: groupName,
      }).promise();
      return ok({ ok: true });
    }

    // 4) POST /removeuserfromgroup   { username, groupName }
    if (method === 'POST' && path.endsWith('/removeuserfromgroup')) {
      const { username, groupName } = body;
      if (!username || !groupName) return err(400, 'missing username/groupName');
      await cognito.adminRemoveUserFromGroup({
        UserPoolId: USERPOOL_ID,
        Username: username,
        GroupName: groupName,
      }).promise();
      return ok({ ok: true });
    }

    // 5) POST /createuser   { email, groupName? }
    if (method === 'POST' && path.endsWith('/createuser')) {
      const { email, groupName } = body;
      if (!email) return err(400, 'missing email');
      const created = await cognito.adminCreateUser({
        UserPoolId: USERPOOL_ID,
        Username: email,
        UserAttributes: [{ Name: 'email', Value: email }],
      }).promise();

      if (groupName) {
        await cognito.adminAddUserToGroup({
          UserPoolId: USERPOOL_ID,
          Username: email,
          GroupName: groupName,
        }).promise();
      }
      return ok({ message: 'User created', user: created });
    }

    // Not found
    return err(404, 'not found');
  } catch (e) {
    console.error('Handler error:', e);
    return err(500, e.message || 'internal error');
  }
};

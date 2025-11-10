// amplify/backend/function/applms4426e4c8/src/index.js
// Node.js 18/20/22 + AWS SDK v3

const {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminListGroupsForUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminCreateUserCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

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
  'ap-south-1';

const client = new CognitoIdentityProviderClient({ region: REGION });

// ------- Response helpers -------
const ok = (body) => ({
  statusCode: 200,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  },
  body: JSON.stringify(body),
});

const err = (code, message, details) => ({
  statusCode: code || 500,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  },
  body: JSON.stringify({ error: message, ...(details ? { details } : {}) }),
});

// ===== Main handler (router) =====
exports.handler = async (event) => {
  try {
    // Preflight CORS
    if (event?.httpMethod === 'OPTIONS') return ok({});

    const path = (event?.path || '').toLowerCase();
    const method = event?.httpMethod || 'GET';

    let body = {};
    if (event?.body) {
      try { body = JSON.parse(event.body); } catch { body = {}; }
    }

    // 1) GET /listusers
    if (method === 'GET' && path.endsWith('/listusers')) {
      try {
        const data = await client.send(
          new ListUsersCommand({ UserPoolId: USERPOOL_ID, Limit: 50 })
        );
        const users = (data.Users || []).map(u => ({
          username: u.Username,
          status: u.UserStatus,
          email: (u.Attributes || []).find(a => a.Name === 'email')?.Value || null,
        }));
        return ok({ users });
      } catch (e) {
        console.error('listUsers Cognito error:', e);
        return err(500, 'listUsers failed', { code: e.code || e.name });
      }
    }

    // 2) GET /listgroupsforuser?username=alice
    if (method === 'GET' && path.endsWith('/listgroupsforuser')) {
      const username = event?.queryStringParameters?.username;
      if (!username) return err(400, 'missing username');
      try {
        const data = await client.send(
          new AdminListGroupsForUserCommand({ UserPoolId: USERPOOL_ID, Username: username })
        );
        return ok({ groups: data.Groups || [] });
      } catch (e) {
        console.error('adminListGroupsForUser error:', e);
        return err(500, 'listGroupsForUser failed', { code: e.code || e.name });
      }
    }

    // 3) POST /addusertogroup   { username, groupName }
    if (method === 'POST' && path.endsWith('/addusertogroup')) {
      const { username, groupName } = body;
      if (!username || !groupName) return err(400, 'missing username/groupName');
      try {
        await client.send(
          new AdminAddUserToGroupCommand({ UserPoolId: USERPOOL_ID, Username: username, GroupName: groupName })
        );
        return ok({ ok: true });
      } catch (e) {
        console.error('adminAddUserToGroup error:', e);
        return err(500, 'addUserToGroup failed', { code: e.code || e.name });
      }
    }

    // 4) POST /removeuserfromgroup   { username, groupName }
    if (method === 'POST' && path.endsWith('/removeuserfromgroup')) {
      const { username, groupName } = body;
      if (!username || !groupName) return err(400, 'missing username/groupName');
      try {
        await client.send(
          new AdminRemoveUserFromGroupCommand({ UserPoolId: USERPOOL_ID, Username: username, GroupName: groupName })
        );
        return ok({ ok: true });
      } catch (e) {
        console.error('adminRemoveUserFromGroup error:', e);
        return err(500, 'removeUserFromGroup failed', { code: e.code || e.name });
      }
    }

    // 5) POST /createuser   { email, groupName? }
    if (method === 'POST' && path.endsWith('/createuser')) {
      const { email, groupName } = body;
      if (!email) return err(400, 'missing email');
      try {
        const created = await client.send(
          new AdminCreateUserCommand({
            UserPoolId: USERPOOL_ID,
            Username: email,
            UserAttributes: [{ Name: 'email', Value: email }],
          })
        );
        if (groupName) {
          await client.send(
            new AdminAddUserToGroupCommand({
              UserPoolId: USERPOOL_ID, Username: email, GroupName: groupName,
            })
          );
        }
        return ok({ message: 'User created', user: created });
      } catch (e) {
        console.error('createUser error:', e);
        return err(500, 'createUser failed', { code: e.code || e.name });
      }
    }

    // Not found
    return err(404, 'not found');
  } catch (e) {
    console.error('Handler error:', e);
    return err(500, e.message || 'internal error', { code: e.code || e.name });
  }
};

/* amplify/backend/function/applms4426e4c8/src/app.js */
const express = require('express');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');

const app = express();
app.use(bodyParser.json());

// --- Tìm User Pool ID & Region từ env do Amplify sinh ra ---
function pickEnv(suffix) {
  // tìm biến env kết thúc bằng suffix (VD: _USERPOOLID, _REGION)
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

if (!USERPOOL_ID) {
  console.warn('WARN: USERPOOL_ID not found in env. Check auth resource env vars.');
}

AWS.config.update({ region: REGION });
const cognito = new AWS.CognitoIdentityServiceProvider();

// --- CORS đơn giản ---
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // hoặc hạn chế domain của bạn
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

/** GET /listUsers */
app.get('/listUsers', async (req, res) => {
  try {
    const data = await cognito.listUsers({ UserPoolId: USERPOOL_ID }).promise();
    res.json({ users: data.Users });
  } catch (error) {
    console.error('listUsers error:', error);
    res.status(500).json({ error: error.message });
  }
});

/** GET /listGroupsForUser?username=<name> */
app.get('/listGroupsForUser', async (req, res) => {
  try {
    const username = req.query.username;
    if (!username) return res.status(400).json({ error: 'missing username' });
    const data = await cognito.adminListGroupsForUser({
      UserPoolId: USERPOOL_ID,
      Username: username,
    }).promise();
    res.json({ Groups: data.Groups });
  } catch (error) {
    console.error('listGroupsForUser error:', error);
    res.status(500).json({ error: error.message });
  }
});

/** POST /addUserToGroup  { username, groupName } */
app.post('/addUserToGroup', async (req, res) => {
  try {
    const { username, groupName } = req.body || {};
    await cognito.adminAddUserToGroup({
      UserPoolId: USERPOOL_ID,
      Username: username,
      GroupName: groupName,
    }).promise();
    res.json({ ok: true });
  } catch (error) {
    console.error('addUserToGroup error:', error);
    res.status(500).json({ error: error.message });
  }
});

/** POST /removeUserFromGroup  { username, groupName } */
app.post('/removeUserFromGroup', async (req, res) => {
  try {
    const { username, groupName } = req.body || {};
    await cognito.adminRemoveUserFromGroup({
      UserPoolId: USERPOOL_ID,
      Username: username,
      GroupName: groupName,
    }).promise();
    res.json({ ok: true });
  } catch (error) {
    console.error('removeUserFromGroup error:', error);
    res.status(500).json({ error: error.message });
  }
});

/** POST /createUser  { email, groupName? } */
app.post('/createUser', async (req, res) => {
  try {
    const { email, groupName } = req.body || {};
    if (!email) return res.status(400).json({ error: 'missing email' });

    const created = await cognito.adminCreateUser({
      UserPoolId: USERPOOL_ID,
      Username: email,
      UserAttributes: [{ Name: 'email', Value: email }],
      DesiredDeliveryMediums: ['EMAIL'],
    }).promise();

    if (groupName) {
      await cognito.adminAddUserToGroup({
        UserPoolId: USERPOOL_ID,
        Username: email,
        GroupName: groupName,
      }).promise();
    }

    res.json({ message: 'User created', user: created });
  } catch (error) {
    console.error('createUser error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('applms4426e4c8 Lambda (Express) running'));
module.exports = app;

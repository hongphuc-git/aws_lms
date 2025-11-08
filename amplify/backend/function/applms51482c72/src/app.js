/* amplify/backend/function/applms51482c72/src/app.js */

const express = require('express');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');

const app = express();
app.use(bodyParser.json());

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

// --- CORS (cho phép frontend gọi) ---
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ====== ROUTES ======

// Lấy danh sách người dùng
app.get('/listUsers', async (req, res) => {
  try {
    const data = await cognito.listUsers({ UserPoolId: USERPOOL_ID }).promise();
    res.json({ users: data.Users });
  } catch (error) {
    console.error('listUsers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Lấy nhóm của user
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

// Thêm user vào nhóm
app.post('/addUserToGroup', async (req, res) => {
  try {
    const { username, groupName } = req.body;
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

// Xoá user khỏi nhóm
app.post('/removeUserFromGroup', async (req, res) => {
  try {
    const { username, groupName } = req.body;
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

// Tạo user mới và gán nhóm
app.post('/createUser', async (req, res) => {
  try {
    const { email, groupName } = req.body;
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

    res.json({ message: 'User created successfully', user: created });
  } catch (error) {
    console.error('createUser error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('AdminQueries Lambda is running'));
module.exports = app;

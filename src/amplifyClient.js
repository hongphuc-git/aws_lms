// src/amplifyClient.ts
import { Amplify } from 'aws-amplify';
import config from './amplifyconfiguration.json'; // đường dẫn tới file bạn nói

Amplify.configure(config);

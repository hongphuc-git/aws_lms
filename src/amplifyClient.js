// Centralized Amplify configuration to ensure every module shares the same instance.
import { Amplify } from 'aws-amplify';
import amplifyConfig from './amplifyconfiguration.json';

Amplify.configure(amplifyConfig);

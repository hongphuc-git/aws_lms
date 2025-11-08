import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// --- Khởi tạo Amplify (Đã sửa lỗi Invalid Hook Call) ---
// Chạy cấu hình TẠI ĐÂY để đảm bảo nó chạy trước khi Authenticator render
import { Amplify } from 'aws-amplify';
import awsExports from './aws-exports'; 
Amplify.configure(awsExports);
// ----------------------------------------------------

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
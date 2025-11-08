// App.jsx
import React, { useState, useEffect } from 'react';

import { Amplify } from 'aws-amplify';
import outputs from './amplifyconfiguration';
import AdminDashboard from './AdminDashboard';
// --- AWS Amplify v6 Imports ---
import { generateClient } from '@aws-amplify/api';
import { uploadData } from '@aws-amplify/storage';
import { fetchAuthSession } from 'aws-amplify/auth';

// --- Amplify UI ---
import {
  withAuthenticator,
  Button,
  Heading,
  View,
  Card,
  Text,
  Flex,
  Badge,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

// --- GraphQL (Do Amplify Codegen tạo ra) ---
import { listCourses } from './graphql/queries';
// import { createLecture } from './graphql/mutations';

// Tạo API client v6 (thay cho API.graphql cũ)
const client = generateClient();

/* =================================================================
   1. STUDENT DASHBOARD COMPONENT (Học sinh)
   ================================================================= */
const StudentDashboard = ({ user }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchCourses = async () => {
      setLoading(true);
      try {
        const courseData = await client.graphql({ query: listCourses });
        if (!mounted) return;
        const items = courseData?.data?.listCourses?.items ?? [];
        setCourses(items);
      } catch (err) {
        console.error('Lỗi khi tải khóa học:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCourses();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View padding="large">
      <Heading level={3}>Bảng điều khiển: Học sinh</Heading>
      <Text>Chào mừng, {user?.username || 'User'}!</Text>

      <Heading level={4} marginTop="medium">
        Các khóa học của bạn
      </Heading>

      {loading ? (
        <Text>Đang tải khóa học...</Text>
      ) : courses.length === 0 ? (
        <Text>Chưa có khóa học nào.</Text>
      ) : (
        <Flex direction="column" gap="small">
          {courses.map((course) => (
            <Card key={course.id} variation="outlined" padding="medium">
              <Heading level={5}>{course.title}</Heading>
              <Text>{course.description}</Text>
              <Text fontSize="small">
                Giảng viên:{' '}
                {course.instructor?.username ? course.instructor.username : 'N/A'}
              </Text>
            </Card>
          ))}
        </Flex>
      )}
    </View>
  );
};

/* =================================================================
   2. INSTRUCTOR DASHBOARD COMPONENT (Giảng viên)
   ================================================================= */
const InstructorDashboard = ({ user }) => {
  return (
    <View padding="large">
      <Heading level={3}>Bảng điều khiển: Giảng viên</Heading>
      <Text>Chào mừng, Giảng viên {user?.username || 'User'}!</Text>
      <Button marginTop="medium">Tạo khóa học mới</Button>

      {/* Ví dụ: Upload file lên S3 bằng Amplify Storage v6 */}
      <View marginTop="medium">
        <input
          type="file"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const result = await uploadData({
                key: file.name,
                data: file,
                options: { contentType: file.type },
              }).result; // .result để chờ upload hoàn tất (v6)
              console.log('Tải lên thành công:', result?.key || result?.path);
              alert('Tải lên thành công!');
            } catch (error) {
              console.error('Lỗi khi tải file:', error);
              alert('Tải lên thất bại. Vui lòng thử lại!');
            } finally {
              e.target.value = '';
            }
          }}
        />
      </View>
    </View>
  );
};

/* =================================================================
   3. ADMIN DASHBOARD COMPONENT (Quản trị viên)
   ================================================================= */


Amplify.configure(outputs);

/* =================================================================
   4. MAIN APP COMPONENT (Đã được xác thực)
   ================================================================= */
const AppContent = ({ signOut, user }) => {
  const [userRole, setUserRole] = useState(null); // 'Admin' | 'Instructor' | 'Student' | null

  useEffect(() => {
    // Lấy role từ token bằng fetchAuthSession (chuẩn Amplify v6)
    let mounted = true;
    (async () => {
      try {
        const { tokens } = await fetchAuthSession();
        // Claim 'cognito:groups' thường nằm trong ID token; fallback sang Access token
        const groups =
          (tokens?.idToken?.payload?.['cognito:groups'] ?? []) ||
          (tokens?.accessToken?.payload?.['cognito:groups'] ?? []);

        const groupList = Array.isArray(groups) ? groups : [];

        if (groupList.includes('Admin')) {
          if (mounted) setUserRole('Admin');
        } else if (groupList.includes('Instructor')) {
          if (mounted) setUserRole('Instructor');
        } else {
          if (mounted) setUserRole('Student');
        }
      } catch (e) {
        console.error('Không lấy được session:', e);
        if (mounted) setUserRole('Student'); // Fallback an toàn
      }
    })();

    return () => {
      mounted = false;
    };
  }, []); // KHÔNG phụ thuộc vào `user`

  // Render dashboard theo role
  const renderDashboardByRole = () => {
    if (!userRole) return <Text>Đang tải vai trò người dùng...</Text>;
    if (userRole === 'Admin') return <AdminDashboard user={user} />;
    if (userRole === 'Instructor') return <InstructorDashboard user={user} />;
    return <StudentDashboard user={user} />;
  };

  return (
    <View
      className="app-container"
      width="100vw"
      minHeight="100vh"
      backgroundColor="var(--amplify-colors-background-secondary)"
    >
      {/* Header */}
      <Flex
        as="header"
        justifyContent="space-between"
        alignItems="center"
        padding="medium"
        backgroundColor="var(--amplify-colors-background-primary)"
        boxShadow="small"
      >
        <Heading level={2}>Hệ thống LMS</Heading>
        <Flex alignItems="center">
          <Text>{user?.username || 'User'}</Text>
          {userRole && (
            <Badge variation="info" marginLeft="small">
              {userRole}
            </Badge>
          )}
          <Button onClick={signOut} marginLeft="medium">
            Đăng xuất
          </Button>
        </Flex>
      </Flex>

      {/* Nội dung chính */}
      <main>{renderDashboardByRole()}</main>
    </View>
  );
};

/* =================================================================
   5. WRAP APP VỚI BỘ XÁC THỰC
   ================================================================= */
const AppWithAuth = withAuthenticator(AppContent);

// Component App chính để export
export default function App() {
  return <AppWithAuth />;
}

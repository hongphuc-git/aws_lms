// App.jsx
import outputs from './amplifyconfiguration';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import AdminDashboard from './AdminDashboard';
import InstructorDashboard from './InstructorDashboard';
// --- AWS Amplify v6 Imports ---
import { generateClient } from '@aws-amplify/api';
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
  Loader,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

// --- GraphQL (Do Amplify Codegen tạo ra) ---
import { listCourses } from './graphql/queries';
// import { createLecture } from './graphql/mutations';


import { Amplify } from 'aws-amplify';
Amplify.configure(outputs);

// Tạo API client v6 (thay cho API.graphql cũ)
const client = generateClient();

/* =================================================================
   1. STUDENT DASHBOARD COMPONENT (Học sinh)
   ================================================================= */
const StudentDashboard = ({ user, role = 'Student' }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const courseData = await client.graphql({ query: listCourses });
      const items = courseData?.data?.listCourses?.items ?? [];
      setCourses(items.filter(Boolean));
    } catch (err) {
      console.error('Lỗi khi tải khóa học:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const uniqueInstructors = useMemo(() => {
    const names = new Set(
      courses
        .map((course) => course?.instructor?.username || course?.instructorID)
        .filter(Boolean)
    );
    return names.size;
  }, [courses]);

  const heroMetrics = useMemo(
    () => [
      { label: 'Khoá học đang theo', value: courses.length },
      { label: 'Giảng viên khác nhau', value: uniqueInstructors },
      { label: 'Vai trò', value: role || 'Student' }
    ],
    [courses.length, role, uniqueInstructors]
  );

  const renderCourseList = () => {
    if (loading) {
      return (
        <Flex alignItems="center" justifyContent="center" padding="large">
          <Loader />
          <Text marginLeft="small">Đang tải khóa học...</Text>
        </Flex>
      );
    }

    if (courses.length === 0) {
      return (
        <Card variation="outlined" padding="large">
          <Heading level={5}>Chưa có khóa học</Heading>
          <Text>Hãy liên hệ quản trị viên để được ghi danh vào các khóa học.</Text>
        </Card>
      );
    }

    return (
      <Flex direction="column" gap="medium">
        {courses.map((course) => (
          <Card key={course.id} variation="outlined" padding="medium">
            <Flex justifyContent="space-between" gap="medium" alignItems="flex-start">
              <View>
                <Heading level={5}>{course.title}</Heading>
                <Text color="font.tertiary">
                  {course.description || 'Khóa học chưa có mô tả.'}
                </Text>
                <Text fontSize="small" marginTop="small">
                  Giảng viên:{' '}
                  {course?.instructor?.username ||
                    course?.instructorID ||
                    'Đang cập nhật'}
                </Text>
              </View>
              <View textAlign="right">
                <Text fontSize="small" color="font.tertiary">
                  Mã Instructor
                </Text>
                <Heading level={6}>{course?.instructorID || 'N/A'}</Heading>
              </View>
            </Flex>
          </Card>
        ))}
      </Flex>
    );
  };

  return (
    <View padding="large">
      <Card
        variation="elevated"
        padding="large"
        backgroundColor="var(--amplify-colors-brand-primary-90)"
        style={{ color: 'white' }}
      >
        <Heading level={4} color="white">
          Chào mừng, {user?.username || 'Học viên'}
        </Heading>
        <Text color="white" opacity={0.9}>
          Theo dõi tiến độ học tập và khám phá nội dung mới nhất trong chương trình.
        </Text>
        <Flex gap="large" wrap="wrap" marginTop="medium">
          {heroMetrics.map((metric) => (
            <View key={metric.label}>
              <Text fontSize="small" color="white" opacity={0.8}>
                {metric.label}
              </Text>
              <Heading level={3} margin="0">
                {metric.value}
              </Heading>
            </View>
          ))}
        </Flex>
      </Card>

      <Card variation="outlined" padding="large" marginTop="large">
        <Flex justifyContent="space-between" alignItems="center" marginBottom="medium">
          <View>
            <Heading level={4} marginBottom="xxs">
              Khoá học của bạn
            </Heading>
            <Text color="font.tertiary">
              Danh sách khóa học đã được ghi danh dành riêng cho bạn.
            </Text>
          </View>
          <Button
            size="small"
            onClick={fetchCourses}
            isLoading={loading}
            variation="primary"
          >
            Làm mới
          </Button>
        </Flex>
        {renderCourseList()}
      </Card>
    </View>
  );
};

/* =================================================================
   2. INSTRUCTOR DASHBOARD COMPONENT (Giảng viên)
   ================================================================= */

/* =================================================================
   3. ADMIN DASHBOARD COMPONENT (Quản trị viên)
   ================================================================= */

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
    if (!userRole) return <Text>Dang tai vai tro nguoi dung...</Text>;
    if (userRole === 'Admin') {
      return <AdminDashboard user={user} role={userRole} />;
    }
    if (userRole === 'Instructor') {
      return <InstructorDashboard user={user} role={userRole} />;
    }
    return <StudentDashboard user={user} role={userRole} />;
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

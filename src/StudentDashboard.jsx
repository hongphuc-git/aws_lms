import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';
import {
  View,
  Card,
  Heading,
  Text,
  Flex,
  Button,
  Loader
} from '@aws-amplify/ui-react';
import { generateClient } from '@aws-amplify/api';
import { listCourses, enrollmentsByStudentID } from './graphql/queries';
import './amplifyClient';
import {
  createEnrollmentRequestMutation,
  enrollmentRequestsByStudentQuery
} from './graphql/enrollmentRequests';
import CourseDetail from './CourseDetail';

const client = generateClient();

export default function StudentDashboard({ user, role = 'Student' }) {
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [requestingCourseId, setRequestingCourseId] = useState('');
  const [activeCourseId, setActiveCourseId] = useState('');

  const studentId = useMemo(() => {
    return (
      user?.attributes?.sub ||
      user?.userId ||
      user?.username ||
      ''
    );
  }, [user]);

  const fetchCourses = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const courseData = await client.graphql({ query: listCourses });
      const items = courseData?.data?.listCourses?.items ?? [];
      setCourses(items.filter(Boolean));
    } catch (err) {
      console.error('Lỗi khi tải khóa học:', err);
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  const fetchEnrollments = useCallback(async () => {
    if (!studentId) return;
    try {
      const res = await client.graphql({
        query: enrollmentsByStudentID,
        variables: { studentID: studentId, limit: 200 },
        authMode: 'userPool'
      });
      const items =
        res.data?.enrollmentsByStudentID?.items?.filter(Boolean) ?? [];
      setEnrollments(items);
    } catch (error) {
      console.error('Lỗi khi tải danh sách ghi danh:', error);
    }
  }, [studentId]);

  const fetchRequests = useCallback(async () => {
    if (!studentId) return;
    try {
      const res = await client.graphql({
        query: enrollmentRequestsByStudentQuery,
        variables: { studentID: studentId },
        authMode: 'userPool'
      });
      const items =
        res.data?.enrollmentRequestsByStudentID?.items?.filter(Boolean) ?? [];
      setRequests(items);
    } catch (error) {
      console.error('Lỗi khi tải yêu cầu ghi danh:', error);
    }
  }, [studentId]);

  useEffect(() => {
    fetchCourses();
    fetchEnrollments();
    fetchRequests();
  }, [fetchCourses, fetchEnrollments, fetchRequests]);

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
      { label: 'Khoá học đã ghi danh', value: enrollments.length },
      { label: 'Giảng viên khác nhau', value: uniqueInstructors },
      { label: 'Vai trò', value: role || 'Student' }
    ],
    [enrollments.length, role, uniqueInstructors]
  );

  const enrolledCourseIds = useMemo(
    () => new Set(enrollments.map((item) => item.courseID)),
    [enrollments]
  );

  const pendingCourseIds = useMemo(
    () =>
      new Set(
        requests
          .filter((req) => req.status === 'PENDING')
          .map((req) => req.courseID)
      ),
    [requests]
  );

  const enrolledCourses = useMemo(
    () => courses.filter((course) => enrolledCourseIds.has(course.id)),
    [courses, enrolledCourseIds]
  );

  const availableCourses = useMemo(
    () => courses.filter((course) => !enrolledCourseIds.has(course.id)),
    [courses, enrolledCourseIds]
  );

  const handleRequestEnrollment = async (courseId) => {
    if (!studentId) {
      alert('Không tìm thấy thông tin học viên để đăng ký.');
      return;
    }
    setRequestingCourseId(courseId);
    try {
      await client.graphql({
        query: createEnrollmentRequestMutation,
        variables: {
          input: {
            courseID: courseId,
            studentID: studentId,
            status: 'PENDING'
          }
        },
        authMode: 'userPool'
      });
      await fetchRequests();
      alert('Đã gửi yêu cầu đăng ký, vui lòng chờ giảng viên phê duyệt.');
    } catch (error) {
      console.error('Lỗi khi gửi yêu cầu ghi danh:', error);
      alert(error.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setRequestingCourseId('');
    }
  };

  const handleOpenCourse = useCallback((courseId) => {
    setActiveCourseId(courseId);
  }, []);

  const renderCourseList = (
    list,
    emptyMessage,
    allowRegistration = false
  ) => {
    if (loadingCourses && courses.length === 0) {
      return (
        <Flex alignItems="center" justifyContent="center" padding="large">
          <Loader />
          <Text marginLeft="small">Đang tải khoá học...</Text>
        </Flex>
      );
    }

    if (list.length === 0) {
      return (
        <Card variation="outlined" padding="large" className="lms-card lms-section-card">
          <Heading level={5}>Chưa có khoá học</Heading>
          <Text>{emptyMessage}</Text>
        </Card>
      );
    }

    return (
      <Flex direction="column" gap="medium">
        {list.map((course) => {
          const pending = pendingCourseIds.has(course.id);
          return (
            <Card
              key={course.id}
              variation="outlined"
              padding="medium"
              className="lms-card lms-section-card"
            >
              <Flex justifyContent="space-between" gap="medium" alignItems="flex-start">
                <View>
                  <Heading level={5}>{course.title}</Heading>
                  <Text color="font.tertiary">
                    {course.description || 'Khoá học chưa có mô tả.'}
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
                  {allowRegistration && (
                    <Button
                      size="small"
                      marginTop="small"
                      variation="primary"
                      onClick={() => handleRequestEnrollment(course.id)}
                      isLoading={requestingCourseId === course.id}
                      disabled={pending || requestingCourseId === course.id}
                    >
                      {pending ? 'Đang chờ duyệt' : 'Đăng ký'}
                    </Button>
                  )}
                  {!allowRegistration && (
                    <Button
                      size="small"
                      marginTop="small"
                      variation="primary"
                      onClick={() => handleOpenCourse(course.id)}
                    >
                      Vào học
                    </Button>
                  )}
                </View>
              </Flex>
            </Card>
          );
        })}
      </Flex>
    );
  };

  return (
    <View className="lms-dashboard-shell">
      <View className="lms-dashboard-inner">
        <Card variation="elevated" padding="large" className="lms-hero-card">
          <View className="lms-hero-header">
            <Heading level={4} color="var(--amplify-colors-font-primary)">
              Chào mừng, {user?.username || 'Hoc vien'}
            </Heading>
            <Text color="var(--amplify-colors-font-primary)" opacity={0.9}>
              Theo dõi tiến độ học của bạn và gửi yêu cầu tham gia khóa học mới.
            </Text>
          </View>
        <View className="lms-hero-metrics">
          {heroMetrics.map((metric) => (
            <View key={metric.label} className="metric">
              <Text fontSize="small" color="var(--amplify-colors-font-primary)" opacity="0.8">
                {metric.label}
              </Text>
              <Heading level="3" margin="0">
                {metric.value}
              </Heading>
            </View>
          ))}
        </View>
      </Card>

      <Card
        variation="outlined"
        padding="large"
        marginTop="large"
        className="lms-card lms-section-card"
      >
        <Flex justifyContent="space-between" alignItems="center" marginBottom="medium">
          <View>
            <Heading level={4} marginBottom="xxs">
              Khóa học của bạn
            </Heading>
            <Text color="font.tertiary">
              Danh sách khóa học đã được phê duyệt
            </Text>
          </View>
          <Button
            size="small"
            onClick={() => {
              fetchCourses();
              fetchEnrollments();
            }}
            isLoading={loadingCourses}
            variation="primary"
          >
            Làm mới
          </Button>
        </Flex>
        {renderCourseList(
          enrolledCourses,
          'Chưa có khóa học nào được phê duyệt'
        )}
      </Card>

      <Card
        variation="outlined"
        padding="large"
        marginTop="large"
        className="lms-card lms-section-card"
      >
        <Heading level={4} marginBottom="xxs">
          Khóa học có thể đăng ký
        </Heading>
        <Text color="font.tertiary" marginBottom="medium">
          Gửi yêu cầu cho giảng viên/ quản trị viên trước khi vào lớp.
        </Text>
        {renderCourseList(
          availableCourses,
          'Không còn khóa học để đăng ký.',
          true
        )}
      </Card>
      </View>
      {activeCourseId && (
        <CourseDetail
          courseId={activeCourseId}
          onClose={() => setActiveCourseId('')}
          role="Student"
          user={user}
        />
      )}
    </View>
  );
}

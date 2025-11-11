import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  View,
  Heading,
  Text,
  Flex,
  Button,
  Loader,
  Card,
  Input,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  ToggleButtonGroup,
  ToggleButton
} from '@aws-amplify/ui-react';
import { generateClient } from '@aws-amplify/api';
import { uploadData } from '@aws-amplify/storage';
import {
  listUsers,
  coursesByInstructorID,
  enrollmentsByCourseID
} from './graphql/queries';
import { createCourse, createUser } from './graphql/mutations';

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch (_) {
    return value;
  }
};

function CourseForm({ onCreate, creating, disabled }) {
  const [form, setForm] = useState({ title: '', description: '' });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => setForm({ title: '', description: '' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!onCreate || disabled) return;
    await onCreate(form, resetForm);
  };

  return (
    <Card variation="outlined" padding="medium" marginBottom="medium">
      <Heading level={5}>Tạo khóa học mới</Heading>
      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="small" marginTop="small">
          <Input
            placeholder="Tên khóa học *"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            required
            disabled={disabled}
          />
          <Input
            placeholder="Mô tả"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            disabled={disabled}
          />
          <Flex gap="small">
            <Button
              type="submit"
              isLoading={creating}
              disabled={disabled}
            >
              Tạo khóa học
            </Button>
            <Button
              type="button"
              variation="link"
              onClick={resetForm}
              disabled={disabled || creating}
            >
              Xóa form
            </Button>
          </Flex>
        </Flex>
      </form>
    </Card>
  );
}

function ResourceUploader() {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [latestFile, setLatestFile] = useState('');

  const handleFileChange = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const key = `${Date.now()}-${file.name}`;
      const result = await uploadData({
        key,
        data: file,
        options: { contentType: file.type }
      }).result;
      setLatestFile(result?.key || key);
      alert('Tải tệp thành công!');
    } catch (error) {
      console.error('upload file error:', error);
      alert(error?.message || 'Không thể tải tệp, vui lòng thử lại.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }, []);

  return (
    <Card variation="outlined" padding="medium">
      <Heading level={5}>Tài nguyên khóa học</Heading>
      <Text fontSize="small">
        Đẩy nhanh việc chuẩn bị bài bằng cách tải video, slide hoặc tài liệu
        tham khảo lên S3.
      </Text>
      <input
        type="file"
        ref={inputRef}
        hidden
        onChange={handleFileChange}
      />
      <Button
        marginTop="small"
        onClick={() => inputRef.current?.click()}
        isLoading={uploading}
      >
        {uploading ? 'Đang tải...' : 'Chọn tệp'}
      </Button>
      {latestFile && (
        <Text fontSize="small" marginTop="small">
          File gần nhất: {latestFile}
        </Text>
      )}
    </Card>
  );
}

export default function InstructorDashboard({ user, role = 'Instructor' }) {
  const [client] = useState(() => generateClient());
  const [activeTab, setActiveTab] = useState('overview');

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState('');

  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const [enrollmentMap, setEnrollmentMap] = useState({});
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  const [creatingCourse, setCreatingCourse] = useState(false);

  const username = user?.username;

  const normalizedRole = useMemo(() => {
    if (typeof role === 'string') {
      const upper = role.trim().toUpperCase();
      if (['ADMIN', 'INSTRUCTOR', 'STUDENT'].includes(upper)) {
        return upper;
      }
    }
    return 'INSTRUCTOR';
  }, [role]);
  const derivedUserId = useMemo(() => {
    return user?.attributes?.sub || user?.userId || username || '';
  }, [user, username]);
  const derivedEmail = useMemo(() => {
    return (
      user?.attributes?.email ||
      user?.signInUserSession?.idToken?.payload?.email ||
      ''
    );
  }, [user]);

  const userFilter = useMemo(() => {
    const clauses = [];
    if (username) clauses.push({ username: { eq: username } });
    if (derivedUserId) clauses.push({ id: { eq: derivedUserId } });
    if (clauses.length === 0) return null;
    if (clauses.length === 1) return clauses[0];
    return { or: clauses };
  }, [derivedUserId, username]);



  const loadEnrollmentsForCourses = useCallback(async (courseList) => {
    if (!courseList?.length) {
      setEnrollmentMap({});
      return;
    }
    setLoadingEnrollments(true);
    try {
      const entries = await Promise.all(
        courseList.map(async (course) => {
          try {
            const result = await client.graphql({
              query: enrollmentsByCourseID,
              variables: { courseID: course.id, limit: 100 },
              authMode: 'userPool'
            });
            const items =
              result.data?.enrollmentsByCourseID?.items?.filter(Boolean) ?? [];
            return [course.id, items];
          } catch (err) {
            console.error('load enrollments error:', course.id, err);
            return [course.id, []];
          }
        })
      );
      setEnrollmentMap(Object.fromEntries(entries));
    } finally {
      setLoadingEnrollments(false);
    }
  }, [client]);

  const loadCoursesForInstructor = useCallback(async (instructorId) => {
    if (!instructorId) {
      setCourses([]);
      setEnrollmentMap({});
      return;
    }
    setLoadingCourses(true);
    try {
      const result = await client.graphql({
        query: coursesByInstructorID,
        variables: { instructorID: instructorId, limit: 100 },
        authMode: 'userPool'
      });
      const items =
        result.data?.coursesByInstructorID?.items?.filter(Boolean) ?? [];
      setCourses(items);
      await loadEnrollmentsForCourses(items);
    } catch (error) {
      console.error('load courses error:', error);
    } finally {
      setLoadingCourses(false);
    }
  }, [client, loadEnrollmentsForCourses]);


  const seedUserProfile = useCallback(async () => {
    if (!derivedUserId) {
      throw new Error('Kh?ng x?c ??nh ???c ID ng??i d?ng ?? kh?i t?o.');
    }
    const fallbackEmail =
      derivedEmail || `no-email-${derivedUserId}@placeholder.local`;
    const input = {
      id: derivedUserId,
      username: username || derivedUserId,
      email: fallbackEmail,
      role: normalizedRole
    };
    const result = await client.graphql({
      query: createUser,
      variables: { input },
      authMode: 'userPool'
    });
    if (result.errors?.length) {
      const conditional = result.errors.some(
        (err) =>
          err?.errorType === 'DynamoDB:ConditionalCheckFailedException' ||
          err?.message?.includes('ConditionalCheckFailed')
      );
      if (conditional) {
        const fallbackFilter =
          userFilter ??
          (derivedUserId ? { id: { eq: derivedUserId } } : undefined);
        if (fallbackFilter) {
          try {
            const fallbackResult = await client.graphql({
              query: listUsers,
              variables: {
                filter: fallbackFilter,
                limit: 1
              },
              authMode: 'userPool'
            });
            const existing = fallbackResult.data?.listUsers?.items?.[0] ?? null;
            if (existing) {
              return existing;
            }
          } catch (fallbackErr) {
            console.error('fallback listUsers error:', fallbackErr);
          }
        }
        const error = new Error('USER_ALREADY_EXISTS');
        error.details = result.errors;
        throw error;
      }
      const unauthorized = result.errors.some(
        (err) => err?.errorType === 'Unauthorized'
      );
      if (unauthorized) {
        const error = new Error('USER_CREATE_UNAUTHORIZED');
        error.details = result.errors;
        throw error;
      }
      const error = new Error(result.errors[0].message || 'createUser failed.');
      error.details = result.errors;
      throw error;
    }
    const created = result.data?.createUser ?? null;
    if (!created) {
      throw new Error('createUser kh?ng tr? d? li?u.');
    }
    return created;
  }, [
    client,
    derivedEmail,
    derivedUserId,
    normalizedRole,
    userFilter,
    username
  ]);



  const fetchProfile = useCallback(async () => {
    if (!username) {
      setProfile(null);
      setLoadingProfile(false);
      setProfileError('Kh?ng t?m th?y username trong session.');
      return null;
    }
    setLoadingProfile(true);
    setProfileError('');
    try {
      const result = await client.graphql({
        query: listUsers,
        variables: {
          filter: userFilter ?? undefined,
          limit: 1
        },
        authMode: 'userPool'
      });
      let record = result.data?.listUsers?.items?.[0] ?? null;
      if (!record) {
        try {
          record = await seedUserProfile();
        } catch (seedError) {
          console.error('seed user profile error:', seedError);
        }
      }
      setProfile(record);
      if (!record) {
        setProfileError(
          'Kh?ng t?m th?y b?n ghi User v? kh?ng th? t? t?o. Vui l?ng li?n h? qu?n tr? vi?n.'
        );
      }
      return record;
    } catch (error) {
      console.error('fetch instructor profile error:', error);
      setProfileError('Kh?ng th? t?i th?ng tin gi?ng vi?n.');
      return null;
    } finally {
      setLoadingProfile(false);
    }
  }, [client, seedUserProfile, userFilter, username]);



  useEffect(() => {
    let cancelled = false;
    (async () => {
      const record = await fetchProfile();
      if (cancelled || !record?.id) return;
      await loadCoursesForInstructor(record.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchProfile, loadCoursesForInstructor]);

  const handleRefresh = useCallback(async () => {
    const currentProfile = profile || await fetchProfile();
    if (!currentProfile?.id) return;
    await loadCoursesForInstructor(currentProfile.id);
  }, [fetchProfile, loadCoursesForInstructor, profile]);


  const handleCreateCourse = useCallback(async (formValues, resetForm) => {
    const currentProfile = profile || (await fetchProfile());
    if (!currentProfile?.id) {
      alert('Kh?ng c? th?ng tin gi?ng vi?n ?? t?o kho? h?c.');
      return;
    }
    setCreatingCourse(true);
    try {
      const input = {
        title: formValues.title.trim(),
        description: formValues.description.trim() || null,
        instructorID: currentProfile.id
      };
      const result = await client.graphql({
        query: createCourse,
        variables: { input },
        authMode: 'userPool'
      });
      if (result.errors?.length) {
        throw new Error(result.errors[0].message);
      }
      await loadCoursesForInstructor(currentProfile.id);
      resetForm?.();
    } catch (error) {
      console.error('create course error:', error);
      alert(error?.message || 'Kh?ng th? t?o kho? h?c.');
    } finally {
      setCreatingCourse(false);
    }
  }, [client, fetchProfile, loadCoursesForInstructor, profile]);

  const totalStudents = useMemo(() => {
    const ids = new Set();
    Object.values(enrollmentMap).forEach((list) =>
      list.forEach((enrollment) => ids.add(enrollment.studentID))
    );
    return ids.size;
  }, [enrollmentMap]);

  const allEnrollments = useMemo(() => {
    return courses.flatMap((course) =>
      (enrollmentMap[course.id] || []).map((enrollment) => ({
        id: enrollment.id,
        studentID: enrollment.studentID,
        courseTitle: course.title,
        createdAt: enrollment.createdAt
      }))
    );
  }, [courses, enrollmentMap]);

  const overviewCards = useMemo(() => ([
    { label: 'Khóa học của tôi', value: courses.length },
    { label: 'Học viên đã ghi danh', value: totalStudents },
    { label: 'Lượt ghi danh', value: allEnrollments.length }
  ]), [courses.length, totalStudents, allEnrollments.length]);

  const heroHighlights = useMemo(
    () => [
      { label: 'Khoá học đang quản lý', value: courses.length },
      { label: 'Học viên chủ động', value: totalStudents },
      { label: 'Tổng lượt ghi danh', value: allEnrollments.length }
    ],
    [courses.length, totalStudents, allEnrollments.length]
  );
  const isBusy = loadingProfile || loadingCourses || loadingEnrollments;

  const OverviewTab = () => (
    <Flex direction="column" gap="medium">
      <Card variation="outlined" padding="large">
        <Flex gap="large" wrap="wrap">
          {overviewCards.map((card) => (
            <View key={card.label}>
              <Text fontSize="small" color="font.tertiary">
                {card.label}
              </Text>
              <Heading level={2} margin="0">
                {card.value}
              </Heading>
            </View>
          ))}
        </Flex>
      </Card>
      <ResourceUploader />
    </Flex>
  );

  const CoursesTab = () => (
    <Flex direction="column" gap="medium">
      <CourseForm
        onCreate={handleCreateCourse}
        creating={creatingCourse}
        disabled={!profile?.id || loadingProfile}
      />
      <Card variation="outlined" padding="large">
        <Flex justifyContent="space-between" alignItems="center" marginBottom="medium">
          <Heading level={4} marginBottom="0">
            Danh sách khóa học
          </Heading>
          <Button
            size="small"
            variation="link"
            onClick={handleRefresh}
            isLoading={loadingCourses}
          >
            Làm mới dữ liệu
          </Button>
        </Flex>
        {loadingCourses ? (
          <Flex alignItems="center" gap="small">
            <Loader />
            <Text>Đang tải danh sách khóa học...</Text>
          </Flex>
        ) : courses.length === 0 ? (
          <Text>Chưa có khóa học nào. Hãy tạo khóa học đầu tiên.</Text>
        ) : (
          <Table highlightOnHover>
            <TableHead>
              <TableRow>
                <TableCell as="th">Tên khóa học</TableCell>
                <TableCell as="th">Mô tả</TableCell>
                <TableCell as="th">Học viên</TableCell>
                <TableCell as="th">Ngày tạo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>{course.title}</TableCell>
                  <TableCell>{course.description || '—'}</TableCell>
                  <TableCell>{enrollmentMap[course.id]?.length ?? 0}</TableCell>
                  <TableCell>{formatDate(course.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </Flex>
  );

  const StudentsTab = () => (
    <Card variation="outlined" padding="large">
      <Flex justifyContent="space-between" alignItems="center" marginBottom="medium">
        <Heading level={4} marginBottom="0">
          Học viên đã ghi danh
        </Heading>
        <Button
          size="small"
          variation="link"
          onClick={handleRefresh}
          isLoading={loadingEnrollments}
        >
          Đồng bộ
        </Button>
      </Flex>
      {loadingEnrollments ? (
        <Flex alignItems="center" gap="small">
          <Loader />
          <Text>Đang tải danh sách học viên...</Text>
        </Flex>
      ) : allEnrollments.length === 0 ? (
        <Text>Chưa có học viên nào ghi danh vào các khóa của bạn.</Text>
      ) : (
        <Table highlightOnHover>
          <TableHead>
            <TableRow>
              <TableCell as="th">Khóa học</TableCell>
              <TableCell as="th">Student ID</TableCell>
              <TableCell as="th">Ngày ghi danh</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {allEnrollments.map((enrollment) => (
              <TableRow key={enrollment.id}>
                <TableCell>{enrollment.courseTitle}</TableCell>
                <TableCell>{enrollment.studentID}</TableCell>
                <TableCell>{formatDate(enrollment.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );

  return (
    <View padding="large">
      <Card
        variation="elevated"
        padding="large"
        backgroundColor="var(--amplify-colors-brand-primary-100)"
        style={{ color: 'white' }}
      >
        <Flex
          justifyContent="space-between"
          alignItems="flex-start"
          gap="medium"
          wrap="wrap"
        >
          <View>
            <Heading level={3} color="white" marginBottom="xxs">
              Bảng điều khiển: Giảng viên
            </Heading>
            <Text color="white">
              Xin chào, {username || 'Instructor'}.
            </Text>
            {profile?.email && (
              <Text fontSize="small" color="white" opacity={0.8}>
                Email: {profile.email}
              </Text>
            )}
            {profileError && (
              <Text color="var(--amplify-colors-red-40)" fontSize="small">
                {profileError}
              </Text>
            )}
          </View>
          <Flex gap="small">
            <Button
              variation="link"
              onClick={handleRefresh}
              isLoading={isBusy}
              style={{ color: 'white' }}
            >
              Làm mới dữ liệu
            </Button>
            <Button
              variation="primary"
              onClick={() => setActiveTab('courses')}
            >
              Tạo khóa học
            </Button>
          </Flex>
        </Flex>
        <Flex gap="large" wrap="wrap" marginTop="medium">
          {heroHighlights.map((item) => (
            <View key={item.label}>
              <Text fontSize="small" color="white" opacity={0.8}>
                {item.label}
              </Text>
              <Heading level={3} margin="0">
                {item.value}
              </Heading>
            </View>
          ))}
        </Flex>
      </Card>

      {isBusy && (
        <Flex marginTop="small" alignItems="center" gap="small">
          <Loader size="small" />
          <Text>Đang đồng bộ dữ liệu mới nhất...</Text>
        </Flex>
      )}

      <Card variation="outlined" padding="medium" marginTop="medium">
        <Flex justifyContent="space-between" alignItems="center">
          <Heading level={5} margin="0">
            Khu vực quản lý
          </Heading>
          <ToggleButtonGroup
            value={activeTab}
            onChange={setActiveTab}
            isExclusive
            size="small"
          >
            <ToggleButton value="overview">Tổng quan</ToggleButton>
            <ToggleButton value="courses">Khóa học</ToggleButton>
            <ToggleButton value="students">Học viên</ToggleButton>
          </ToggleButtonGroup>
        </Flex>
      </Card>

      <View marginTop="medium">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'courses' && <CoursesTab />}
        {activeTab === 'students' && <StudentsTab />}
      </View>
    </View>
  );
}

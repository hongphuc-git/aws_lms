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
import { createCourse } from './graphql/mutations';

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

export default function InstructorDashboard({ user }) {
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

  const fetchProfile = useCallback(async () => {
    if (!username) {
      setProfile(null);
      setLoadingProfile(false);
      setProfileError('Không tìm thấy username trong session.');
      return null;
    }
    setLoadingProfile(true);
    setProfileError('');
    try {
      const result = await client.graphql({
        query: listUsers,
        variables: {
          filter: { username: { eq: username } },
          limit: 1
        },
        authMode: 'userPool'
      });
      const record = result.data?.listUsers?.items?.[0] ?? null;
      setProfile(record);
      if (!record) {
        setProfileError(
          'Không tìm thấy bản ghi User. Vui lòng tạo User trong DynamoDB.'
        );
      }
      return record;
    } catch (error) {
      console.error('fetch instructor profile error:', error);
      setProfileError('Không thể tải thông tin giảng viên.');
      return null;
    } finally {
      setLoadingProfile(false);
    }
  }, [client, username]);

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
    if (!profile?.id) {
      alert('Không có thông tin giảng viên để tạo khóa học.');
      return;
    }
    setCreatingCourse(true);
    try {
      const input = {
        title: formValues.title.trim(),
        description: formValues.description.trim() || null,
        instructorID: profile.id
      };
      const result = await client.graphql({
        query: createCourse,
        variables: { input },
        authMode: 'userPool'
      });
      if (result.errors?.length) {
        throw new Error(result.errors[0].message);
      }
      await loadCoursesForInstructor(profile.id);
      resetForm?.();
    } catch (error) {
      console.error('create course error:', error);
      alert(error?.message || 'Không thể tạo khóa học.');
    } finally {
      setCreatingCourse(false);
    }
  }, [client, loadCoursesForInstructor, profile]);

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

  const OverviewTab = () => (
    <View>
      <Flex gap="medium" wrap="wrap" marginBottom="medium">
        {overviewCards.map((card) => (
          <Card key={card.label} variation="outlined" padding="large">
            <Heading level={5}>{card.label}</Heading>
            <Heading level={2}>{card.value}</Heading>
          </Card>
        ))}
      </Flex>
      <ResourceUploader />
    </View>
  );

  const CoursesTab = () => (
    <View>
      <Heading level={4} marginBottom="small">Khóa học</Heading>
      <CourseForm
        onCreate={handleCreateCourse}
        creating={creatingCourse}
        disabled={!profile?.id}
      />
      {loadingCourses ? (
        <Loader />
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
    </View>
  );

  const StudentsTab = () => (
    <View>
      <Heading level={4} marginBottom="small">Học viên đã ghi danh</Heading>
      {loadingEnrollments ? (
        <Loader />
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
    </View>
  );

  return (
    <View padding="large">
      <Flex justifyContent="space-between" alignItems="center">
        <View>
          <Heading level={3}>Bảng điều khiển: Giảng viên</Heading>
          <Text>Xin chào, {username || 'Instructor'}.</Text>
          {profile?.email && (
            <Text fontSize="small">Email: {profile.email}</Text>
          )}
          {profileError && (
            <Text color="red" fontSize="small">
              {profileError}
            </Text>
          )}
        </View>
        <Button onClick={handleRefresh} variation="primary">
          Làm mới dữ liệu
        </Button>
      </Flex>

      {(loadingProfile || loadingCourses) && (
        <Flex marginTop="small" alignItems="center" gap="small">
          <Loader size="small" />
          <Text>Đang tải dữ liệu giảng viên...</Text>
        </Flex>
      )}

      <Flex marginTop="medium" marginBottom="small">
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

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'courses' && <CoursesTab />}
      {activeTab === 'students' && <StudentsTab />}
    </View>
  );
}

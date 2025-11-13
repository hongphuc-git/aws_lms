import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Heading, Text, Flex, Button, Loader,
  Table, TableHead, TableRow, TableCell, TableBody,
  Card, Input, SelectField, ToggleButtonGroup, ToggleButton
} from '@aws-amplify/ui-react';
import { generateClient, get, post } from '@aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { listCourses } from './graphql/queries';
import { createCourse } from './graphql/mutations';
import CourseDetail from './CourseDetail';
import './amplifyClient';

const API_NAME = 'apie63ce51c';
const ROLES = ['Admin', 'Instructor', 'Student'];

/* ----------------------- Helpers ------------------------- */
async function authHeaders() {
  const { tokens } = await fetchAuthSession();
  return { Authorization: tokens?.idToken?.toString() ?? '' };
}
const getUsername = (u) => u?.Username ?? u?.username ?? u?.UserName ?? '';
const getEmail = (u) => {
  if (u?.email) return u.email;
  const attrs = Array.isArray(u?.Attributes)
    ? u.Attributes
    : (Array.isArray(u?.UserAttributes) ? u.UserAttributes : []);
  const a = attrs.find(x => (x?.Name || x?.name) === 'email');
  return a?.Value || a?.value || 'N/A';
};
const toGroupNames = (groups) => {
  if (!groups) return [];
  if (Array.isArray(groups)) {
    if (typeof groups[0] === 'string') return groups;
    if (typeof groups[0] === 'object') return groups.map(g => g?.GroupName).filter(Boolean);
  }
  return [];
};
const pickPrimaryRole = (groups) => {
  if (groups.includes('Admin')) return 'Admin';
  if (groups.includes('Instructor')) return 'Instructor';
  return 'Student';
};

/* --------------------- Course Form ------------------------ */
function CourseForm({ onCreateCourse, creatingCourse, currentUser }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    instructorID: currentUser?.id || ''
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      instructorID: currentUser?.id || ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onCreateCourse(form, resetForm);
    } catch (error) {
      console.error('Lỗi khi gửi form:', error);
      alert(`Không thể tạo khóa học: ${error?.message || 'Lỗi không xác định'}`);
    }
  };

  return (
    <Card
      variation="outlined"
      padding="medium"
      marginBottom="medium"
      className="lms-card lms-section-card"
    >
      <Heading level={5}>Tạo khoá học mới</Heading>
      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="small" marginTop="small">
          <Input
            placeholder="Tiêu đề *"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            required
          />
          <Input
            placeholder="Mô tả"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />
          <Input
            placeholder="Giảng viên (instructorID - User.id) *"
            value={form.instructorID}
            onChange={(e) => handleChange('instructorID', e.target.value)}
            required
          />
          <Flex gap="small">
            <Button type="submit" isLoading={creatingCourse}>Tạo khoá</Button>
            <Button type="button" variation="link" onClick={resetForm}>
              Xoá form
            </Button>
          </Flex>
        </Flex>
      </form>
    </Card>
  );
}

/* --------------------- Main Component --------------------- */
export default function AdminDashboard({ user }) {
  const [client] = useState(() => generateClient());
  const [activeTab, setActiveTab] = useState('overview');

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [roleDraft, setRoleDraft] = useState({});
  const [busyUserAction, setBusyUserAction] = useState(false);

  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [detailCourseId, setDetailCourseId] = useState('');

  /* ---------------- Load Users (Cognito via API GW) ----------------- */
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const headers = await authHeaders();
      const op = get({ apiName: API_NAME, path: '/listUsers', options: { headers } });
      const { body } = await op.response;
      const raw = await body.json();
      const list = raw?.users ?? [];

      const enriched = await Promise.all(list.map(async (u) => {
        const uname = getUsername(u);
        try {
          const op2 = get({
            apiName: API_NAME,
            path: '/listGroupsForUser',
            options: { headers, queryParams: { username: uname } }
          });
          const { body: body2 } = await op2.response;
          const gdata = await body2.json();
          const groups = toGroupNames(gdata?.groups || []);
          return {
            ...u,
            Username: uname,
            Email: getEmail(u),
            Groups: groups,
            currentRole: pickPrimaryRole(groups)
          };
        } catch {
          return {
            ...u,
            Username: uname,
            Email: getEmail(u),
            Groups: [],
            currentRole: 'Student'
          };
        }
      }));
      setUsers(enriched);
    } catch (err) {
      console.error('listUsers error:', err);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  /* ---------------- Load Courses (GraphQL) ----------------- */
  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const res = await client.graphql({ query: listCourses, authMode: 'userPool' });
      setCourses(res?.data?.listCourses?.items ?? []);
    } catch (err) {
      console.error('listCourses error:', err);
    } finally {
      setLoadingCourses(false);
    }
  }, [client]);

  useEffect(() => {
    (async () => {
      const s = await fetchAuthSession();
      const idt = s.tokens?.idToken;
      console.log('Signed-in username:', idt?.payload?.['cognito:username']);
      console.log('cognito:groups:', idt?.payload?.['cognito:groups'] ?? []);
    })();
    loadUsers();
    loadCourses();
  }, [loadUsers, loadCourses]);

  /* ---------------- Create Course ----------------- */
  const onCreateCourse = async (formData, resetForm) => {
    const title = (formData?.title || '').trim();
    const instructorID = (formData?.instructorID || '').trim();

    if (!title || !instructorID) {
      alert('Tiêu đề và InstructorID là bắt buộc');
      return;
    }

    setCreatingCourse(true);
    try {
      const input = {
        title,
        description: (formData?.description || '').trim() || undefined,
        instructorID
      };

      const session = await fetchAuthSession();
      const idt = session.tokens?.idToken;
      console.log('Calling createCourse as:', idt?.payload?.['cognito:username']);
      console.log('Groups:', idt?.payload?.['cognito:groups'] ?? []);
      console.log('Sending data to GraphQL:', input);

      const result = await client.graphql({
        query: createCourse,
        variables: { input },
        authMode: 'userPool'
      });

      console.log('GraphQL Response:', result);

      if (result.errors?.length) {
        console.error('GraphQL Errors:', result.errors);
        alert(`Lỗi khi tạo khóa học: ${result.errors[0].message}`);
        return;
      }

      await loadCourses();
      resetForm();
    } catch (err) {
      console.error('Unexpected error during createCourse:', err);
      alert(err?.errors?.[0]?.message || err?.message || 'Không thể tạo khóa học. Vui lòng thử lại sau.');
    } finally {
      setCreatingCourse(false);
    }
  };

  /* ---------------- Save Role (Cognito Groups) ----------------- */
  const saveUserRole = async (u) => {
    const uname = u?.Username || getUsername(u);
    const newRole = roleDraft[uname] || u.currentRole;
    if (!uname) return alert('Thiếu username');
    if (newRole === u.currentRole) return;

    setBusyUserAction(true);
    try {
      const headers = await authHeaders();
      if (u.currentRole && u.currentRole !== 'Student' && u.currentRole !== newRole) {
        await post({
          apiName: API_NAME,
          path: '/removeUserFromGroup',
          options: { headers, body: { username: uname, groupName: u.currentRole } }
        }).response;
      }
      await post({
        apiName: API_NAME,
        path: '/addUserToGroup',
        options: { headers, body: { username: uname, groupName: newRole } }
      }).response;

      await loadUsers();
      window.alert(`✅ Cập nhật vai trò: ${uname} → ${newRole}\n(Đăng xuất & đăng nhập lại để token cập nhật nhóm)`);
    } catch (err) {
      console.error('saveUserRole error:', err);
    } finally {
      setBusyUserAction(false);
    }
  };

  /* ---------------- Totals ----------------- */
  const totals = useMemo(() => {
    let admin = 0, instructor = 0, student = 0;
    users.forEach(u => {
      const g = toGroupNames(u.Groups);
      if (g.includes('Admin')) admin++;
      else if (g.includes('Instructor')) instructor++;
      else student++;
    });
    return {
      users: users.length,
      courses: courses.length,
      Admin: admin,
      Instructor: instructor,
      Student: student
    };
  }, [users, courses]);

  const heroHighlights = useMemo(
    () => [
      { label: 'Tổng người dùng', value: totals.users },
      { label: 'Tổng khóa học', value: totals.courses },
      { label: 'Admin đang hoạt động', value: totals.Admin }
    ],
    [totals]
  );

  const roleBreakdown = useMemo(
    () => [
      { label: 'Admin', value: totals.Admin },
      { label: 'Instructor', value: totals.Instructor },
      { label: 'Student', value: totals.Student }
    ],
    [totals]
  );

  const quickActions = useMemo(
    () => [
      {
        label: 'Quản lý người dùng',
        description: 'Cập nhật vai trò và nhóm quyền trong Cognito.',
        action: () => setActiveTab('users')
      },
      {
        label: 'Tạo khóa học mới',
        description: 'Khởi tạo khóa học và phân công giảng viên.',
        action: () => setActiveTab('courses')
      },
      {
        label: 'Đồng bộ dữ liệu',
        description: 'Làm mới danh sách người dùng và khóa học.',
        action: () => {
          loadUsers();
          loadCourses();
        }
      }
    ],
    [loadCourses, loadUsers, setActiveTab]
  );

  const isBusy =
    loadingUsers || loadingCourses || busyUserAction || creatingCourse;

  /* ---------------- UI ----------------- */
  const RoleSelector = ({ u }) => {
    const uname = u.Username;
    const value = roleDraft[uname] ?? u.currentRole;
    return (
      <SelectField
        labelHidden
        value={value}
        onChange={(e) =>
          setRoleDraft(prev => ({ ...prev, [uname]: e.target.value }))
        }
      >
        {ROLES.map(r => (
          <option key={r} value={r}>{r}</option>
        ))}
      </SelectField>
    );
  };

  const UsersTab = () => (
    <Card variation="outlined" padding="large">
      <Flex justifyContent="space-between" alignItems="center" marginBottom="medium">
        <View>
          <Heading level={4} marginBottom="xxs">
            Danh sách người dùng
          </Heading>
          <Text color="font.tertiary">
            Quản lý vai trò cho toàn bộ tài khoản trong hệ thống.
          </Text>
        </View>
        <Button
          size="small"
          variation="primary"
          onClick={loadUsers}
          isLoading={loadingUsers}
        >
          Làm mới
        </Button>
      </Flex>
      {loadingUsers ? (
        <Flex alignItems="center" gap="small">
          <Loader />
          <Text>Đang tải người dùng…</Text>
        </Flex>
      ) : users.length === 0 ? (
        <Text>Chưa có người dùng nào được đồng bộ.</Text>
      ) : (
        <Table highlightOnHover>
          <TableHead>
            <TableRow>
              <TableCell as="th">Username</TableCell>
              <TableCell as="th">Email</TableCell>
              <TableCell as="th">Vai trò hiện tại</TableCell>
              <TableCell as="th">Chọn vai trò</TableCell>
              <TableCell as="th">Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.Username}>
                <TableCell>{u.Username}</TableCell>
                <TableCell>{u.Email}</TableCell>
                <TableCell>{u.currentRole}</TableCell>
                <TableCell><RoleSelector u={u} /></TableCell>
                <TableCell>
                  <Button
                    size="small"
                    onClick={() => saveUserRole(u)}
                    isLoading={busyUserAction}
                  >
                    Lưu
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );

  const CoursesTab = () => (
    <Flex direction="column" gap="medium">
      <CourseForm
        onCreateCourse={onCreateCourse}
        creatingCourse={creatingCourse}
        currentUser={user}
      />
      <Card variation="outlined" padding="large" className="lms-card lms-section-card">
        <Flex justifyContent="space-between" alignItems="center" marginBottom="medium">
          <View>
            <Heading level={4} marginBottom="xxs">
              Danh sách khoá học
            </Heading>
            <Text color="font.tertiary">
              Theo dõi toàn bộ khoá học đã được tạo trong hệ thống.
            </Text>
          </View>
          <Button
            size="small"
            variation="primary"
            onClick={loadCourses}
            isLoading={loadingCourses}
          >
            Làm mới
          </Button>
        </Flex>
        {loadingCourses ? (
          <Flex alignItems="center" gap="small">
            <Loader />
            <Text>Đang tải khoá học…</Text>
          </Flex>
        ) : courses.length === 0 ? (
          <Text>Chưa có khoá học nào.</Text>
        ) : (
          <Table highlightOnHover>
            <TableHead>
              <TableRow>
                <TableCell as="th">Tiêu đề</TableCell>
                <TableCell as="th">Mô tả</TableCell>
                <TableCell as="th">Instructor ID</TableCell>
                <TableCell as="th">Quản lý</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {courses.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{c.title}</TableCell>
                  <TableCell>{c.description}</TableCell>
                  <TableCell>{c.instructorID}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variation="link"
                      onClick={() => setDetailCourseId(c.id)}
                    >
                      Mở chi tiết
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </Flex>
  );

  const OverviewTab = () => (
    <Flex direction="column" gap="medium">
      <Card variation="outlined" padding="large" className="lms-card lms-section-card">
        <Heading level={5} marginBottom="medium">
          Sức khỏe hệ thống
        </Heading>
        <View className="lms-stats-grid">
          {heroHighlights.map((item) => (
            <View key={item.label} className="stat-card">
              <Text fontSize="small" color="font.tertiary">
                {item.label}
              </Text>
              <Heading level={2} margin="0">
                {item.value}
              </Heading>
            </View>
          ))}
        </View>
        <View className="lms-stats-grid" style={{ marginTop: '1.5rem' }}>
          {roleBreakdown.map((role) => (
            <View key={role.label} className="stat-card">
              <Text fontSize="small" color="font.tertiary">
                {role.label}
              </Text>
              <Heading level={4} margin="0">
                {role.value}
              </Heading>
            </View>
          ))}
        </View>
      </Card>
      <Card variation="outlined" padding="large">
        <Heading level={5} marginBottom="medium">
          Hành động nhanh
        </Heading>
        <Flex gap="medium" wrap="wrap">
          {quickActions.map((action) => (
            <Card
              key={action.label}
              variation="outlined"
              padding="medium"
              width="min(320px, 100%)"
              className="lms-card"
            >
              <Heading level={6} marginBottom="xxs">
                {action.label}
              </Heading>
              <Text color="font.tertiary">{action.description}</Text>
              <Button marginTop="small" size="small" onClick={action.action}>
                Thực hiện
              </Button>
            </Card>
          ))}
        </Flex>
      </Card>
    </Flex>
  );

  return (
    <View className="lms-dashboard-shell">
      <View className="lms-dashboard-inner">
        <Card variation="elevated" padding="large" className="lms-hero-card">
        <Flex
          justifyContent="space-between"
          gap="medium"
          wrap="wrap"
          className="lms-hero-header"
        >
          <View>
            <Heading level={3} color="var(--amplify-colors-font-primary)" marginBottom="xxs">
              Bảng điều khiển: Quản trị viên
            </Heading>
            <Text color="var(--amplify-colors-font-primary)" opacity={0.9}>
              Chào mừng trở lại, {user?.username || 'Admin'}.
            </Text>
          </View>
          <Flex gap="small" className="lms-hero-actions">
            <Button
              variation="link"
              onClick={() => {
                loadUsers();
                loadCourses();
              }}
              isLoading={isBusy}
            >
              Làm mới dữ liệu
            </Button>
            <Button variation="primary" onClick={() => setActiveTab('courses')}>
              Tạo khoá học
            </Button>
          </Flex>
        </Flex>
        <View className="lms-hero-metrics">
          {heroHighlights.map((item) => (
            <View key={item.label} className="metric">
              <Text fontSize="small" color="var(--amplify-colors-font-primary)" opacity={0.8}>
                {item.label}
              </Text>
              <Heading level={3} margin="0" color="var(--amplify-colors-font-primary)">
                {item.value}
              </Heading>
            </View>
          ))}
        </View>
      </Card>

      {isBusy && (
        <Flex marginTop="small" alignItems="center" gap="small">
          <Loader size="small" />
          <Text>Đang đồng bộ dữ liệu quản trị...</Text>
        </Flex>
      )}

      <Card
        variation="outlined"
        padding="medium"
        marginTop="medium"
        className="lms-card lms-section-card"
      >
        <Flex justifyContent="space-between" alignItems="center">
          <Heading level={5} margin="0">
            Điều hướng
          </Heading>
          <ToggleButtonGroup
            value={activeTab}
            onChange={setActiveTab}
            isExclusive
            size="small"
            className="lms-tab-toggle"
          >
            <ToggleButton value="overview">Tổng quan</ToggleButton>
            <ToggleButton value="users">Người dùng</ToggleButton>
            <ToggleButton value="courses">Khoá học</ToggleButton>
          </ToggleButtonGroup>
        </Flex>
      </Card>

      <View marginTop="medium">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'courses' && <CoursesTab />}
      </View>
    </View>
    {detailCourseId && (
      <CourseDetail
        courseId={detailCourseId}
        onClose={() => setDetailCourseId('')}
        role="Admin"
      />
    )}
  </View>
  );
}

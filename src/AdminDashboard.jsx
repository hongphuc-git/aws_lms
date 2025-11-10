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

const API_NAME = 'apie63ce51c';
const ROLES = ['Admin', 'Instructor', 'Student'];

// ----------------------- Helpers -------------------------
async function authHeaders() {
  const { tokens } = await fetchAuthSession();
  return { Authorization: tokens?.idToken?.toString() ?? '' };
}

const getUsername = (u) => u?.Username ?? u?.username ?? u?.UserName ?? '';
const getAttrs = (u) => (Array.isArray(u?.Attributes) ? u.Attributes : []);
const getEmailFromAttributes = (attrs = []) => {
  const a = attrs.find(x => x?.Name === 'email');
  return a?.Value || 'N/A';
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

// --------------------- Course Form ------------------------
function CourseForm({ onCreateCourse, creatingCourse, currentUser }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    // IMPORTANT: schema cần instructorID, không phải instructorUsername
    instructorID: currentUser?.id || '' // nếu bạn không có id ở prop user, để trống và nhập tay
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreateCourse(form, resetForm);
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      instructorID: currentUser?.id || ''
    });
  };

  return (
    <Card variation="outlined" padding="medium" marginBottom="medium">
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
            placeholder="Giảng viên (instructorID theo schema) *"
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

// --------------------- Main Component ---------------------
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

  // ---------------- Load Users -----------------
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const headers = await authHeaders();
      const op = get({ apiName: API_NAME, path: '/listUsers', options: { headers } });
      const { body } = await op.response;
      const raw = await body.json();
      const users = raw?.users ?? [];

      const enriched = await Promise.all(users.map(async (u) => {
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
          return { ...u, Username: uname, Groups: groups, currentRole: pickPrimaryRole(groups) };
        } catch {
          return { ...u, Username: uname, Groups: [], currentRole: 'Student' };
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

  // ---------------- Load Courses -----------------
  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const res = await client.graphql({ query: listCourses });
      setCourses(res?.data?.listCourses?.items ?? []);
    } catch (err) {
      console.error('listCourses error:', err);
    } finally {
      setLoadingCourses(false);
    }
  }, [client]);

  useEffect(() => {
    loadUsers();
    loadCourses();
  }, [loadUsers, loadCourses]);

  // ---------------- Create Course -----------------
  const onCreateCourse = async (formData, resetForm) => {
    const title = (formData?.title || '').trim();
    if (!title) return alert('Nhập tiêu đề khoá học');

    const instructorID = (formData?.instructorID || '').trim();
    if (!instructorID) return alert('Nhập instructorID (theo schema)');

    setCreatingCourse(true);
    try {
      const input = {
        title,
        description: (formData?.description || '').trim() || undefined,
        instructorID
      };
      await client.graphql({ query: createCourse, variables: { input } });
      await loadCourses();
      resetForm();
    } catch (err) {
      console.error('createCourse error:', err);
      alert('Không tạo được khoá học.');
    } finally {
      setCreatingCourse(false);
    }
  };

  // ---------------- Save Role -----------------
  const saveUserRole = async (u) => {
    const uname = u?.Username || getUsername(u);
    const newRole = roleDraft[uname] || u.currentRole;
    if (!uname) return alert('Thiếu username');
    if (newRole === u.currentRole) return;

    setBusyUserAction(true);
    try {
      const headers = await authHeaders();
      if (u.currentRole && u.currentRole !== 'Student' && u.currentRole !== newRole) {
        await post({ apiName: API_NAME, path: '/removeUserFromGroup', options: { headers, body: { username: uname, groupName: u.currentRole } } }).response;
      }
      await post({ apiName: API_NAME, path: '/addUserToGroup', options: { headers, body: { username: uname, groupName: newRole } } }).response;
      await loadUsers();
      alert(`Đã cập nhật ${uname} → ${newRole}`);
    } catch (err) {
      console.error('saveUserRole error:', err);
    } finally {
      setBusyUserAction(false);
    }
  };

  // ---------------- Totals -----------------
  const totals = useMemo(() => {
    let admin = 0, instructor = 0, student = 0;
    users.forEach(u => {
      const g = toGroupNames(u.Groups);
      if (g.includes('Admin')) admin++;
      else if (g.includes('Instructor')) instructor++;
      else student++;
    });
    return { users: users.length, courses: courses.length, Admin: admin, Instructor: instructor, Student: student };
  }, [users, courses]);

  // ---------------- UI -----------------
  const RoleSelector = ({ u }) => (
    <SelectField
      labelHidden
      defaultValue={u.currentRole}
      onChange={(e) => setRoleDraft(prev => ({ ...prev, [u.Username]: e.target.value }))}
    >
      {ROLES.map(r => <option key={r}>{r}</option>)}
    </SelectField>
  );

  const UsersTab = () => (
    <View>
      <Flex justifyContent="space-between" alignItems="center" marginBottom="medium">
        <Heading level={4}>Người dùng</Heading>
        {busyUserAction && <Loader />}
      </Flex>
      {loadingUsers ? (
        <Text>Đang tải người dùng…</Text>
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
                <TableCell>{getEmailFromAttributes(getAttrs(u))}</TableCell>
                <TableCell>{u.currentRole}</TableCell>
                <TableCell><RoleSelector u={u} /></TableCell>
                <TableCell>
                  <Button size="small" onClick={() => saveUserRole(u)}>Lưu</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </View>
  );

  const CoursesTab = () => (
    <View>
      <Heading level={4} marginBottom="small">Khoá học</Heading>
      <CourseForm
        onCreateCourse={onCreateCourse}
        creatingCourse={creatingCourse}
        currentUser={user}
      />
      {loadingCourses ? (
        <Text>Đang tải khoá học…</Text>
      ) : courses.length === 0 ? (
        <Text>Chưa có khoá học nào.</Text>
      ) : (
        <Table highlightOnHover>
          <TableHead>
            <TableRow>
              <TableCell as="th">Tiêu đề</TableCell>
              <TableCell as="th">Mô tả</TableCell>
              <TableCell as="th">Instructor ID</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {courses.map(c => (
              <TableRow key={c.id}>
                <TableCell>{c.title}</TableCell>
                <TableCell>{c.description}</TableCell>
                {/* Nếu listCourses có trả instructor { username }, bạn có thể dùng c.instructor?.username */}
                <TableCell>{c.instructorID}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </View>
  );

  const OverviewTab = () => (
    <Flex gap="medium" wrap="wrap">
      <Card variation="outlined" padding="large">
        <Heading level={5}>Tổng người dùng</Heading>
        <Heading level={2}>{totals.users}</Heading>
        <Text>
          Admin: {totals.Admin} • Instructor: {totals.Instructor} • Student: {totals.Student}
        </Text>
      </Card>
      <Card variation="outlined" padding="large">
        <Heading level={5}>Tổng khoá học</Heading>
        <Heading level={2}>{totals.courses}</Heading>
      </Card>
    </Flex>
  );

  return (
    <View padding="large">
      <Heading level={3}>Bảng điều khiển: Quản trị viên</Heading>
      <Text>Chào mừng, {user?.username}.</Text>

      <Flex marginTop="medium" marginBottom="small" justifyContent="flex-start">
        <ToggleButtonGroup
          value={activeTab}
          onChange={setActiveTab}
          isExclusive
          size="small"
        >
          <ToggleButton value="overview">Tổng quan</ToggleButton>
          <ToggleButton value="users">Người dùng</ToggleButton>
          <ToggleButton value="courses">Khoá học</ToggleButton>
        </ToggleButtonGroup>
      </Flex>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'courses' && <CoursesTab />}
    </View>
  );
}

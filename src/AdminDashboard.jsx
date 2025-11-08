// src/AdminDashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Heading, Text, Flex, Button, Badge, Loader,
  Table, TableHead, TableRow, TableCell, TableBody,
  Card, Input, SelectField, ToggleButtonGroup, ToggleButton
} from '@aws-amplify/ui-react';
import { generateClient } from '@aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';

// GraphQL
import { listCourses } from './graphql/queries';
import { createCourse /* , updateCourse, deleteCourse */ } from './graphql/mutations';

const client = generateClient();
const ROLES = ['Admin', 'Instructor', 'Student'];
// 🔧 Đổi apiName theo amplifyconfiguration của bạn:
const REST_API_NAME = 'apie63ce51c';

/* -------------------------- Helpers --------------------------- */
async function authHeaders() {
  const { tokens } = await fetchAuthSession();
  const idToken = tokens?.idToken?.toString() ?? '';
  return {
    Authorization: idToken,
    'Content-Type': 'application/json'
  };
}

// Chuẩn hoá mọi kiểu Groups về mảng tên nhóm dạng string
const toGroupNames = (groups) => {
  if (!groups) return [];
  if (Array.isArray(groups)) {
    if (typeof groups[0] === 'string') return groups;
    if (groups[0] && typeof groups[0] === 'object') {
      return groups
        .map(g => g?.GroupName || g?.groupName || g?.name)
        .filter(Boolean);
    }
  }
  if (typeof groups === 'string') return [groups];
  return [];
};

// Suy ra vai trò "chính" theo ưu tiên
const pickPrimaryRole = (groupNames) => {
  if (groupNames.includes('Admin')) return 'Admin';
  if (groupNames.includes('Instructor')) return 'Instructor';
  return 'Student';
};

function getEmail(attrs = []) {
  const a = attrs.find(x => x?.Name === 'email');
  return a?.Value || 'N/A';
}

/* ======================= Main Component ======================= */
export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'courses'

  // Users state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [roleDraft, setRoleDraft] = useState({}); // { username: 'Role' }
  const [busyUserAction, setBusyUserAction] = useState(false);
  const [lastUserError, setLastUserError] = useState('');

  // Courses state
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', instructorUsername: '' });
  const [creatingCourse, setCreatingCourse] = useState(false);

  /* ----------------------- Users: fetch ------------------------ */
  const loadUsers = async () => {
    setLoadingUsers(true);
    setLastUserError('');
    try {
      const headers = await authHeaders();

      // 1) Lấy danh sách user
      const res = await client.get({
        apiName: REST_API_NAME,
        path: '/listUsers',
        options: { headers }
      });

      const rawUsers = (res?.data?.users ?? res?.data ?? []);
      console.log('[AdminDashboard] listUsers raw:', res?.data);

      if (!Array.isArray(rawUsers)) {
        console.warn('[AdminDashboard] listUsers không trả mảng Users. Gán []');
      }

      // 2) Với mỗi user, gọi listGroupsForUser để lấy nhóm chính xác
      const withGroups = await Promise.all(
        (Array.isArray(rawUsers) ? rawUsers : []).map(async (u) => {
          try {
            const gr = await client.get({
              apiName: REST_API_NAME,
              path: '/listGroupsForUser',
              // v6 dùng "queryParams"
              options: {
                headers,
                queryParams: { username: u.Username }
              }
            });
            const groupNames = toGroupNames(gr?.data?.Groups ?? gr?.data ?? u.Groups);
            return {
              ...u,
              Attributes: Array.isArray(u.Attributes) ? u.Attributes : [],
              Groups: groupNames,
              currentRole: pickPrimaryRole(groupNames),
            };
          } catch (e) {
            console.warn('[AdminDashboard] listGroupsForUser lỗi cho', u?.Username, e);
            const groupNames = toGroupNames(u.Groups);
            return {
              ...u,
              Attributes: Array.isArray(u.Attributes) ? u.Attributes : [],
              Groups: groupNames,
              currentRole: pickPrimaryRole(groupNames),
            };
          }
        })
      );

      console.log('[AdminDashboard] users normalized:', withGroups);
      setUsers(withGroups);
    } catch (e) {
      console.error('listUsers error:', e);
      setLastUserError(e?.message || 'Lỗi lấy danh sách người dùng');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  /* ---------------------- Courses: fetch ----------------------- */
  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await client.graphql({ query: listCourses });
      const items = res?.data?.listCourses?.items ?? [];
      setCourses(items);
    } catch (e) {
      console.error('listCourses error:', e);
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    // tải cả 2 bảng ngay khi mở dashboard
    loadUsers();
    loadCourses();
  }, []);

  /* --------------------- Change user role ---------------------- */
  const saveUserRole = async (u) => {
    const newRole = roleDraft[u.Username] || u.currentRole || 'Student';
    if (newRole === u.currentRole) return;

    setBusyUserAction(true);
    try {
      const headers = await authHeaders();

      // remove old (nếu khác Student)
      if (u.currentRole && u.currentRole !== 'Student' && u.currentRole !== newRole) {
        await client.post({
          apiName: REST_API_NAME,
          path: '/removeUserFromGroup',
          options: { headers, body: { username: u.Username, groupName: u.currentRole } }
        });
      }

      // add new
      await client.post({
        apiName: REST_API_NAME,
        path: '/addUserToGroup',
        options: { headers, body: { username: u.Username, groupName: newRole } }
      });

      await loadUsers();
    } catch (e) {
      console.error('saveUserRole error:', e);
      alert('Không thể cập nhật vai trò. Xem CloudWatch logs của API.');
    } finally {
      setBusyUserAction(false);
    }
  };

  /* ---------------------- Create a course ---------------------- */
  const onCreateCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.title?.trim()) return alert('Nhập tiêu đề khoá học');

    setCreatingCourse(true);
    try {
      const input = {
        title: newCourse.title.trim(),
        description: newCourse.description?.trim() || '',
        instructorUsername: newCourse.instructorUsername?.trim() || user?.username || '',
      };
      await client.graphql({
        query: createCourse,
        variables: { input }
      });
      setNewCourse({ title: '', description: '', instructorUsername: '' });
      await loadCourses();
    } catch (e) {
      console.error('createCourse error:', e);
      alert('Không tạo được khoá học. Kiểm tra schema & quyền.');
    } finally {
      setCreatingCourse(false);
    }
  };

  /* ------------------------- Overview -------------------------- */
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
      Student: student,
    };
  }, [users, courses]);

  /* --------------------------- UI ------------------------------ */
  const RoleSelector = ({ u }) => {
    const currentRole = u.currentRole || 'Student';
    return (
      <SelectField
        labelHidden
        defaultValue={currentRole}
        onChange={(e) => setRoleDraft(prev => ({ ...prev, [u.Username]: e.target.value }))}
      >
        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
      </SelectField>
    );
  };

  const UsersTab = () => (
    <View>
      <Flex justifyContent="space-between" alignItems="center" marginBottom="medium">
        <Heading level={4}>Người dùng</Heading>
        <Flex alignItems="center" gap="small">
          {lastUserError && <Badge variation="error">{lastUserError}</Badge>}
          {busyUserAction && <Loader />}
          <Button size="small" onClick={loadUsers} variation="link">Tải lại</Button>
        </Flex>
      </Flex>

      {loadingUsers ? (
        <Text>Đang tải người dùng…</Text>
      ) : users.length === 0 ? (
        <Text>Không có người dùng nào (hoặc API trả rỗng). Mở Console để xem logs.</Text>
      ) : (
        <Table caption="Danh sách người dùng" highlightOnHover>
          <TableHead>
            <TableRow>
              <TableCell as="th">Username</TableCell>
              <TableCell as="th">Email</TableCell>
              <TableCell as="th">Trạng thái</TableCell>
              <TableCell as="th">Vai trò hiện tại</TableCell>
              <TableCell as="th">Chọn vai trò</TableCell>
              <TableCell as="th">Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.Username}>
                <TableCell>{u.Username}</TableCell>
                <TableCell>{getEmail(u.Attributes)}</TableCell>
                <TableCell>
                  <Badge variation={u.Enabled ? 'success' : 'warning'}>
                    {u.Enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variation={
                    u.currentRole === 'Admin' ? 'error' :
                    u.currentRole === 'Instructor' ? 'warning' : 'info'
                  }>
                    {u.currentRole}
                  </Badge>
                </TableCell>
                <TableCell><RoleSelector u={u} /></TableCell>
                <TableCell>
                  <Button
                    size="small"
                    onClick={() => saveUserRole(u)}
                    isDisabled={u.Username === user?.username || busyUserAction}
                  >
                    Lưu
                  </Button>
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

      {/* Form tạo khoá học */}
      <Card variation="outlined" padding="medium" marginBottom="medium">
        <Heading level={5}>Tạo khoá học mới</Heading>
        <form onSubmit={onCreateCourse}>
          <Flex direction="column" gap="small" marginTop="small">
            <Input
              placeholder="Tiêu đề *"
              value={newCourse.title}
              onChange={(e) => setNewCourse(c => ({ ...c, title: e.target.value }))}
              required
            />
            <Input
              placeholder="Mô tả"
              value={newCourse.description}
              onChange={(e) => setNewCourse(c => ({ ...c, description: e.target.value }))}
            />
            <Input
              placeholder="Giảng viên (username) – mặc định là bạn"
              value={newCourse.instructorUsername}
              onChange={(e) => setNewCourse(c => ({ ...c, instructorUsername: e.target.value }))}
            />
            <Flex gap="small">
              <Button type="submit" isLoading={creatingCourse}>Tạo khoá</Button>
              <Button
                type="button"
                variation="link"
                onClick={() => setNewCourse({ title: '', description: '', instructorUsername: '' })}
              >
                Xoá form
              </Button>
            </Flex>
          </Flex>
        </form>
      </Card>

      {/* Danh sách khoá học */}
      {loadingCourses ? (
        <Text>Đang tải khoá học…</Text>
      ) : courses.length === 0 ? (
        <Text>Chưa có khoá học nào.</Text>
      ) : (
        <Table caption="Danh sách khoá học" highlightOnHover>
          <TableHead>
            <TableRow>
              <TableCell as="th">Tiêu đề</TableCell>
              <TableCell as="th">Mô tả</TableCell>
              <TableCell as="th">Giảng viên</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {courses.map(c => (
              <TableRow key={c.id}>
                <TableCell>{c.title}</TableCell>
                <TableCell>{c.description}</TableCell>
                <TableCell>{c.instructorUsername || c?.instructor?.username || 'N/A'}</TableCell>
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

      {/* Tabs đơn giản bằng ToggleButtonGroup */}
      <Flex marginTop="medium" marginBottom="small" justifyContent="flex-start">
        <ToggleButtonGroup
          value={activeTab}
          onValueChange={setActiveTab}
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

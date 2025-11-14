import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Flex,
  Heading,
  Loader,
  Text,
  TextAreaField,
  TextField
} from '@aws-amplify/ui-react';
import { generateClient } from '@aws-amplify/api';
import {
  courseNotificationsByCourseQuery,
  createCourseNotificationMutation,
  deleteCourseNotificationMutation
} from '../graphql/communications';

const formatDateTime = (iso) => {
  if (!iso) return 'Just created';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso || '';
  return date.toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false
  });
};

const isSchemaMissingError = (error) => {
  const messages =
    error?.errors?.map((item) => item?.message?.toLowerCase?.() || '') ||
    error?.graphQLErrors?.map((item) => item?.message?.toLowerCase?.() || '') ||
    [];
  return messages.some(
    (msg) =>
      msg.includes('unknowntype') ||
      msg.includes('fieldundefined') ||
      msg.includes('modelcoursenotification')
  );
};

export default function CourseNotificationsPanel({
  courseId,
  user,
  canManageCourse = false,
  client: injectedClient = null
}) {
  const [client] = useState(() => injectedClient || generateClient());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [schemaUnsupported, setSchemaUnsupported] = useState(false);

  const [form, setForm] = useState({
    title: '',
    content: ''
  });

  const creatorId = useMemo(
    () =>
      user?.attributes?.sub ||
      user?.userId ||
      user?.username ||
      user?.attributes?.email ||
      '',
    [user]
  );
  const creatorName = useMemo(
    () =>
      user?.attributes?.preferred_username ||
      user?.username ||
      user?.attributes?.name ||
      user?.attributes?.email ||
      'System',
    [user]
  );

  const canPost = canManageCourse && Boolean(creatorId);

  const fetchNotifications = useCallback(async () => {
    if (!courseId || schemaUnsupported) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await client.graphql({
        query: courseNotificationsByCourseQuery,
        variables: {
          courseID: courseId,
          limit: 50
        },
        authMode: 'userPool'
      });
      const list =
        res.data?.courseNotificationsByCourseID?.items?.filter(Boolean) ?? [];
      setItems(
        [...list].sort(
          (a, b) =>
            new Date(b?.createdAt || 0).getTime() -
            new Date(a?.createdAt || 0).getTime()
        )
      );
    } catch (err) {
      console.error('load notifications error:', err);
      if (isSchemaMissingError(err)) {
        setSchemaUnsupported(true);
      } else {
        setError(err.message || 'Unable to load notifications.');
      }
    } finally {
      setLoading(false);
    }
  }, [client, courseId, schemaUnsupported]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!canPost || !form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    setError('');
    try {
      await client.graphql({
        query: createCourseNotificationMutation,
        variables: {
          input: {
            courseID: courseId,
            title: form.title.trim(),
            content: form.content.trim(),
            creatorID: creatorId,
            creatorName
          }
        },
        authMode: 'userPool'
      });
      setForm({ title: '', content: '' });
      await fetchNotifications();
    } catch (err) {
      console.error('create notification error:', err);
      if (isSchemaMissingError(err)) {
        setSchemaUnsupported(true);
      } else {
        setError(err.message || 'Unable to post notification.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (notificationId) => {
    if (!canPost || !notificationId) return;
    if (!window.confirm('Delete this notification?')) return;
    try {
      await client.graphql({
        query: deleteCourseNotificationMutation,
        variables: { input: { id: notificationId } },
        authMode: 'userPool'
      });
      await fetchNotifications();
    } catch (err) {
      console.error('delete notification error:', err);
      if (isSchemaMissingError(err)) {
        setSchemaUnsupported(true);
      } else {
        alert(err.message || 'Unable to delete notification.');
      }
    }
  };

  return (
    <Card variation="outlined" padding="large">
      <Flex direction="column" gap="medium">
        <Heading level={4}>Course notifications</Heading>
        <Text color="var(--amplify-colors-font-secondary)">
          Announcements keep everyone in the course up to date.{' '}
          {canPost
            ? 'Instructors/Admins can publish updates for each course.'
            : 'Students can review every notification posted for the class.'}
        </Text>
        {schemaUnsupported && (
          <Alert variation="warning">
            Notifications are not available until the backend schema is updated.
            Run `amplify push` (or pull the latest backend) to provision the
            CourseNotification model.
          </Alert>
        )}
        {!schemaUnsupported && error && <Alert variation="error">{error}</Alert>}

        {canPost && !schemaUnsupported && (
          <form onSubmit={handleCreate}>
            <Flex direction="column" gap="small">
              <TextField
                label="Title"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Example: Week 3 materials updated"
                isRequired
              />
              <TextAreaField
                label="Body"
                value={form.content}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, content: event.target.value }))
                }
                rows={4}
                placeholder="Add details, reminders, or helpful links"
                isRequired
              />
              <Button
                type="submit"
                variation="primary"
                isLoading={saving}
                isDisabled={!form.title.trim() || !form.content.trim()}
                alignSelf="flex-start"
              >
                Post notification
              </Button>
            </Flex>
          </form>
        )}

        {!schemaUnsupported && (
          <Flex direction="column" gap="small">
            {loading ? (
              <Flex alignItems="center" gap="small">
                <Loader />
                <Text>Loading notifications...</Text>
              </Flex>
            ) : items.length === 0 ? (
              <Text>No notifications yet.</Text>
            ) : (
              items.map((notification) => (
                <Card key={notification.id} variation="outlined">
                  <Flex justifyContent="space-between" wrap="wrap" gap="small">
                    <Heading level={5} marginBottom="0">
                      {notification.title}
                    </Heading>
                    <Badge variation="info">
                      {formatDateTime(notification.createdAt)}
                    </Badge>
                  </Flex>
                  <Text marginTop="small" whiteSpace="pre-wrap">
                    {notification.content}
                  </Text>
                  <Flex
                    justifyContent="space-between"
                    alignItems="center"
                    marginTop="small"
                    wrap="wrap"
                  >
                    <Text color="var(--amplify-colors-font-secondary)">
                      Posted by: {notification.creatorName || 'Unknown'}
                    </Text>
                    {canPost && (
                      <Button
                        size="small"
                        variation="link"
                        onClick={() => handleDelete(notification.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </Flex>
                </Card>
              ))
            )}
          </Flex>
        )}
      </Flex>
    </Card>
  );
}

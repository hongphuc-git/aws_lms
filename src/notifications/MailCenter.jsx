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
  TextField,
  ToggleButton,
  ToggleButtonGroup
} from '@aws-amplify/ui-react';
import { generateClient } from '@aws-amplify/api';
import {
  createMessageMutation,
  messagesByRecipientQuery,
  messagesBySenderQuery,
  updateMessageStatusMutation
} from '../graphql/communications';
import { listMessages } from '../graphql/queries';

const DATE_LOCALE = {
  dateStyle: 'medium',
  timeStyle: 'short',
  hour12: false
};

const formatStamp = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso || '';
  return date.toLocaleString('vi-VN', DATE_LOCALE);
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
      msg.includes('modelmessage')
  );
};

const isInvalidArgumentsError = (error) => {
  const errorTypes =
    error?.errors?.map((item) => item?.errorType?.toLowerCase?.() || '') ||
    error?.graphQLErrors?.map((item) => item?.errorType?.toLowerCase?.() || '') ||
    [];
  const messages =
    error?.errors?.map((item) => item?.message?.toLowerCase?.() || '') ||
    error?.graphQLErrors?.map((item) => item?.message?.toLowerCase?.() || '') ||
    [];
  return (
    errorTypes.some((type) => type.includes('invalidarguments')) ||
    messages.some((msg) => msg.includes('invalidarguments'))
  );
};

const deriveIdentity = (user) =>
  user?.attributes?.email ||
  user?.attributes?.sub ||
  user?.username ||
  user?.userId ||
  '';

const deriveDisplayName = (user) =>
  user?.attributes?.preferred_username ||
  user?.username ||
  user?.attributes?.name ||
  user?.attributes?.email ||
  'User';

export default function MailCenter({
  user,
  course,
  enrollments = [],
  client: injectedClient = null
}) {
  const [client] = useState(() => injectedClient || generateClient());
  const [activeTab, setActiveTab] = useState('inbox');
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingError, setSendingError] = useState('');
  const [schemaUnsupported, setSchemaUnsupported] = useState(false);
  const [sendFeedback, setSendFeedback] = useState({ type: '', message: '' });

  const [messageDraft, setMessageDraft] = useState({
    recipient: '',
    subject: '',
    body: ''
  });

  const viewerId = useMemo(() => deriveIdentity(user), [user]);
  const viewerName = useMemo(() => deriveDisplayName(user), [user]);

  const recipientSuggestions = useMemo(() => {
    const suggestions = new Set();
    if (course?.instructorID) {
      suggestions.add(course.instructorID);
    }
    enrollments.forEach((enrollment) => {
      if (enrollment?.studentID) {
        suggestions.add(enrollment.studentID);
      }
    });
    return Array.from(suggestions);
  }, [course?.instructorID, enrollments]);

  const fetchMessages = useCallback(async () => {
    if (!viewerId || schemaUnsupported) return;
    setLoading(true);

    const applyResults = (inboxItems = [], sentItems = []) => {
      setInbox(
        [...inboxItems].sort(
          (a, b) =>
            new Date(b?.createdAt || 0).getTime() -
            new Date(a?.createdAt || 0).getTime()
        )
      );
      setSent(
        [...sentItems].sort(
          (a, b) =>
            new Date(b?.createdAt || 0).getTime() -
            new Date(a?.createdAt || 0).getTime()
        )
      );
    };

    const runIndexQueries = async () => {
      const [inboxRes, sentRes] = await Promise.all([
        client.graphql({
          query: messagesByRecipientQuery,
          variables: {
            recipientID: viewerId,
            limit: 50
          },
          authMode: 'userPool'
        }),
        client.graphql({
          query: messagesBySenderQuery,
          variables: {
            senderID: viewerId,
            limit: 50
          },
          authMode: 'userPool'
        })
      ]);

      const inboxItems =
        inboxRes.data?.messagesByRecipientID?.items?.filter(Boolean) ?? [];
      const sentItems =
        sentRes.data?.messagesBySenderID?.items?.filter(Boolean) ?? [];

      applyResults(inboxItems, sentItems);
    };

    const runListFallback = async () => {
      const [inboxRes, sentRes] = await Promise.all([
        client.graphql({
          query: listMessages,
          variables: {
            filter: { recipientID: { eq: viewerId } },
            limit: 50
          },
          authMode: 'userPool'
        }),
        client.graphql({
          query: listMessages,
          variables: {
            filter: { senderID: { eq: viewerId } },
            limit: 50
          },
          authMode: 'userPool'
        })
      ]);
      const inboxItems = inboxRes.data?.listMessages?.items?.filter(Boolean) ?? [];
      const sentItems = sentRes.data?.listMessages?.items?.filter(Boolean) ?? [];
      applyResults(inboxItems, sentItems);
    };

    try {
      await runIndexQueries();
    } catch (err) {
      console.error('fetch messages error:', err);
      if (isSchemaMissingError(err)) {
        setSchemaUnsupported(true);
      } else if (isInvalidArgumentsError(err)) {
        try {
          await runListFallback();
        } catch (fallbackError) {
          console.error('fallback message query error:', fallbackError);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [client, viewerId, schemaUnsupported]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!viewerId || !messageDraft.recipient.trim() || !messageDraft.body.trim()) {
      return;
    }
    setSending(true);
    setSendingError('');
    setSendFeedback({ type: '', message: '' });
    try {
      await client.graphql({
        query: createMessageMutation,
        variables: {
          input: {
            senderID: viewerId,
            recipientID: messageDraft.recipient.trim(),
            subject: messageDraft.subject.trim() || '(No subject)',
            body: messageDraft.body.trim(),
            status: 'UNREAD',
            courseID: course?.id || null,
            senderName: viewerName,
            recipientName: messageDraft.recipient.trim()
          }
        },
        authMode: 'userPool'
      });
      setMessageDraft({ recipient: '', subject: '', body: '' });
      await fetchMessages();
      setSendFeedback({
        type: 'success',
        message: 'Tin nhắn đã được gửi.'
      });
    } catch (err) {
      console.error('send message error:', err);
      if (isSchemaMissingError(err)) {
        setSchemaUnsupported(true);
        setSendingError('');
        setSendFeedback({ type: 'warning', message: '' });
      } else {
        setSendingError(err.message || 'Unable to send message.');
        setSendFeedback({
          type: 'error',
          message: err.message || 'Gửi tin nhắn thất bại.'
        });
      }
    } finally {
      setSending(false);
    }
  };

  const markMessageAsRead = async (message) => {
    if (!message || message.status === 'READ') return;
    try {
      await client.graphql({
        query: updateMessageStatusMutation,
        variables: {
          input: {
            id: message.id,
            status: 'READ'
          }
        },
        authMode: 'userPool'
      });
      setInbox((prev) =>
        prev.map((item) =>
          item.id === message.id ? { ...item, status: 'READ' } : item
        )
      );
    } catch (err) {
      console.error('update message status error:', err);
      if (isSchemaMissingError(err)) {
        setSchemaUnsupported(true);
      }
    }
  };

  const renderMessageCard = (message, type) => (
    <Card key={`${type}-${message.id}`} variation="outlined">
      <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap="small">
        <Heading level={5} marginBottom="0">
          {message.subject}
        </Heading>
        <Flex gap="small" alignItems="center">
          {type === 'inbox' && (
            <Badge variation={message.status === 'READ' ? 'success' : 'warning'}>
              {message.status === 'READ' ? 'Read' : 'Unread'}
            </Badge>
          )}
          <Badge>{formatStamp(message.createdAt)}</Badge>
        </Flex>
      </Flex>
      <Text
        marginTop="small"
        whiteSpace="pre-wrap"
        color="var(--amplify-colors-font-primary)"
      >
        {message.body}
      </Text>
      <Flex justifyContent="space-between" alignItems="center" marginTop="small" wrap="wrap">
        <Text color="var(--amplify-colors-font-secondary)">
          {type === 'inbox'
            ? `From ${message.senderName || message.senderID}`
            : `To ${message.recipientName || message.recipientID}`}
          {message.courseID ? ` - Course ${message.courseID}` : ''}
        </Text>
        {type === 'inbox' && message.status !== 'READ' && (
          <Button
            size="small"
            variation="link"
            onClick={() => markMessageAsRead(message)}
          >
            Mark as read
          </Button>
        )}
      </Flex>
    </Card>
  );

  if (!viewerId) {
    return (
      <Card variation="outlined" padding="large">
        <Heading level={5}>Message center</Heading>
        <Text>Unable to determine the current user identity.</Text>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="medium">
      {schemaUnsupported ? (
        <Card variation="outlined">
          <Heading level={5} marginBottom="small">
            Messaging unavailable
          </Heading>
          <Text color="var(--amplify-colors-font-secondary)">
            The current backend schema does not contain the Message model. Run
            `amplify push` (or pull the latest backend environment) to enable internal
            mail between roles.
          </Text>
        </Card>
      ) : (
        <>
          <Card variation="outlined">
            <form onSubmit={handleSendMessage}>
              <Flex direction="column" gap="small">
                <Heading level={4} marginBottom="small">
                  Send internal mail
                </Heading>
                <TextField
                  label="Recipient (email or Cognito sub)"
                  value={messageDraft.recipient}
                  onChange={(event) =>
                    setMessageDraft((prev) => ({ ...prev, recipient: event.target.value }))
                  }
                  placeholder="Example: email@domain.com or Cognito sub"
                  isRequired
                />
                <TextField
                  label="Subject"
                  value={messageDraft.subject}
                  onChange={(event) =>
                    setMessageDraft((prev) => ({ ...prev, subject: event.target.value }))
                  }
                  placeholder="Enter a subject"
                />
                <TextAreaField
                  label="Body"
                  value={messageDraft.body}
                  onChange={(event) =>
                    setMessageDraft((prev) => ({ ...prev, body: event.target.value }))
                  }
                  rows={4}
                  placeholder="Write your message"
                  isRequired
                />
                {recipientSuggestions.length > 0 && (
                  <Text color="var(--amplify-colors-font-secondary)">
                    Quick recipients: {recipientSuggestions.join(', ')}
                  </Text>
                )}
                {sendFeedback.type && sendFeedback.message && (
                  <Alert variation={sendFeedback.type}>
                    {sendFeedback.message}
                  </Alert>
                )}
                {sendingError && (
                  <Text color="var(--amplify-colors-font-error)">{sendingError}</Text>
                )}
                <Button
                  type="submit"
                  variation="primary"
                  isLoading={sending}
                  isDisabled={!messageDraft.recipient.trim() || !messageDraft.body.trim()}
                  alignSelf="flex-start"
                >
                  Send message
                </Button>
              </Flex>
            </form>
          </Card>

          <Card variation="outlined">
            <Flex direction="column" gap="small">
              <Flex justifyContent="space-between" alignItems="center" wrap="wrap">
                <Heading level={4} marginBottom="0">
                  Inbox / Sent
                </Heading>
                <ToggleButtonGroup
                  value={activeTab}
                  onChange={(value) => setActiveTab(value)}
                  size="small"
                >
                  <ToggleButton value="inbox">Inbox</ToggleButton>
                  <ToggleButton value="sent">Sent</ToggleButton>
                </ToggleButtonGroup>
              </Flex>
              {loading ? (
                <Flex alignItems="center" gap="small">
                  <Loader />
                  <Text>Loading messages...</Text>
                </Flex>
              ) : activeTab === 'inbox' ? (
                inbox.length ? (
                  inbox.map((message) => renderMessageCard(message, 'inbox'))
                ) : (
                  <Text>No messages received yet.</Text>
                )
              ) : sent.length ? (
                sent.map((message) => renderMessageCard(message, 'sent'))
              ) : (
                <Text>No messages sent yet.</Text>
              )}
            </Flex>
          </Card>
        </>
      )}
    </Flex>
  );
}

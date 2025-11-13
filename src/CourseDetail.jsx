import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';
import {
  View,
  Flex,
  Heading,
  Text,
  Card,
  Button,
  Loader,
  Input,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Divider
} from '@aws-amplify/ui-react';
import { generateClient } from '@aws-amplify/api';
import { getUrl, uploadData } from '@aws-amplify/storage';
import './amplifyClient';
import awsconfig from './aws-exports';
import {
  getCourse,
  lecturesByCourseID,
  quizzesByCourseID,
  enrollmentsByCourseID,
  enrollmentsByStudentID,
  listSubmissions,
  questionsByQuizID
} from './graphql/queries';
import {
  createLecture,
  deleteLecture,
  createQuiz,
  deleteQuiz,
  updateQuiz,
  createQuestion,
  deleteEnrollment,
  createSubmission
} from './graphql/mutations';
import {
  enrollmentRequestsByCourseQuery,
  deleteEnrollmentRequestMutation
} from './graphql/enrollmentRequests';

const MATERIAL_ACCESS_LEVEL = 'guest';
const ACCESS_LEVEL_PREFIXES = {
  guest: 'public',
  protected: 'protected',
  private: 'private'
};

const resolveStorageKey = (key = '') => {
  if (key.startsWith('protected/')) {
    return { accessLevel: 'protected', normalizedKey: key.replace(/^protected\//, '') };
  }
  if (key.startsWith('private/')) {
    return { accessLevel: 'private', normalizedKey: key.replace(/^private\//, '') };
  }

  return {
    accessLevel: 'guest',
    normalizedKey: key.replace(/^public\//, '')
  };
};

const formatDateTimeLocalValue = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDeadlineDisplay = (isoString) => {
  if (!isoString) return 'Chưa đặt hạn';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Chưa đặt hạn';
  return date.toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false
  });
};

const describeSubmissionScore = (submission) => {
  if (!submission || typeof submission.score !== 'number') {
    return 'Chưa chấm';
  }
  const totalQuestions = Array.isArray(submission.answers)
    ? submission.answers.length
    : null;
  if (totalQuestions && totalQuestions > 0) {
    const percentage = Math.round((submission.score / totalQuestions) * 100);
    return `${submission.score}/${totalQuestions} (${percentage}%)`;
  }
  return `${submission.score}`;
};

const approveEnrollmentMutation = /* GraphQL */ `
  mutation ApproveEnrollment($input: CreateEnrollmentInput!, $condition: ModelEnrollmentConditionInput) {
    createEnrollment(input: $input, condition: $condition) {
      id
      studentID
      courseID
      createdAt
      updatedAt
    }
  }
`;

const studentQuestionsByQuizQuery = /* GraphQL */ `
  query StudentQuestionsByQuiz($quizID: ID!, $limit: Int) {
    questionsByQuizID(quizID: $quizID, limit: $limit) {
      items {
        id
        text
        options
        correctAnswerIndex
      }
    }
  }
`;

const studentGetCourseQuery = /* GraphQL */ `
  query StudentGetCourse($id: ID!) {
    getCourse(id: $id) {
      id
      title
      description
      instructorID
      createdAt
      updatedAt
    }
  }
`;

function QuestionDraftRow({ index, value, onChange, onRemove }) {
  const handleOptionChange = (optIndex, optValue) => {
    const next = value.options.map((opt, idx) =>
      idx === optIndex ? optValue : opt
    );
    onChange({ ...value, options: next });
  };

  return (
    <Card variation="outlined" padding="medium" marginTop="small">
      <Flex justifyContent="space-between" alignItems="center">
        <Heading level={6}>Câu hỏi {index + 1}</Heading>
        <Button size="small" variation="link" onClick={onRemove}>
          Xoá
        </Button>
      </Flex>
      <TextField
        label="Nội dung"
        value={value.text}
        onChange={(e) => onChange({ ...value, text: e.target.value })}
        marginTop="small"
      />
      <Flex gap="small" marginTop="small" wrap="wrap">
        {value.options.map((option, optIndex) => (
          <TextField
            key={`${index}-${optIndex}`}
            label={`Phương án ${optIndex + 1}`}
            value={option}
            onChange={(e) => handleOptionChange(optIndex, e.target.value)}
          />
        ))}
      </Flex>
      <TextField
        type="number"
        label="Đáp án đúng (0-3)"
        value={value.correctAnswerIndex}
        onChange={(e) =>
          onChange({ ...value, correctAnswerIndex: Number(e.target.value) || 0 })
        }
        marginTop="small"
      />
    </Card>
  );
}

function LayoutCard({ title, actions = [], children }) {
  return (
    <Card variation="outlined" padding="large" marginTop="medium">
      <Flex
        justifyContent="space-between"
        alignItems="center"
        marginBottom="medium"
        wrap="wrap"
      >
        <Heading level={4} marginBottom="0">
          {title}
        </Heading>
        <Flex gap="small">{actions}</Flex>
      </Flex>
      {children}
    </Card>
  );
}

export default function CourseDetail({
  courseId,
  onClose,
  role = 'Instructor',
  user = null
}) {
  const [client] = useState(() => generateClient());
  const [activeTab, setActiveTab] = useState('overview');

  const [course, setCourse] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [lectureLinks, setLectureLinks] = useState({});
  const [quizzes, setQuizzes] = useState([]);
  const [quizDeadlineDrafts, setQuizDeadlineDrafts] = useState({});
  const [enrollments, setEnrollments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [lectureForm, setLectureForm] = useState({
    title: '',
    file: null
  });
  const [uploadingLecture, setUploadingLecture] = useState(false);

  const [quizForm, setQuizForm] = useState({
    title: '',
    deadline: '',
    questions: [
      { text: '', options: ['', '', '', ''], correctAnswerIndex: 0 }
    ]
  });
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [managingRequestId, setManagingRequestId] = useState('');

  const isStudent = role === 'Student';
  const canManageCourse = !isStudent;

  const viewerStudentId = useMemo(() => {
    if (!isStudent) return '';
    return (
      user?.attributes?.sub ||
      user?.userId ||
      user?.username ||
      ''
    );
  }, [isStudent, user]);

  const viewerDisplayName = useMemo(() => {
    if (!isStudent) return '';
    return (
      user?.username ||
      user?.attributes?.preferred_username ||
      user?.attributes?.name ||
      user?.attributes?.email ||
      'Bạn'
    );
  }, [isStudent, user]);

  const [attendanceMarks, setAttendanceMarks] = useState({});
  const [quizQuestionMap, setQuizQuestionMap] = useState({});
  const [activeQuizId, setActiveQuizId] = useState('');
  const [quizAnswers, setQuizAnswers] = useState({});
  const [loadingQuizQuestions, setLoadingQuizQuestions] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [removingEnrollmentId, setRemovingEnrollmentId] = useState('');
  const [updatingQuizId, setUpdatingQuizId] = useState('');

  const tabs = useMemo(() => {
    const base = [
      { value: 'overview', label: 'Tổng quan' },
      { value: 'materials', label: 'Tài nguyên' },
      { value: 'quizzes', label: 'Quiz' }
    ];

    if (!isStudent) {
      base.push({ value: 'students', label: 'Học viên' });
    }

    base.push({ value: 'scores', label: 'Điểm số' });

    if (!isStudent) {
      base.push({ value: 'requests', label: 'Yêu cầu' });
    }

    return base;
  }, [isStudent]);

  const activeQuiz = useMemo(
    () => quizzes.find((quiz) => quiz.id === activeQuizId) || null,
    [quizzes, activeQuizId]
  );

  const activeQuizQuestions =
    (activeQuizId && quizQuestionMap[activeQuizId]) || [];

  const closeOverlay = useCallback(() => {
    setCourse(null);
    setLectures([]);
    setQuizzes([]);
    setQuizDeadlineDrafts({});
    setEnrollments([]);
    setSubmissions([]);
    setRequests([]);
    setActiveTab('overview');
    setLectureForm({ title: '', file: null });
    setQuizForm({
      title: '',
      deadline: '',
      questions: [{ text: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]
    });
    setAttendanceMarks({});
    setUpdatingQuizId('');
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!canManageCourse) {
      setQuizDeadlineDrafts({});
      return;
    }
    const nextDrafts = quizzes.reduce((acc, quiz) => {
      acc[quiz.id] = formatDateTimeLocalValue(quiz.deadline);
      return acc;
    }, {});
    setQuizDeadlineDrafts(nextDrafts);
  }, [quizzes, canManageCourse]);

  const fetchSubmissionsForQuizzes = useCallback(
    async (quizList) => {
      if (!quizList?.length) {
        setSubmissions([]);
        return;
      }
      try {
        const results = await Promise.all(
          quizList.map((quiz) =>
            client.graphql({
              query: listSubmissions,
              variables: {
                filter: {
                  quizID: { eq: quiz.id },
                  ...(isStudent && viewerStudentId
                    ? { studentID: { eq: viewerStudentId } }
                    : {})
                },
                limit: 200
              },
              authMode: 'userPool'
            })
          )
        );
        const allItems = results.flatMap(
          (res) => res.data?.listSubmissions?.items ?? []
        );
        setSubmissions(allItems.filter(Boolean));
      } catch (err) {
        console.error('load submissions error:', err);
      }
    },
    [client, isStudent, viewerStudentId]
  );

  const fetchQuestionsForQuiz = useCallback(
    async (quizId) => {
      if (!quizId) return [];
      if (quizQuestionMap[quizId]?.length) {
        return quizQuestionMap[quizId];
      }
      setLoadingQuizQuestions(true);
      try {
        const queryDocument = isStudent
          ? studentQuestionsByQuizQuery
          : questionsByQuizID;
        const res = await client.graphql({
          query: queryDocument,
          variables: { quizID: quizId, limit: 200 },
          authMode: 'userPool'
        });
        const items =
          res.data?.questionsByQuizID?.items?.filter(Boolean) ?? [];
        setQuizQuestionMap((prev) => ({
          ...prev,
          [quizId]: items
        }));
        return items;
      } catch (error) {
        console.error('load quiz questions error:', error);
        throw error;
      } finally {
        setLoadingQuizQuestions(false);
      }
    },
    [client, quizQuestionMap, isStudent]
  );

  const loadRequestsForCourse = useCallback(
    async (targetCourseId) => {
      if (!targetCourseId) {
        setRequests([]);
        return;
      }
      setLoadingRequests(true);
      try {
        const result = await client.graphql({
          query: enrollmentRequestsByCourseQuery,
          variables: {
            courseID: targetCourseId,
            status: { eq: 'PENDING' }
          },
          authMode: 'userPool'
        });
        const items =
          result.data?.enrollmentRequestsByCourseID?.items?.filter(Boolean) ??
          [];
        setRequests(items);
      } catch (error) {
        console.error('load enrollment requests error:', error);
      } finally {
        setLoadingRequests(false);
      }
    },
    [client]
  );

  const loadCourseData = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError('');
    try {
      const courseDocument = canManageCourse ? getCourse : studentGetCourseQuery;
      const [courseRes, lectureRes, quizRes] = await Promise.all([
        client.graphql({
          query: courseDocument,
          variables: { id: courseId },
          authMode: 'userPool'
        }),
        client.graphql({
          query: lecturesByCourseID,
          variables: { courseID: courseId, limit: 100 },
          authMode: 'userPool'
        }),
        client.graphql({
          query: quizzesByCourseID,
          variables: { courseID: courseId, limit: 100 },
          authMode: 'userPool'
        })
      ]);

      let enrollmentItems = [];
      if (canManageCourse) {
        const enrollmentRes = await client.graphql({
          query: enrollmentsByCourseID,
          variables: { courseID: courseId, limit: 200 },
          authMode: 'userPool'
        });
        enrollmentItems =
          enrollmentRes.data?.enrollmentsByCourseID?.items?.filter(Boolean) ?? [];
      }

      const courseData = courseRes.data?.getCourse ?? null;
      const lectureItems =
        lectureRes.data?.lecturesByCourseID?.items?.filter(Boolean) ?? [];
      const quizItems =
        quizRes.data?.quizzesByCourseID?.items?.filter(Boolean) ?? [];

      if (canManageCourse && enrollmentItems.length > 0) {
        const seenStudentIds = new Set();
        enrollmentItems = enrollmentItems.filter((item) => {
          const studentKey = item?.studentID;
          if (!studentKey) return true;
          if (seenStudentIds.has(studentKey)) {
            return false;
          }
          seenStudentIds.add(studentKey);
          return true;
        });
      }

      setCourse(courseData);
      setLectures(lectureItems);
      setQuizzes(quizItems);
      setEnrollments(enrollmentItems);
      await fetchSubmissionsForQuizzes(quizItems);
      if (canManageCourse) {
        await loadRequestsForCourse(courseId);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error('load course detail error:', err);
      setError(err.message || 'Không thể tải thông tin khoá học.');
    } finally {
      setLoading(false);
    }
  }, [client, courseId, fetchSubmissionsForQuizzes, loadRequestsForCourse, canManageCourse]);

  useEffect(() => {
    if (courseId) {
      loadCourseData();
    }
  }, [courseId, loadCourseData]);

  useEffect(() => {
    let cancelled = false;

    const populateLectureLinks = async () => {
      if (!lectures || lectures.length === 0) {
        if (!cancelled) setLectureLinks({});
        return;
      }

      try {
        const entries = await Promise.all(
          lectures.map(async (lecture) => {
            const key = lecture?.file?.key;
            if (!key) return [lecture?.id, null];
            const { accessLevel, normalizedKey } = resolveStorageKey(key);
            try {
              const { url } = await getUrl({
                key: normalizedKey,
                options: {
                  accessLevel,
                  expiresIn: 3600
                }
              });
              return [lecture.id, url?.toString() || null];
            } catch (err) {
              console.error('generate lecture url error:', err);
              return [lecture.id, null];
            }
          })
        );

        if (!cancelled) {
          setLectureLinks(
            entries.reduce((acc, [id, link]) => {
              if (id) acc[id] = link;
              return acc;
            }, {})
          );
        }
      } catch (error) {
        console.error('populate lecture links error:', error);
        if (!cancelled) setLectureLinks({});
      }
    };

    populateLectureLinks();

    return () => {
      cancelled = true;
    };
  }, [lectures]);

  const handleLectureUpload = async (event) => {
    event.preventDefault();
    if (isStudent) {
      alert('Bạn không có quyền tải tài liệu.');
      return;
    }
    if (!lectureForm.file || !courseId) return;
    setUploadingLecture(true);
    try {
      const key = `courses/${courseId}/${Date.now()}-${lectureForm.file.name}`;
      const uploadResult = await uploadData({
        key,
        data: lectureForm.file,
        options: {
          contentType: lectureForm.file.type,
          accessLevel: MATERIAL_ACCESS_LEVEL
        }
      }).result;

      const levelPrefix = ACCESS_LEVEL_PREFIXES[MATERIAL_ACCESS_LEVEL] || MATERIAL_ACCESS_LEVEL;
      const storedKey = uploadResult?.key ?? key;
      const normalizedGraphqlKey = storedKey.startsWith(`${levelPrefix}/`)
        ? storedKey
        : `${levelPrefix}/${storedKey}`;

      const fileInput = {
        bucket: awsconfig.aws_user_files_s3_bucket,
        region: awsconfig.aws_project_region,
        key: normalizedGraphqlKey
      };

      await client.graphql({
        query: createLecture,
        variables: {
          input: {
            title: lectureForm.title || lectureForm.file.name,
            courseID: courseId,
            file: fileInput
          }
        },
        authMode: 'userPool'
      });

      setLectureForm({ title: '', file: null });
      await loadCourseData();
    } catch (err) {
      console.error('upload lecture error:', err);
      alert(err.message || 'Không thể tải tài liệu.');
    } finally {
      setUploadingLecture(false);
    }
  };

  const handleLectureDelete = async (lectureId) => {
    if (isStudent) {
      alert('Bạn không có quyền xoá tài liệu.');
      return;
    }
    if (!window.confirm('Xoá tài liệu này?')) return;
    try {
      await client.graphql({
        query: deleteLecture,
        variables: { input: { id: lectureId } },
        authMode: 'userPool'
      });
      setLectures((prev) => prev.filter((item) => item.id !== lectureId));
    } catch (err) {
      console.error('delete lecture error:', err);
      alert(err.message || 'Không xoá được tài liệu.');
    }
  };

  const handleAddQuestion = () => {
    setQuizForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        { text: '', options: ['', '', '', ''], correctAnswerIndex: 0 }
      ]
    }));
  };

  const handleQuestionChange = (index, value) => {
    setQuizForm((prev) => {
      const next = prev.questions.map((item, idx) =>
        idx === index ? value : item
      );
      return { ...prev, questions: next };
    });
  };

  const handleQuestionRemove = (index) => {
    setQuizForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, idx) => idx !== index)
    }));
  };

  const handleDeadlineInputChange = (quizId, value) => {
    setQuizDeadlineDrafts((prev) => ({
      ...prev,
      [quizId]: value
    }));
  };

  const handleUpdateQuizDeadline = async (quizId, overrideValue) => {
    if (!canManageCourse) return;
    const rawValue =
      typeof overrideValue === 'string'
        ? overrideValue
        : quizDeadlineDrafts[quizId] || '';
    let normalizedDeadline = null;
    if (rawValue) {
      const parsed = new Date(rawValue);
      if (Number.isNaN(parsed.getTime())) {
        alert('Hạn nộp không hợp lệ.');
        return;
      }
      normalizedDeadline = parsed.toISOString();
    }
    setUpdatingQuizId(quizId);
    try {
      await client.graphql({
        query: updateQuiz,
        variables: {
          input: {
            id: quizId,
            deadline: normalizedDeadline
          }
        },
        authMode: 'userPool'
      });
      await loadCourseData();
    } catch (error) {
      console.error('update quiz deadline error:', error);
      alert(error.message || 'Không thể cập nhật hạn nộp quiz.');
    } finally {
      setUpdatingQuizId('');
    }
  };

  const handleCreateQuiz = async (event) => {
    event.preventDefault();
    if (isStudent) {
      alert('Bạn không có quyền tạo quiz.');
      return;
    }
  if (!quizForm.title.trim()) {
    alert('Vui lòng nhập tên quiz.');
    return;
  }
  let normalizedDeadline = null;
  if (quizForm.deadline?.trim()) {
    const parsedDeadline = new Date(quizForm.deadline);
    if (Number.isNaN(parsedDeadline.getTime())) {
      alert('Hạn nộp quiz không hợp lệ.');
      return;
    }
    normalizedDeadline = parsedDeadline.toISOString();
  }
  setSavingQuiz(true);
    try {
      const quizInput = {
        title: quizForm.title.trim(),
        courseID: courseId
      };
      if (normalizedDeadline) {
        quizInput.deadline = normalizedDeadline;
      }
      const createQuizResult = await client.graphql({
        query: createQuiz,
        variables: {
          input: quizInput
        },
        authMode: 'userPool'
      });
      const quizId = createQuizResult.data?.createQuiz?.id;
      if (quizId) {
        for (const question of quizForm.questions) {
          if (!question.text.trim()) continue;
          await client.graphql({
            query: createQuestion,
            variables: {
              input: {
                quizID: quizId,
                text: question.text,
                options: question.options.filter((opt) => opt?.trim()),
                correctAnswerIndex: question.correctAnswerIndex ?? 0
              }
            },
            authMode: 'userPool'
          });
        }
      }
      setQuizForm({
        title: '',
        deadline: '',
        questions: [
          { text: '', options: ['', '', '', ''], correctAnswerIndex: 0 }
        ]
      });
      await loadCourseData();
    } catch (err) {
      console.error('create quiz error:', err);
      alert(err.message || 'Không thể tạo quiz.');
    } finally {
      setSavingQuiz(false);
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (isStudent) {
      alert('Bạn không có quyền xoá quiz.');
      return;
    }
    if (!window.confirm('Xoá quiz này?')) return;
    try {
      await client.graphql({
        query: deleteQuiz,
        variables: { input: { id: quizId } },
        authMode: 'userPool'
      });
      setQuizzes((prev) => prev.filter((quiz) => quiz.id !== quizId));
    } catch (err) {
      console.error('delete quiz error:', err);
      alert(err.message || 'Không thể xoá quiz.');
    }
  };

  const handleStartQuiz = async (quizId) => {
    if (!viewerStudentId) {
      alert('Không tìm thấy thông tin học viên để làm quiz.');
      return;
    }
    const quizMeta = quizzes.find((item) => item.id === quizId);
    if (quizMeta?.deadline) {
      const deadlineDate = new Date(quizMeta.deadline);
      if (!Number.isNaN(deadlineDate.getTime()) && deadlineDate < new Date()) {
        alert('Quiz này đã hết hạn. Liên hệ giảng viên để được gia hạn.');
        return;
      }
    }
    try {
      const questions = await fetchQuestionsForQuiz(quizId);
      if (!questions.length) {
        alert('Quiz này chưa có câu hỏi.');
        return;
      }
      setQuizAnswers({});
      setActiveQuizId(quizId);
    } catch (error) {
      alert(error.message || 'Không thể tải câu hỏi quiz.');
    }
  };

  const handleSelectAnswer = (questionId, optionIndex) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleCancelQuizAttempt = () => {
    setActiveQuizId('');
    setQuizAnswers({});
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuizId) return;
    if (!viewerStudentId) {
      alert('Không tìm thấy thông tin học viên.');
      return;
    }
    const questions = quizQuestionMap[activeQuizId] || [];
    if (!questions.length) {
      alert('Quiz không có câu hỏi.');
      return;
    }
    const answersArray = questions.map((question) => {
      const choice = quizAnswers[question.id];
      return typeof choice === 'number' ? choice : -1;
    });
    const unanswered = answersArray.filter((value) => value < 0).length;
    if (unanswered > 0) {
      const confirmContinue = window.confirm(
        'Bạn vẫn còn câu hỏi chưa trả lời. Bạn có chắc chắn muốn nộp bài?'
      );
      if (!confirmContinue) return;
    }
    const correctCount = questions.reduce((count, question, index) => {
      const correctIndex =
        typeof question?.correctAnswerIndex === 'number'
          ? question.correctAnswerIndex
          : -1;
      return count + (answersArray[index] === correctIndex ? 1 : 0);
    }, 0);

    setSubmittingQuiz(true);
    try {
      await client.graphql({
        query: createSubmission,
        variables: {
          input: {
            studentID: viewerStudentId,
            quizID: activeQuizId,
            score: correctCount,
            answers: answersArray
          }
        },
        authMode: 'userPool'
      });
      alert('Đã nộp bài. Giảng viên sẽ chấm điểm và cập nhật sau.');
      setActiveQuizId('');
      setQuizAnswers({});
      await fetchSubmissionsForQuizzes(quizzes);
    } catch (error) {
      console.error('submit quiz error:', error);
      alert(error.message || 'Không thể nộp bài.');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleRemoveEnrollment = async (enrollment) => {
    if (!canManageCourse) return;
    if (!window.confirm('Xoá học viên này khỏi khoá học?')) return;
    setRemovingEnrollmentId(enrollment.id);
    try {
      await client.graphql({
        query: deleteEnrollment,
        variables: { input: { id: enrollment.id } },
        authMode: 'userPool'
      });
      setEnrollments((prev) => prev.filter((item) => item.id !== enrollment.id));
    } catch (error) {
      console.error('remove enrollment error:', error);
      alert(error.message || 'Không thể xoá học viên.');
    } finally {
      setRemovingEnrollmentId('');
    }
  };

  const handleApproveRequest = async (request) => {
    if (isStudent) {
      alert('Bạn không có quyền phê duyệt.');
      return;
    }
    setManagingRequestId(request.id);
    try {
      const existingEnrollmentRes = await client.graphql({
        query: enrollmentsByCourseID,
        variables: {
          courseID: courseId,
          limit: 200
        },
        authMode: 'userPool'
      });
      const existingEnrollment =
        existingEnrollmentRes.data?.enrollmentsByCourseID?.items?.find(
          (item) => item?.studentID === request.studentID
        ) ?? null;

      let alreadyEnrolled = Boolean(existingEnrollment);

      if (!alreadyEnrolled) {
        let nextToken = null;
        do {
          const enrollmentLookup = await client.graphql({
            query: enrollmentsByStudentID,
            variables: {
              studentID: request.studentID,
              nextToken,
              limit: 200
            },
            authMode: 'userPool'
          });
          const payload = enrollmentLookup.data?.enrollmentsByStudentID;
          const items = payload?.items?.filter(Boolean) ?? [];
          if (items.some((item) => item.courseID === courseId)) {
            alreadyEnrolled = true;
            break;
          }
          nextToken = payload?.nextToken ?? null;
        } while (nextToken);
      }

      if (alreadyEnrolled) {
        await client.graphql({
          query: deleteEnrollmentRequestMutation,
          variables: { input: { id: request.id } },
          authMode: 'userPool'
        });
        await loadCourseData();
        alert('Học viên này đã được ghi danh trước đó.');
        return;
      }

      await client.graphql({
        query: approveEnrollmentMutation,
        variables: {
          input: {
            studentID: request.studentID,
            courseID: courseId
          }
        },
        authMode: 'userPool'
      });
      await client.graphql({
        query: deleteEnrollmentRequestMutation,
        variables: { input: { id: request.id } },
        authMode: 'userPool'
      });
      await loadCourseData();
    } catch (error) {
      console.error('approve enrollment request error:', error);
      alert(error.message || 'Không thể phê duyệt yêu cầu.');
    } finally {
      setManagingRequestId('');
    }
  };

  const handleRejectRequest = async (request) => {
    if (isStudent) {
      alert('Bạn không có quyền từ chối.');
      return;
    }
    if (!window.confirm('Từ chối yêu cầu này?')) return;
    setManagingRequestId(request.id);
    try {
      await client.graphql({
        query: deleteEnrollmentRequestMutation,
        variables: { input: { id: request.id } },
        authMode: 'userPool'
      });
      await loadRequestsForCourse(courseId);
    } catch (error) {
      console.error('reject enrollment request error:', error);
      alert(error.message || 'Không thể từ chối yêu cầu.');
    } finally {
      setManagingRequestId('');
    }
  };

  const roster = useMemo(() => enrollments || [], [enrollments]);
  const totalStudents = roster.length;

  const attendancePercentage = useMemo(() => {
    const present = Object.values(attendanceMarks).filter(Boolean).length;
    return totalStudents === 0 ? 0 : Math.round((present / totalStudents) * 100);
  }, [attendanceMarks, totalStudents]);

  const filteredSubmissions = useMemo(() => {
    if (isStudent && viewerStudentId) {
      return submissions.filter((item) => item.studentID === viewerStudentId);
    }
    return submissions;
  }, [isStudent, submissions, viewerStudentId]);

  const submissionByQuizId = useMemo(() => {
    return filteredSubmissions.reduce((acc, item) => {
      if (item.quizID) acc[item.quizID] = item;
      return acc;
    }, {});
  }, [filteredSubmissions]);

  const quizScoreboard = useMemo(() => {
    if (!filteredSubmissions.length) return [];
    return filteredSubmissions.map((item) => {
      const quiz = quizzes.find((q) => q.id === item.quizID);
      const enrollment = enrollments.find(
        (en) => en.studentID === item.studentID
      );
      const studentLabel =
        enrollment?.student?.username ||
        (isStudent && item.studentID === viewerStudentId
          ? viewerDisplayName
          : null) ||
        `ID ${item.studentID}`;
      return {
        id: item.id,
        student: studentLabel,
        quizTitle: quiz?.title || 'Quiz',
        score: item.score,
        totalQuestions: Array.isArray(item.answers) ? item.answers.length : null,
        scoreText: describeSubmissionScore(item),
        submittedAt: item.createdAt || ''
      };
    });
  }, [
    filteredSubmissions,
    quizzes,
    enrollments,
    isStudent,
    viewerStudentId,
    viewerDisplayName
  ]);

  if (!courseId) return null;

  return (
    <View
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        zIndex: 1000,
        padding: '40px 24px',
        overflow: 'auto'
      }}
    >
      <Card
        variation="elevated"
        padding="large"
        width="min(1200px, 100%)"
        margin="0 auto"
      >
        <Flex justifyContent="space-between" alignItems="center" wrap="wrap">
          <View>
            <Heading level={3} marginBottom="xxs">
              {course?.title || 'Chi tiết khoá học'}
            </Heading>
            <Text color="font.tertiary">
              {course?.description || 'Chưa có mô tả.'}
            </Text>
          </View>
          <Flex gap="small" marginTop={{ base: 'small', large: '0' }}>
            <Button onClick={loadCourseData} isLoading={loading}>
              Làm mới
            </Button>
            <Button variation="destructive" onClick={closeOverlay}>
              Đóng
            </Button>
          </Flex>
        </Flex>

        {error && (
          <Text color="red" marginTop="small">
            {error}
          </Text>
        )}

        <ToggleButtonGroup
          marginTop="medium"
          value={activeTab}
          onChange={setActiveTab}
          isExclusive
        >
          {tabs.map((tab) => (
            <ToggleButton key={tab.value} value={tab.value}>
              {tab.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {loading ? (
          <Flex alignItems="center" gap="small" marginTop="large">
            <Loader />
            <Text>Đang tải dữ liệu chi tiết...</Text>
          </Flex>
        ) : (
          <>
            {activeTab === 'overview' && (
              <View marginTop="medium">
                <Flex gap="medium" wrap="wrap">
                  <Card variation="outlined" padding="medium" width="220px">
                    <Text fontSize="small" color="font.tertiary">
                      Tài liệu
                    </Text>
                    <Heading level={3}>{lectures.length}</Heading>
                  </Card>
                  <Card variation="outlined" padding="medium" width="220px">
                    <Text fontSize="small" color="font.tertiary">
                      Quiz
                    </Text>
                    <Heading level={3}>{quizzes.length}</Heading>
                  </Card>
                  <Card variation="outlined" padding="medium" width="220px">
                    <Text fontSize="small" color="font.tertiary">
                      Học viên
                    </Text>
                    <Heading level={3}>{totalStudents}</Heading>
                  </Card>
                  <Card variation="outlined" padding="medium" width="220px">
                    <Text fontSize="small" color="font.tertiary">
                      Điểm danh (tạm thời)
                    </Text>
                    <Heading level={3}>{attendancePercentage}%</Heading>
                  </Card>
                  {role !== 'Student' && (
                    <Card variation="outlined" padding="medium" width="220px">
                      <Text fontSize="small" color="font.tertiary">
                        Yêu cầu chờ duyệt
                      </Text>
                      <Heading level={3}>{requests.length}</Heading>
                    </Card>
                  )}
                </Flex>
                <Divider marginTop="large" />
                <Text marginTop="medium" color="font.tertiary">
                  Các tab bên cạnh hỗ trợ quản lý nội dung, quiz, học viên và điểm
                  số. Chỉ giảng viên hoặc quản trị viên mới thao tác được.
                </Text>
              </View>
            )}

            {activeTab === 'materials' && (
              <View>
                {canManageCourse && (
                  <LayoutCard
                    title="Tải tài liệu"
                    actions={null}
                  >
                    <form onSubmit={handleLectureUpload}>
                      <Flex gap="small" direction="column">
                        <TextField
                          label="Tiêu đề"
                          placeholder="Nhập tiêu đề tài liệu"
                          value={lectureForm.title}
                          onChange={(e) =>
                            setLectureForm((prev) => ({
                              ...prev,
                              title: e.target.value
                            }))
                          }
                        />
                        <Input
                          type="file"
                          accept="*/*"
                          onChange={(e) =>
                            setLectureForm((prev) => ({
                              ...prev,
                              file: e.target.files?.[0] || null
                            }))
                          }
                        />
                        <Button
                          type="submit"
                          isLoading={uploadingLecture}
                          disabled={!lectureForm.file}
                        >
                          Tải lên
                        </Button>
                      </Flex>
                    </form>
                  </LayoutCard>
                )}

                <LayoutCard
                  title="Danh sách tài liệu"
                  actions={[]}
                >
                  {lectures.length === 0 ? (
                    <Text>Chưa có tài liệu nào.</Text>
                  ) : (
                    <Table highlightOnHover>
                      <TableHead>
                        <TableRow>
                          <TableCell as="th">Tiêu đề</TableCell>
                          <TableCell as="th">Đường dẫn</TableCell>
                          {canManageCourse && <TableCell as="th">Hành động</TableCell>}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lectures.map((lecture) => (
                          <TableRow key={lecture.id}>
                            <TableCell>{lecture.title}</TableCell>
                            <TableCell>
                              {lecture.file?.key ? (
                                lectureLinks[lecture.id] ? (
                                  <a
                                    href={lectureLinks[lecture.id]}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Xem / tải xuống
                                  </a>
                                ) : (
                                  <Text color="font.tertiary">Đang tạo liên kết...</Text>
                                )
                              ) : (
                                <Text color="font.tertiary">Không có file</Text>
                              )}
                            </TableCell>
                            {canManageCourse && (
                              <TableCell>
                                <Button
                                  size="small"
                                  variation="link"
                                  onClick={() => handleLectureDelete(lecture.id)}
                                >
                                  Xoá
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </LayoutCard>
              </View>
            )}

            {activeTab === 'quizzes' && (
              <View>
                {canManageCourse && (
                  <LayoutCard title="Tạo quiz mới">
                    <form onSubmit={handleCreateQuiz}>
                      <Flex direction="column" gap="medium">
                        <TextField
                          label="Tên quiz"
                          placeholder="Ví dụ: Kiểm tra giữa kỳ"
                          value={quizForm.title}
                          onChange={(e) =>
                            setQuizForm((prev) => ({
                              ...prev,
                              title: e.target.value
                            }))
                          }
                        />
                        <TextField
                          label="Hạn nộp (tùy chọn)"
                          type="datetime-local"
                          value={quizForm.deadline}
                          onChange={(e) =>
                            setQuizForm((prev) => ({
                              ...prev,
                              deadline: e.target.value
                            }))
                          }
                        />
                        {quizForm.questions.map((question, idx) => (
                          <QuestionDraftRow
                            key={idx}
                            index={idx}
                            value={question}
                            onChange={(val) => handleQuestionChange(idx, val)}
                            onRemove={() => handleQuestionRemove(idx)}
                          />
                        ))}
                        <Flex gap="small">
                          <Button type="button" onClick={handleAddQuestion}>
                            Thêm câu hỏi
                          </Button>
                          <Button
                            type="submit"
                            variation="primary"
                            isLoading={savingQuiz}
                          >
                            Lưu quiz
                          </Button>
                        </Flex>
                      </Flex>
                    </form>
                  </LayoutCard>
                )}

                <LayoutCard title="Quiz hiện có">
                  {quizzes.length === 0 ? (
                    <Text>Chưa có quiz nào.</Text>
                  ) : (
                    <Table highlightOnHover>
                      <TableHead>
                        <TableRow>
                          <TableCell as="th">Tên quiz</TableCell>
                          <TableCell as="th">Số câu hỏi</TableCell>
                          {canManageCourse && <TableCell as="th">Hạn nộp</TableCell>}
                          <TableCell as="th">
                            {canManageCourse ? 'Hành động' : 'Trạng thái'}
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {quizzes.map((quiz) => {
                          const questionCount =
                            quizQuestionMap[quiz.id]?.length ??
                            quiz.questions?.items?.length ??
                            quiz.questions?.length ??
                            '...';
                          const submission = submissionByQuizId[quiz.id];
                          const deadlineValue = quiz.deadline || '';
                          const deadlineDate = deadlineValue ? new Date(deadlineValue) : null;
                          const isDeadlineValid =
                            deadlineDate && !Number.isNaN(deadlineDate.getTime());
                          const isQuizExpired = Boolean(
                            isDeadlineValid && deadlineDate < new Date()
                          );
                          const deadlineLabel = quiz.deadline
                            ? formatDeadlineDisplay(quiz.deadline)
                            : 'Không giới hạn thời gian';

                          return (
                            <TableRow key={quiz.id}>
                              <TableCell>{quiz.title}</TableCell>
                              <TableCell>{questionCount}</TableCell>
                              {canManageCourse && (
                                <TableCell>
                                  <Flex direction="column" gap="xxs">
                                    <TextField
                                      type="datetime-local"
                                      size="small"
                                      value={quizDeadlineDrafts[quiz.id] || ''}
                                      onChange={(e) =>
                                        handleDeadlineInputChange(quiz.id, e.target.value)
                                      }
                                    />
                                    <Flex gap="xxs" wrap="wrap">
                                      <Button
                                        size="small"
                                        onClick={() => handleUpdateQuizDeadline(quiz.id)}
                                        isLoading={updatingQuizId === quiz.id}
                                      >
                                        {quiz.deadline ? 'Gia hạn' : 'Đặt hạn'}
                                      </Button>
                                      {quiz.deadline && (
                                        <Button
                                          size="small"
                                          variation="link"
                                          onClick={() => handleUpdateQuizDeadline(quiz.id, '')}
                                          isLoading={updatingQuizId === quiz.id}
                                        >
                                          Xóa hạn
                                        </Button>
                                      )}
                                    </Flex>
                                    <Text fontSize="small" color="font.tertiary">
                                      {quiz.deadline
                                        ? `Hiện tại: ${deadlineLabel}`
                                        : 'Chưa đặt hạn'}
                                    </Text>
                                  </Flex>
                                </TableCell>
                              )}
                              <TableCell>
                                {canManageCourse ? (
                                  <Button
                                    size="small"
                                    variation="link"
                                    onClick={() => handleDeleteQuiz(quiz.id)}
                                  >
                                    Xóa
                                  </Button>
                                ) : (
                                  <Flex direction="column" gap="xxs">
                                    <Text fontSize="small" color="font.tertiary">
                                      {quiz.deadline
                                        ? `Hạn nộp: ${deadlineLabel}`
                                        : 'Không giới hạn thời gian'}
                                    </Text>
                                    {isQuizExpired && (
                                      <Text fontSize="small" color="red">
                                        Quiz đã hết hạn
                                      </Text>
                                    )}
                                    {submission ? (
                                      <Text fontSize="small" color="font.tertiary">
                                        Đã nộp • Điểm: {describeSubmissionScore(submission)}
                                      </Text>
                                    ) : (
                                      <Text fontSize="small" color="font.tertiary">
                                        Chưa nộp
                                      </Text>
                                    )}
                                    <Button
                                      size="small"
                                      variation="primary"
                                      onClick={() => handleStartQuiz(quiz.id)}
                                      isLoading={
                                        loadingQuizQuestions && activeQuizId === quiz.id
                                      }
                                      disabled={isQuizExpired}
                                    >
                                      {isQuizExpired
                                        ? 'Hết hạn'
                                        : submission
                                        ? 'Làm lại'
                                        : 'Làm quiz'}
                                    </Button>
                                  </Flex>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </LayoutCard>

                {!canManageCourse && activeQuiz && (
                  <LayoutCard title={`Làm quiz: ${activeQuiz.title}`}>
                    {loadingQuizQuestions && !activeQuizQuestions.length ? (
                      <Flex alignItems="center" gap="small">
                        <Loader />
                        <Text>Đang tải câu hỏi...</Text>
                      </Flex>
                    ) : (
                      <>
                        {activeQuizQuestions.length === 0 ? (
                          <Text>Quiz này chưa có câu hỏi.</Text>
                        ) : (
                          <Flex direction="column" gap="medium">
                            {activeQuizQuestions.map((question, index) => (
                              <Card key={question.id} variation="outlined" padding="medium">
                                <Heading level={6}>
                                  Câu {index + 1}: {question.text}
                                </Heading>
                                <Flex direction="column" gap="xxs" marginTop="small">
                                  {question.options?.map((option, optIndex) => (
                                    <Button
                                      key={`${question.id}-${optIndex}`}
                                      variation={
                                        quizAnswers[question.id] === optIndex
                                          ? 'primary'
                                          : 'link'
                                      }
                                      justifyContent="flex-start"
                                      onClick={() =>
                                        handleSelectAnswer(question.id, optIndex)
                                      }
                                    >
                                      {String.fromCharCode(65 + optIndex)}. {option}
                                    </Button>
                                  ))}
                                </Flex>
                              </Card>
                            ))}
                            <Flex gap="small">
                              <Button
                                variation="primary"
                                onClick={handleSubmitQuiz}
                                isLoading={submittingQuiz}
                              >
                                Nộp bài
                              </Button>
                              <Button
                                variation="link"
                                onClick={handleCancelQuizAttempt}
                                disabled={submittingQuiz}
                              >
                                Huỷ
                              </Button>
                            </Flex>
                          </Flex>
                        )}
                      </>
                    )}
                  </LayoutCard>
                )}
              </View>
            )}

            {activeTab === 'students' && (
              <LayoutCard
                title="Danh sách học viên"
                actions={[
                  <Button
                    key="attendance"
                    size="small"
                    variation="primary"
                    onClick={() =>
                      alert(
                        'Điểm danh hiện chỉ lưu tạm trên giao diện. Để lưu xuống backend, hãy mở rộng schema Enrollment.'
                      )
                    }
                  >
                    Xuất điểm danh
                  </Button>
                ]}
              >
                {roster.length === 0 ? (
                  <Text>Chưa có học viên ghi danh.</Text>
                ) : (
                  <Table highlightOnHover>
                    <TableHead>
                      <TableRow>
                        <TableCell as="th">Học viên</TableCell>
                        <TableCell as="th">Email</TableCell>
                        <TableCell as="th">Ngày ghi danh</TableCell>
                        <TableCell as="th">Điểm danh (tạm)</TableCell>
                        {canManageCourse && <TableCell as="th">Hành động</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {roster.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell>
                            {enrollment.student?.username || enrollment.studentID}
                          </TableCell>
                          <TableCell>
                            {enrollment.student?.email || 'N/A'}
                          </TableCell>
                          <TableCell>{enrollment.createdAt}</TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              onClick={() =>
                                setAttendanceMarks((prev) => ({
                                  ...prev,
                                  [enrollment.id]: !prev[enrollment.id]
                                }))
                              }
                            >
                              {attendanceMarks[enrollment.id]
                                ? 'Đã điểm danh'
                                : 'Chưa điểm danh'}
                            </Button>
                          </TableCell>
                          {canManageCourse && (
                            <TableCell>
                              <Button
                                size="small"
                                variation="link"
                                onClick={() => handleRemoveEnrollment(enrollment)}
                                isLoading={removingEnrollmentId === enrollment.id}
                              >
                                Loại khỏi khoá
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </LayoutCard>
            )}

            {activeTab === 'requests' && role !== 'Student' && (
              <LayoutCard title="Yêu cầu ghi danh">
                {loadingRequests ? (
                  <Flex alignItems="center" gap="small">
                    <Loader />
                    <Text>Đang tải yêu cầu...</Text>
                  </Flex>
                ) : requests.length === 0 ? (
                  <Text>Không có yêu cầu nào đang chờ phê duyệt.</Text>
                ) : (
                  <Table highlightOnHover>
                    <TableHead>
                      <TableRow>
                        <TableCell as="th">Học viên</TableCell>
                        <TableCell as="th">Email</TableCell>
                        <TableCell as="th">Ngày gửi</TableCell>
                        <TableCell as="th">Hành động</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {requests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell>{req.student?.username || req.studentID}</TableCell>
                          <TableCell>{req.student?.email || 'N/A'}</TableCell>
                          <TableCell>{req.createdAt}</TableCell>
                          <TableCell>
                            <Flex gap="small">
                              <Button
                                size="small"
                                variation="primary"
                                onClick={() => handleApproveRequest(req)}
                                isLoading={managingRequestId === req.id}
                              >
                                Phê duyệt
                              </Button>
                              <Button
                                size="small"
                                variation="link"
                                onClick={() => handleRejectRequest(req)}
                                isLoading={managingRequestId === req.id}
                              >
                                Từ chối
                              </Button>
                            </Flex>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </LayoutCard>
            )}

            {activeTab === 'scores' && (
              <LayoutCard title="Điểm quiz">
                {quizScoreboard.length === 0 ? (
                  <Text>Chưa có bài nộp nào.</Text>
                ) : (
                  <Table highlightOnHover>
                    <TableHead>
                      <TableRow>
                        {!isStudent && <TableCell as="th">Học viên</TableCell>}
                        <TableCell as="th">Quiz</TableCell>
                        <TableCell as="th">Điểm</TableCell>
                        <TableCell as="th">Thời gian nộp</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {quizScoreboard.map((row) => (
                        <TableRow key={row.id}>
                          {!isStudent && <TableCell>{row.student}</TableCell>}
                          <TableCell>{row.quizTitle}</TableCell>
                          <TableCell>{row.scoreText ?? 'Chưa chấm'}</TableCell>
                          <TableCell>{row.submittedAt || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </LayoutCard>
            )}
          </>
        )}
      </Card>
    </View>
  );
}

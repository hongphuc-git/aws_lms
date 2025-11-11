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
import { uploadData } from '@aws-amplify/storage';
import awsconfig from './aws-exports';
import {
  getCourse,
  lecturesByCourseID,
  quizzesByCourseID,
  enrollmentsByCourseID,
  listSubmissions
} from './graphql/queries';
import {
  createLecture,
  deleteLecture,
  createQuiz,
  deleteQuiz,
  createQuestion,
  createEnrollment
} from './graphql/mutations';

import {
  enrollmentRequestsByCourseQuery,
  deleteEnrollmentRequestMutation
} from './graphql/enrollmentRequests';

const buildS3Link = (key) => {
  if (!key) return '#';
  const normalizedKey = key.startsWith('public/') ? key : `public/${key}`;
  return `https://${awsconfig.aws_user_files_s3_bucket}.s3.${awsconfig.aws_project_region}.amazonaws.com/${normalizedKey}`;
};

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

export default function CourseDetail({ courseId, onClose, role = 'Instructor' }) {
  const [client] = useState(() => generateClient());
  const [activeTab, setActiveTab] = useState('overview');

  const [course, setCourse] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
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
    questions: [
      { text: '', options: ['', '', '', ''], correctAnswerIndex: 0 }
    ]
  });
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [managingRequestId, setManagingRequestId] = useState('');

  const [attendanceMarks, setAttendanceMarks] = useState({});

  const tabs = useMemo(() => {
    const base = [
      { value: 'overview', label: 'Tổng quan' },
      { value: 'materials', label: 'Tài nguyên' },
      { value: 'quizzes', label: 'Quiz' },
      { value: 'students', label: 'Học viên' },
      { value: 'scores', label: 'Điểm số' }
    ];
    if (role !== 'Student') {
      base.splice(4, 0, { value: 'requests', label: 'Yêu cầu' });
    }
    return base;
  }, [role]);

  const closeOverlay = useCallback(() => {
    setCourse(null);
    setLectures([]);
    setQuizzes([]);
    setEnrollments([]);
    setSubmissions([]);
    setRequests([]);
    setActiveTab('overview');
    setLectureForm({ title: '', file: null });
    setQuizForm({
      title: '',
      questions: [{ text: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]
    });
    setAttendanceMarks({});
    onClose?.();
  }, [onClose]);

  const fetchSubmissionsForQuizzes = useCallback(async (quizList) => {
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
              filter: { quizID: { eq: quiz.id } },
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
  }, [client]);

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
      const [courseRes, lectureRes, quizRes, enrollmentRes] = await Promise.all([
        client.graphql({
          query: getCourse,
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
        }),
        client.graphql({
          query: enrollmentsByCourseID,
          variables: { courseID: courseId, limit: 200 },
          authMode: 'userPool'
        })
      ]);

      const courseData = courseRes.data?.getCourse ?? null;
      const lectureItems =
        lectureRes.data?.lecturesByCourseID?.items?.filter(Boolean) ?? [];
      const quizItems =
        quizRes.data?.quizzesByCourseID?.items?.filter(Boolean) ?? [];
      const enrollmentItems =
        enrollmentRes.data?.enrollmentsByCourseID?.items?.filter(Boolean) ?? [];

      setCourse(courseData);
      setLectures(lectureItems);
      setQuizzes(quizItems);
      setEnrollments(enrollmentItems);
      await fetchSubmissionsForQuizzes(quizItems);
      await loadRequestsForCourse(courseId);
    } catch (err) {
      console.error('load course detail error:', err);
      setError(err.message || 'Không thể tải thông tin khoá học.');
    } finally {
      setLoading(false);
    }
  }, [client, courseId, fetchSubmissionsForQuizzes, loadRequestsForCourse]);

  useEffect(() => {
    if (courseId) {
      loadCourseData();
    }
  }, [courseId, loadCourseData]);

  const handleLectureUpload = async (event) => {
    event.preventDefault();
    if (!lectureForm.file || !courseId) return;
    setUploadingLecture(true);
    try {
      const key = `courses/${courseId}/${Date.now()}-${lectureForm.file.name}`;
      const uploadResult = await uploadData({
        key,
        data: lectureForm.file,
        options: { contentType: lectureForm.file.type }
      }).result;

      const fileInput = {
        bucket: awsconfig.aws_user_files_s3_bucket,
        region: awsconfig.aws_project_region,
        key: uploadResult?.key || key
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

  const handleCreateQuiz = async (event) => {
    event.preventDefault();
    if (!quizForm.title.trim()) {
      alert('Vui lòng nhập tên quiz.');
      return;
    }
    setSavingQuiz(true);
    try {
      const createQuizResult = await client.graphql({
        query: createQuiz,
        variables: {
          input: {
            title: quizForm.title.trim(),
            courseID: courseId
          }
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

  const handleApproveRequest = async (request) => {
    setManagingRequestId(request.id);
    try {
      await client.graphql({
        query: createEnrollment,
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

  const quizScoreboard = useMemo(() => {
    if (!submissions.length) return [];
    return submissions.map((item) => {
      const quiz = quizzes.find((q) => q.id === item.quizID);
      const enrollment = enrollments.find(
        (en) => en.studentID === item.studentID
      );
      const studentLabel =
        enrollment?.student?.username || `ID ${item.studentID}`;
      return {
        id: item.id,
        student: studentLabel,
        quizTitle: quiz?.title || 'Quiz',
        score: item.score,
        submittedAt: item.createdAt || ''
      };
    });
  }, [submissions, quizzes, enrollments]);

  const LayoutCard = ({ title, actions, children }) => (
    <Card variation="outlined" padding="large" marginTop="medium">
      <Flex justifyContent="space-between" alignItems="center" marginBottom="medium" wrap="wrap">
        <Heading level={4} marginBottom="0">
          {title}
        </Heading>
        <Flex gap="small">{actions}</Flex>
      </Flex>
      {children}
    </Card>
  );

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
                          <TableCell as="th">Hành động</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lectures.map((lecture) => (
                          <TableRow key={lecture.id}>
                            <TableCell>{lecture.title}</TableCell>
                            <TableCell>
                              {lecture.file?.key ? (
                                <a
                                  href={buildS3Link(lecture.file.key)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Tải xuống
                                </a>
                              ) : (
                                <Text color="font.tertiary">Không có file</Text>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variation="link"
                                onClick={() => handleLectureDelete(lecture.id)}
                              >
                                Xoá
                              </Button>
                            </TableCell>
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

                <LayoutCard title="Quiz hiện có">
                  {quizzes.length === 0 ? (
                    <Text>Chưa có quiz nào.</Text>
                  ) : (
                    <Table highlightOnHover>
                      <TableHead>
                        <TableRow>
                          <TableCell as="th">Tên quiz</TableCell>
                          <TableCell as="th">Số câu hỏi</TableCell>
                          <TableCell as="th">Hành động</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {quizzes.map((quiz) => (
                          <TableRow key={quiz.id}>
                            <TableCell>{quiz.title}</TableCell>
                            <TableCell>
                              {quiz.questions?.items?.length ??
                                quiz.questions?.length ??
                                0}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variation="link"
                                onClick={() => handleDeleteQuiz(quiz.id)}
                              >
                                Xoá
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </LayoutCard>
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
                        <TableCell as="th">Học viên</TableCell>
                        <TableCell as="th">Quiz</TableCell>
                        <TableCell as="th">Điểm</TableCell>
                        <TableCell as="th">Thời gian nộp</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {quizScoreboard.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.student}</TableCell>
                          <TableCell>{row.quizTitle}</TableCell>
                          <TableCell>{row.score}</TableCell>
                          <TableCell>{row.submittedAt}</TableCell>
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

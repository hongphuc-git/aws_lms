/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getUser = /* GraphQL */ `
  query GetUser($id: ID!) {
    getUser(id: $id) {
      id
      username
      email
      role
      courses {
        nextToken
        __typename
      }
      enrollments {
        nextToken
        __typename
      }
      enrollmentRequests {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const listUsers = /* GraphQL */ `
  query ListUsers(
    $filter: ModelUserFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listUsers(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        username
        email
        role
        createdAt
        updatedAt
        owner
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getCourse = /* GraphQL */ `
  query GetCourse($id: ID!) {
    getCourse(id: $id) {
      id
      title
      description
      instructorID
      instructor {
        id
        username
        email
        role
        createdAt
        updatedAt
        owner
        __typename
      }
      lectures {
        nextToken
        __typename
      }
      quizzes {
        nextToken
        __typename
      }
      enrollments {
        nextToken
        __typename
      }
      enrollmentRequests {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listCourses = /* GraphQL */ `
  query ListCourses(
    $filter: ModelCourseFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listCourses(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        title
        description
        instructorID
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getLecture = /* GraphQL */ `
  query GetLecture($id: ID!) {
    getLecture(id: $id) {
      id
      title
      courseID
      course {
        id
        title
        description
        instructorID
        createdAt
        updatedAt
        __typename
      }
      file {
        bucket
        region
        key
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listLectures = /* GraphQL */ `
  query ListLectures(
    $filter: ModelLectureFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listLectures(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        title
        courseID
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getQuiz = /* GraphQL */ `
  query GetQuiz($id: ID!) {
    getQuiz(id: $id) {
      id
      title
      courseID
      course {
        id
        title
        description
        instructorID
        createdAt
        updatedAt
        __typename
      }
      questions {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listQuizzes = /* GraphQL */ `
  query ListQuizzes(
    $filter: ModelQuizFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listQuizzes(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        title
        courseID
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getQuestion = /* GraphQL */ `
  query GetQuestion($id: ID!) {
    getQuestion(id: $id) {
      id
      quizID
      quiz {
        id
        title
        courseID
        createdAt
        updatedAt
        __typename
      }
      text
      options
      correctAnswerIndex
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listQuestions = /* GraphQL */ `
  query ListQuestions(
    $filter: ModelQuestionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listQuestions(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        quizID
        text
        options
        correctAnswerIndex
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getEnrollment = /* GraphQL */ `
  query GetEnrollment($id: ID!) {
    getEnrollment(id: $id) {
      id
      studentID
      student {
        id
        username
        email
        role
        createdAt
        updatedAt
        owner
        __typename
      }
      courseID
      course {
        id
        title
        description
        instructorID
        createdAt
        updatedAt
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listEnrollments = /* GraphQL */ `
  query ListEnrollments(
    $filter: ModelEnrollmentFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listEnrollments(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        studentID
        courseID
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getEnrollmentRequest = /* GraphQL */ `
  query GetEnrollmentRequest($id: ID!) {
    getEnrollmentRequest(id: $id) {
      id
      courseID
      studentID
      status
      message
      course {
        id
        title
        description
        instructorID
        createdAt
        updatedAt
        __typename
      }
      student {
        id
        username
        email
        role
        createdAt
        updatedAt
        owner
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listEnrollmentRequests = /* GraphQL */ `
  query ListEnrollmentRequests(
    $filter: ModelEnrollmentRequestFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listEnrollmentRequests(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        courseID
        studentID
        status
        message
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getSubmission = /* GraphQL */ `
  query GetSubmission($id: ID!) {
    getSubmission(id: $id) {
      id
      studentID
      quizID
      score
      answers
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listSubmissions = /* GraphQL */ `
  query ListSubmissions(
    $filter: ModelSubmissionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listSubmissions(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        studentID
        quizID
        score
        answers
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const coursesByInstructorID = /* GraphQL */ `
  query CoursesByInstructorID(
    $instructorID: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelCourseFilterInput
    $limit: Int
    $nextToken: String
  ) {
    coursesByInstructorID(
      instructorID: $instructorID
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        title
        description
        instructorID
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const lecturesByCourseID = /* GraphQL */ `
  query LecturesByCourseID(
    $courseID: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelLectureFilterInput
    $limit: Int
    $nextToken: String
  ) {
    lecturesByCourseID(
      courseID: $courseID
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        title
        courseID
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const quizzesByCourseID = /* GraphQL */ `
  query QuizzesByCourseID(
    $courseID: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelQuizFilterInput
    $limit: Int
    $nextToken: String
  ) {
    quizzesByCourseID(
      courseID: $courseID
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        title
        courseID
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const questionsByQuizID = /* GraphQL */ `
  query QuestionsByQuizID(
    $quizID: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelQuestionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    questionsByQuizID(
      quizID: $quizID
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        quizID
        text
        options
        correctAnswerIndex
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const enrollmentsByStudentID = /* GraphQL */ `
  query EnrollmentsByStudentID(
    $studentID: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelEnrollmentFilterInput
    $limit: Int
    $nextToken: String
  ) {
    enrollmentsByStudentID(
      studentID: $studentID
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        studentID
        courseID
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const enrollmentsByCourseID = /* GraphQL */ `
  query EnrollmentsByCourseID(
    $courseID: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelEnrollmentFilterInput
    $limit: Int
    $nextToken: String
  ) {
    enrollmentsByCourseID(
      courseID: $courseID
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        studentID
        courseID
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const enrollmentRequestsByCourseID = /* GraphQL */ `
  query EnrollmentRequestsByCourseID(
    $courseID: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelEnrollmentRequestFilterInput
    $limit: Int
    $nextToken: String
  ) {
    enrollmentRequestsByCourseID(
      courseID: $courseID
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        courseID
        studentID
        status
        message
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const enrollmentRequestsByStudentID = /* GraphQL */ `
  query EnrollmentRequestsByStudentID(
    $studentID: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelEnrollmentRequestFilterInput
    $limit: Int
    $nextToken: String
  ) {
    enrollmentRequestsByStudentID(
      studentID: $studentID
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        courseID
        studentID
        status
        message
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const submissionsByStudentID = /* GraphQL */ `
  query SubmissionsByStudentID(
    $studentID: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelSubmissionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    submissionsByStudentID(
      studentID: $studentID
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        studentID
        quizID
        score
        answers
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;

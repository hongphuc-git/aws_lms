/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateUser = /* GraphQL */ `
  subscription OnCreateUser(
    $filter: ModelSubscriptionUserFilterInput
    $owner: String
  ) {
    onCreateUser(filter: $filter, owner: $owner) {
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
export const onUpdateUser = /* GraphQL */ `
  subscription OnUpdateUser(
    $filter: ModelSubscriptionUserFilterInput
    $owner: String
  ) {
    onUpdateUser(filter: $filter, owner: $owner) {
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
export const onDeleteUser = /* GraphQL */ `
  subscription OnDeleteUser(
    $filter: ModelSubscriptionUserFilterInput
    $owner: String
  ) {
    onDeleteUser(filter: $filter, owner: $owner) {
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
export const onCreateCourse = /* GraphQL */ `
  subscription OnCreateCourse($filter: ModelSubscriptionCourseFilterInput) {
    onCreateCourse(filter: $filter) {
      id
      title
      deadline
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
      notifications {
        nextToken
        __typename
      }
      messages {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateCourse = /* GraphQL */ `
  subscription OnUpdateCourse($filter: ModelSubscriptionCourseFilterInput) {
    onUpdateCourse(filter: $filter) {
      id
      title
      deadline
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
      notifications {
        nextToken
        __typename
      }
      messages {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteCourse = /* GraphQL */ `
  subscription OnDeleteCourse($filter: ModelSubscriptionCourseFilterInput) {
    onDeleteCourse(filter: $filter) {
      id
      title
      deadline
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
      notifications {
        nextToken
        __typename
      }
      messages {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateLecture = /* GraphQL */ `
  subscription OnCreateLecture($filter: ModelSubscriptionLectureFilterInput) {
    onCreateLecture(filter: $filter) {
      id
      title
      deadline
      courseID
      course {
        id
        title
        deadline
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
export const onUpdateLecture = /* GraphQL */ `
  subscription OnUpdateLecture($filter: ModelSubscriptionLectureFilterInput) {
    onUpdateLecture(filter: $filter) {
      id
      title
      deadline
      courseID
      course {
        id
        title
        deadline
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
export const onDeleteLecture = /* GraphQL */ `
  subscription OnDeleteLecture($filter: ModelSubscriptionLectureFilterInput) {
    onDeleteLecture(filter: $filter) {
      id
      title
      deadline
      courseID
      course {
        id
        title
        deadline
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
export const onCreateQuiz = /* GraphQL */ `
  subscription OnCreateQuiz($filter: ModelSubscriptionQuizFilterInput) {
    onCreateQuiz(filter: $filter) {
      id
      title
      courseID
      course {
        id
        title
        deadline
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
export const onUpdateQuiz = /* GraphQL */ `
  subscription OnUpdateQuiz($filter: ModelSubscriptionQuizFilterInput) {
    onUpdateQuiz(filter: $filter) {
      id
      title
      courseID
      course {
        id
        title
        deadline
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
export const onDeleteQuiz = /* GraphQL */ `
  subscription OnDeleteQuiz($filter: ModelSubscriptionQuizFilterInput) {
    onDeleteQuiz(filter: $filter) {
      id
      title
      courseID
      course {
        id
        title
        deadline
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
export const onCreateQuestion = /* GraphQL */ `
  subscription OnCreateQuestion($filter: ModelSubscriptionQuestionFilterInput) {
    onCreateQuestion(filter: $filter) {
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
export const onUpdateQuestion = /* GraphQL */ `
  subscription OnUpdateQuestion($filter: ModelSubscriptionQuestionFilterInput) {
    onUpdateQuestion(filter: $filter) {
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
export const onDeleteQuestion = /* GraphQL */ `
  subscription OnDeleteQuestion($filter: ModelSubscriptionQuestionFilterInput) {
    onDeleteQuestion(filter: $filter) {
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
export const onCreateEnrollment = /* GraphQL */ `
  subscription OnCreateEnrollment(
    $filter: ModelSubscriptionEnrollmentFilterInput
    $studentID: String
  ) {
    onCreateEnrollment(filter: $filter, studentID: $studentID) {
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
        deadline
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
export const onUpdateEnrollment = /* GraphQL */ `
  subscription OnUpdateEnrollment(
    $filter: ModelSubscriptionEnrollmentFilterInput
    $studentID: String
  ) {
    onUpdateEnrollment(filter: $filter, studentID: $studentID) {
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
        deadline
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
export const onDeleteEnrollment = /* GraphQL */ `
  subscription OnDeleteEnrollment(
    $filter: ModelSubscriptionEnrollmentFilterInput
    $studentID: String
  ) {
    onDeleteEnrollment(filter: $filter, studentID: $studentID) {
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
        deadline
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
export const onCreateEnrollmentRequest = /* GraphQL */ `
  subscription OnCreateEnrollmentRequest(
    $filter: ModelSubscriptionEnrollmentRequestFilterInput
    $studentID: String
  ) {
    onCreateEnrollmentRequest(filter: $filter, studentID: $studentID) {
      id
      courseID
      studentID
      status
      message
      course {
        id
        title
        deadline
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
export const onUpdateEnrollmentRequest = /* GraphQL */ `
  subscription OnUpdateEnrollmentRequest(
    $filter: ModelSubscriptionEnrollmentRequestFilterInput
    $studentID: String
  ) {
    onUpdateEnrollmentRequest(filter: $filter, studentID: $studentID) {
      id
      courseID
      studentID
      status
      message
      course {
        id
        title
        deadline
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
export const onDeleteEnrollmentRequest = /* GraphQL */ `
  subscription OnDeleteEnrollmentRequest(
    $filter: ModelSubscriptionEnrollmentRequestFilterInput
    $studentID: String
  ) {
    onDeleteEnrollmentRequest(filter: $filter, studentID: $studentID) {
      id
      courseID
      studentID
      status
      message
      course {
        id
        title
        deadline
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
export const onCreateSubmission = /* GraphQL */ `
  subscription OnCreateSubmission(
    $filter: ModelSubscriptionSubmissionFilterInput
    $studentID: String
  ) {
    onCreateSubmission(filter: $filter, studentID: $studentID) {
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
export const onUpdateSubmission = /* GraphQL */ `
  subscription OnUpdateSubmission(
    $filter: ModelSubscriptionSubmissionFilterInput
    $studentID: String
  ) {
    onUpdateSubmission(filter: $filter, studentID: $studentID) {
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
export const onDeleteSubmission = /* GraphQL */ `
  subscription OnDeleteSubmission(
    $filter: ModelSubscriptionSubmissionFilterInput
    $studentID: String
  ) {
    onDeleteSubmission(filter: $filter, studentID: $studentID) {
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
export const onCreateCourseNotification = /* GraphQL */ `
  subscription OnCreateCourseNotification(
    $filter: ModelSubscriptionCourseNotificationFilterInput
  ) {
    onCreateCourseNotification(filter: $filter) {
      id
      courseID
      course {
        id
        title
        deadline
        description
        instructorID
        createdAt
        updatedAt
        __typename
      }
      title
      content
      creatorID
      creatorName
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateCourseNotification = /* GraphQL */ `
  subscription OnUpdateCourseNotification(
    $filter: ModelSubscriptionCourseNotificationFilterInput
  ) {
    onUpdateCourseNotification(filter: $filter) {
      id
      courseID
      course {
        id
        title
        deadline
        description
        instructorID
        createdAt
        updatedAt
        __typename
      }
      title
      content
      creatorID
      creatorName
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteCourseNotification = /* GraphQL */ `
  subscription OnDeleteCourseNotification(
    $filter: ModelSubscriptionCourseNotificationFilterInput
  ) {
    onDeleteCourseNotification(filter: $filter) {
      id
      courseID
      course {
        id
        title
        deadline
        description
        instructorID
        createdAt
        updatedAt
        __typename
      }
      title
      content
      creatorID
      creatorName
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateMessage = /* GraphQL */ `
  subscription OnCreateMessage(
    $filter: ModelSubscriptionMessageFilterInput
    $senderID: String
    $recipientID: String
  ) {
    onCreateMessage(
      filter: $filter
      senderID: $senderID
      recipientID: $recipientID
    ) {
      id
      senderID
      recipientID
      subject
      body
      status
      courseID
      senderName
      recipientName
      course {
        id
        title
        deadline
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
export const onUpdateMessage = /* GraphQL */ `
  subscription OnUpdateMessage(
    $filter: ModelSubscriptionMessageFilterInput
    $senderID: String
    $recipientID: String
  ) {
    onUpdateMessage(
      filter: $filter
      senderID: $senderID
      recipientID: $recipientID
    ) {
      id
      senderID
      recipientID
      subject
      body
      status
      courseID
      senderName
      recipientName
      course {
        id
        title
        deadline
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
export const onDeleteMessage = /* GraphQL */ `
  subscription OnDeleteMessage(
    $filter: ModelSubscriptionMessageFilterInput
    $senderID: String
    $recipientID: String
  ) {
    onDeleteMessage(
      filter: $filter
      senderID: $senderID
      recipientID: $recipientID
    ) {
      id
      senderID
      recipientID
      subject
      body
      status
      courseID
      senderName
      recipientName
      course {
        id
        title
        deadline
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

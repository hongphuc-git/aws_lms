/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createUser = /* GraphQL */ `
  mutation CreateUser(
    $input: CreateUserInput!
    $condition: ModelUserConditionInput
  ) {
    createUser(input: $input, condition: $condition) {
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
export const updateUser = /* GraphQL */ `
  mutation UpdateUser(
    $input: UpdateUserInput!
    $condition: ModelUserConditionInput
  ) {
    updateUser(input: $input, condition: $condition) {
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
export const deleteUser = /* GraphQL */ `
  mutation DeleteUser(
    $input: DeleteUserInput!
    $condition: ModelUserConditionInput
  ) {
    deleteUser(input: $input, condition: $condition) {
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
export const createCourse = /* GraphQL */ `
  mutation CreateCourse(
    $input: CreateCourseInput!
    $condition: ModelCourseConditionInput
  ) {
    createCourse(input: $input, condition: $condition) {
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
export const updateCourse = /* GraphQL */ `
  mutation UpdateCourse(
    $input: UpdateCourseInput!
    $condition: ModelCourseConditionInput
  ) {
    updateCourse(input: $input, condition: $condition) {
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
export const deleteCourse = /* GraphQL */ `
  mutation DeleteCourse(
    $input: DeleteCourseInput!
    $condition: ModelCourseConditionInput
  ) {
    deleteCourse(input: $input, condition: $condition) {
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
export const createLecture = /* GraphQL */ `
  mutation CreateLecture(
    $input: CreateLectureInput!
    $condition: ModelLectureConditionInput
  ) {
    createLecture(input: $input, condition: $condition) {
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
export const updateLecture = /* GraphQL */ `
  mutation UpdateLecture(
    $input: UpdateLectureInput!
    $condition: ModelLectureConditionInput
  ) {
    updateLecture(input: $input, condition: $condition) {
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
export const deleteLecture = /* GraphQL */ `
  mutation DeleteLecture(
    $input: DeleteLectureInput!
    $condition: ModelLectureConditionInput
  ) {
    deleteLecture(input: $input, condition: $condition) {
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
export const createQuiz = /* GraphQL */ `
  mutation CreateQuiz(
    $input: CreateQuizInput!
    $condition: ModelQuizConditionInput
  ) {
    createQuiz(input: $input, condition: $condition) {
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
export const updateQuiz = /* GraphQL */ `
  mutation UpdateQuiz(
    $input: UpdateQuizInput!
    $condition: ModelQuizConditionInput
  ) {
    updateQuiz(input: $input, condition: $condition) {
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
export const deleteQuiz = /* GraphQL */ `
  mutation DeleteQuiz(
    $input: DeleteQuizInput!
    $condition: ModelQuizConditionInput
  ) {
    deleteQuiz(input: $input, condition: $condition) {
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
export const createQuestion = /* GraphQL */ `
  mutation CreateQuestion(
    $input: CreateQuestionInput!
    $condition: ModelQuestionConditionInput
  ) {
    createQuestion(input: $input, condition: $condition) {
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
export const updateQuestion = /* GraphQL */ `
  mutation UpdateQuestion(
    $input: UpdateQuestionInput!
    $condition: ModelQuestionConditionInput
  ) {
    updateQuestion(input: $input, condition: $condition) {
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
export const deleteQuestion = /* GraphQL */ `
  mutation DeleteQuestion(
    $input: DeleteQuestionInput!
    $condition: ModelQuestionConditionInput
  ) {
    deleteQuestion(input: $input, condition: $condition) {
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
export const createEnrollment = /* GraphQL */ `
  mutation CreateEnrollment(
    $input: CreateEnrollmentInput!
    $condition: ModelEnrollmentConditionInput
  ) {
    createEnrollment(input: $input, condition: $condition) {
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
export const updateEnrollment = /* GraphQL */ `
  mutation UpdateEnrollment(
    $input: UpdateEnrollmentInput!
    $condition: ModelEnrollmentConditionInput
  ) {
    updateEnrollment(input: $input, condition: $condition) {
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
export const deleteEnrollment = /* GraphQL */ `
  mutation DeleteEnrollment(
    $input: DeleteEnrollmentInput!
    $condition: ModelEnrollmentConditionInput
  ) {
    deleteEnrollment(input: $input, condition: $condition) {
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
export const createEnrollmentRequest = /* GraphQL */ `
  mutation CreateEnrollmentRequest(
    $input: CreateEnrollmentRequestInput!
    $condition: ModelEnrollmentRequestConditionInput
  ) {
    createEnrollmentRequest(input: $input, condition: $condition) {
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
export const updateEnrollmentRequest = /* GraphQL */ `
  mutation UpdateEnrollmentRequest(
    $input: UpdateEnrollmentRequestInput!
    $condition: ModelEnrollmentRequestConditionInput
  ) {
    updateEnrollmentRequest(input: $input, condition: $condition) {
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
export const deleteEnrollmentRequest = /* GraphQL */ `
  mutation DeleteEnrollmentRequest(
    $input: DeleteEnrollmentRequestInput!
    $condition: ModelEnrollmentRequestConditionInput
  ) {
    deleteEnrollmentRequest(input: $input, condition: $condition) {
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
export const createSubmission = /* GraphQL */ `
  mutation CreateSubmission(
    $input: CreateSubmissionInput!
    $condition: ModelSubmissionConditionInput
  ) {
    createSubmission(input: $input, condition: $condition) {
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
export const updateSubmission = /* GraphQL */ `
  mutation UpdateSubmission(
    $input: UpdateSubmissionInput!
    $condition: ModelSubmissionConditionInput
  ) {
    updateSubmission(input: $input, condition: $condition) {
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
export const deleteSubmission = /* GraphQL */ `
  mutation DeleteSubmission(
    $input: DeleteSubmissionInput!
    $condition: ModelSubmissionConditionInput
  ) {
    deleteSubmission(input: $input, condition: $condition) {
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
export const createCourseNotification = /* GraphQL */ `
  mutation CreateCourseNotification(
    $input: CreateCourseNotificationInput!
    $condition: ModelCourseNotificationConditionInput
  ) {
    createCourseNotification(input: $input, condition: $condition) {
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
export const updateCourseNotification = /* GraphQL */ `
  mutation UpdateCourseNotification(
    $input: UpdateCourseNotificationInput!
    $condition: ModelCourseNotificationConditionInput
  ) {
    updateCourseNotification(input: $input, condition: $condition) {
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
export const deleteCourseNotification = /* GraphQL */ `
  mutation DeleteCourseNotification(
    $input: DeleteCourseNotificationInput!
    $condition: ModelCourseNotificationConditionInput
  ) {
    deleteCourseNotification(input: $input, condition: $condition) {
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
export const createMessage = /* GraphQL */ `
  mutation CreateMessage(
    $input: CreateMessageInput!
    $condition: ModelMessageConditionInput
  ) {
    createMessage(input: $input, condition: $condition) {
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
export const updateMessage = /* GraphQL */ `
  mutation UpdateMessage(
    $input: UpdateMessageInput!
    $condition: ModelMessageConditionInput
  ) {
    updateMessage(input: $input, condition: $condition) {
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
export const deleteMessage = /* GraphQL */ `
  mutation DeleteMessage(
    $input: DeleteMessageInput!
    $condition: ModelMessageConditionInput
  ) {
    deleteMessage(input: $input, condition: $condition) {
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

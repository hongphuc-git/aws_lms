export const createEnrollmentRequestMutation = /* GraphQL */ `
  mutation CreateEnrollmentRequest($input: CreateEnrollmentRequestInput!) {
    createEnrollmentRequest(input: $input) {
      id
      courseID
      studentID
      status
      message
      createdAt
      updatedAt
    }
  }
`;

export const deleteEnrollmentRequestMutation = /* GraphQL */ `
  mutation DeleteEnrollmentRequest($input: DeleteEnrollmentRequestInput!) {
    deleteEnrollmentRequest(input: $input) {
      id
    }
  }
`;

export const enrollmentRequestsByStudentQuery = /* GraphQL */ `
  query EnrollmentRequestsByStudentID(
    $studentID: ID!
    $status: ModelEnrollmentRequestStatusInput
  ) {
    enrollmentRequestsByStudentID(
      studentID: $studentID
      filter: { status: $status }
      limit: 200
    ) {
      items {
        id
        courseID
        studentID
        status
        message
        createdAt
      }
    }
  }
`;

export const enrollmentRequestsByCourseQuery = /* GraphQL */ `
  query EnrollmentRequestsByCourseID(
    $courseID: ID!
    $status: ModelEnrollmentRequestStatusInput
  ) {
    enrollmentRequestsByCourseID(
      courseID: $courseID
      filter: { status: $status }
      limit: 200
    ) {
      items {
        id
        courseID
        studentID
        status
        message
        createdAt
        student {
          id
          username
          email
        }
      }
    }
  }
`;

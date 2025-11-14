/* eslint-disable */
// Custom GraphQL documents for course notifications and messaging flows

export const createCourseNotificationMutation = /* GraphQL */ `
  mutation CreateCourseNotification(
    $input: CreateCourseNotificationInput!
    $condition: ModelCourseNotificationConditionInput
  ) {
    createCourseNotification(input: $input, condition: $condition) {
      id
      courseID
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

export const deleteCourseNotificationMutation = /* GraphQL */ `
  mutation DeleteCourseNotification(
    $input: DeleteCourseNotificationInput!
    $condition: ModelCourseNotificationConditionInput
  ) {
    deleteCourseNotification(input: $input, condition: $condition) {
      id
      courseID
      __typename
    }
  }
`;

export const courseNotificationsByCourseQuery = /* GraphQL */ `
  query CourseNotificationsByCourseID(
    $courseID: ID!
    $filter: ModelCourseNotificationFilterInput
    $limit: Int
    $nextToken: String
  ) {
    courseNotificationsByCourseID(
      courseID: $courseID
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        courseID
        title
        content
        creatorID
        creatorName
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;

export const onCreateCourseNotificationSubscription = /* GraphQL */ `
  subscription OnCreateCourseNotification(
    $filter: ModelSubscriptionCourseNotificationFilterInput
  ) {
    onCreateCourseNotification(filter: $filter) {
      id
      courseID
      title
      content
      creatorID
      creatorName
      createdAt
      __typename
    }
  }
`;

export const createMessageMutation = /* GraphQL */ `
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
      createdAt
      updatedAt
      __typename
    }
  }
`;

export const updateMessageStatusMutation = /* GraphQL */ `
  mutation UpdateMessage(
    $input: UpdateMessageInput!
    $condition: ModelMessageConditionInput
  ) {
    updateMessage(input: $input, condition: $condition) {
      id
      senderID
      recipientID
      status
      updatedAt
      __typename
    }
  }
`;

export const messagesByRecipientQuery = /* GraphQL */ `
  query MessagesByRecipientID(
    $recipientID: ID!
    $filter: ModelMessageFilterInput
    $limit: Int
    $nextToken: String
  ) {
    messagesByRecipientID(
      recipientID: $recipientID
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        senderID
        recipientID
        subject
        body
        status
        courseID
        senderName
        recipientName
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;

export const messagesBySenderQuery = /* GraphQL */ `
  query MessagesBySenderID(
    $senderID: ID!
    $filter: ModelMessageFilterInput
    $limit: Int
    $nextToken: String
  ) {
    messagesBySenderID(
      senderID: $senderID
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        senderID
        recipientID
        subject
        body
        status
        courseID
        senderName
        recipientName
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;

export const onCreateMessageSubscription = /* GraphQL */ `
  subscription OnCreateMessage(
    $filter: ModelSubscriptionMessageFilterInput
  ) {
    onCreateMessage(filter: $filter) {
      id
      senderID
      recipientID
      subject
      body
      status
      courseID
      senderName
      recipientName
      createdAt
      __typename
    }
  }
`;

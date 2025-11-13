// App.jsx
import './amplifyClient';
import React, { useState, useEffect } from 'react';

import AdminDashboard from './AdminDashboard';
import InstructorDashboard from './InstructorDashboard';
import StudentDashboard from './StudentDashboard';
import { fetchAuthSession } from 'aws-amplify/auth';

import {
  withAuthenticator,
  Button,
  Heading,
  View,
  Text,
  Flex,
  Badge,
  ThemeProvider,
  createTheme,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

const lmsTheme = createTheme({
  name: 'lms-theme',
  tokens: {
    fonts: {
      default: {
        variable: {
          value:
            'Inter, Roboto, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      },
    },
    colors: {
      brand: {
        primary: {
          10: '#eff6ff',
          80: '#60a5fa',
          90: '#2563eb',
          100: '#1d4ed8',
        },
      },
      font: {
        primary: '#0f172a',
        secondary: '#64748b',
      },
    },
    radii: {
      small: '12px',
      medium: '16px',
    },
    shadows: {
      small: { value: '0 25px 55px rgba(15,23,42,0.12)' },
    },
  },
  overrides: [
    {
      colorMode: 'light',
      tokens: {
        components: {
          button: {
            primary: {
              backgroundColor: { value: '{colors.brand.primary.90}' },
              color: { value: '#fff' },
              fontWeight: { value: '600' },
              borderRadius: { value: '{radii.small}' },
              paddingBlock: { value: '0.85rem' },
              paddingInline: { value: '1.5rem' },
              boxShadow: { value: '0 15px 25px rgba(37,99,235,0.25)' },
              _hover: {
                backgroundColor: { value: '{colors.brand.primary.100}' },
                transform: { value: 'translateY(-1px)' },
                boxShadow: { value: '0 20px 35px rgba(37,99,235,0.35)' },
              },
            },
          },
          card: {
            borderRadius: { value: '{radii.medium}' },
            boxShadow: { value: '{shadows.small}' },
            padding: { value: '2.25rem' },
          },
          fieldcontrol: {
            borderRadius: { value: '{radii.small}' },
            borderColor: { value: 'rgba(15,23,42,0.12)' },
            _focus: {
              borderColor: { value: '{colors.brand.primary.90}' },
              boxShadow: { value: '0 0 0 3px rgba(37,99,235,0.2)' },
            },
          },
        },
      },
    },
  ],
});

/* =================================================================
   4. MAIN APP COMPONENT (Đã được xác thực)
   ================================================================= */
const AppContent = ({ signOut, user }) => {
  const [userRole, setUserRole] = useState(null); // 'Admin' | 'Instructor' | 'Student' | null

  useEffect(() => {
    // Lấy role từ token bằng fetchAuthSession (chuẩn Amplify v6)
    let mounted = true;
    (async () => {
      try {
        const { tokens } = await fetchAuthSession();
        const groups =
          (tokens?.idToken?.payload?.['cognito:groups'] ?? []) ||
          (tokens?.accessToken?.payload?.['cognito:groups'] ?? []);
        const groupList = Array.isArray(groups) ? groups : [];

        if (groupList.includes('Admin')) {
          if (mounted) setUserRole('Admin');
        } else if (groupList.includes('Instructor')) {
          if (mounted) setUserRole('Instructor');
        } else {
          if (mounted) setUserRole('Student');
        }
      } catch (e) {
        console.error('Không lấy được session:', e);
        if (mounted) setUserRole('Student'); // Fallback an toàn
      }
    })();

    return () => {
      mounted = false;
    };
  }, []); // KHÔNG phụ thuộc vào `user`

  const renderDashboardByRole = () => {
    if (!userRole) return <Text>Dang tai vai tro nguoi dung...</Text>;
    if (userRole === 'Admin') {
      return <AdminDashboard user={user} role={userRole} />;
    }
    if (userRole === 'Instructor') {
      return <InstructorDashboard user={user} role={userRole} />;
    }
    return <StudentDashboard user={user} role={userRole} />;
  };

  return (
    <View
      className="app-container"
      width="100vw"
      minHeight="100vh"
      backgroundColor="var(--amplify-colors-background-secondary)"
    >
      <Flex
        as="header"
        justifyContent="space-between"
        alignItems="center"
        padding="medium"
        backgroundColor="var(--amplify-colors-background-primary)"
        boxShadow="small"
      >
        <Heading level={2}>Hệ thống LMS</Heading>
        <Flex alignItems="center">
          <Text>{user?.username || 'User'}</Text>
          {userRole && (
            <Badge variation="info" marginLeft="small">
              {userRole}
            </Badge>
          )}
          <Button onClick={signOut} marginLeft="medium">
            Đăng xuất
          </Button>
        </Flex>
      </Flex>

      <main>{renderDashboardByRole()}</main>
    </View>
  );
};

/* =================================================================
   5. WRAP APP VỚI BỘ XÁC THỰC
   ================================================================= */
const AppWithAuth = withAuthenticator(AppContent);

export default function App() {
  return (
    <ThemeProvider theme={lmsTheme} colorMode="light">
      <div className="auth-gradient">
        <AppWithAuth />
      </div>
    </ThemeProvider>
  );
}

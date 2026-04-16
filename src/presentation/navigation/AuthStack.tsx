import React, {Suspense} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {AuthStackParamList} from './types';

const LoginScreen = React.lazy(() => import('@presentation/screens/LoginScreen'));
const SignUpScreen = React.lazy(() => import('@presentation/screens/SignUpScreen'));
const ForgotPasswordScreen = React.lazy(
  () => import('@presentation/screens/ForgotPasswordScreen'),
);
const ResetPasswordScreen = React.lazy(
  () => import('@presentation/screens/ResetPasswordScreen'),
);

const Stack = createNativeStackNavigator<AuthStackParamList>();

function LazyFallback() {
  return (
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
      <ActivityIndicator size="small" />
    </View>
  );
}

export default function AuthStack() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}

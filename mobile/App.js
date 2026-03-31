import React, { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import { store } from './src/store';
import { loadUser } from './src/store/slices/authSlice';
import AppNavigator from './src/navigation/AppNavigator';

function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadUser());
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

import React, { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { store, persistor } from './src/store';
import { loadUser } from './src/store/slices/authSlice';
import AppNavigator from './src/navigation/AppNavigator';
import { paperTheme } from './src/constants/theme';

function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadUser());
  }, []);

  return (
    <PaperProvider theme={paperTheme}>
      <StatusBar style="auto" />
      <AppNavigator />
    </PaperProvider>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
}

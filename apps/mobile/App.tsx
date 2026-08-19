import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, NativeModules, AppState } from 'react-native';
import { useEffect, useState, useRef } from 'react';

const { AgentModule } = NativeModules;

export default function App() {
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const appState = useRef(AppState.currentState);

  const checkPermissions = async () => {
    if (AgentModule && AgentModule.checkAccessibilityPermission) {
      const isEnabled = await AgentModule.checkAccessibilityPermission();
      setAccessibilityEnabled(isEnabled);
    }
  };

  useEffect(() => {
    checkPermissions();
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        checkPermissions();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Mobile Operator</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Accessibility Service</Text>
        <Text style={styles.status}>
          Status: {accessibilityEnabled ? "✅ Enabled" : "❌ Disabled"}
        </Text>
        {!accessibilityEnabled && (
          <Button 
            title="Enable in Settings" 
            onPress={() => AgentModule?.openAccessibilitySettings()} 
          />
        )}
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  status: {
    fontSize: 16,
    marginBottom: 16,
  }
});

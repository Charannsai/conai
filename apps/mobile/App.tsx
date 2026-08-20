import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, NativeModules, AppState } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

const { AgentModule } = NativeModules;

export default function App() {
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const appState = useRef(AppState.currentState);

  const checkPermissions = async () => {
    if (AgentModule && AgentModule.checkAccessibilityPermission) {
      const isEnabled = await AgentModule.checkAccessibilityPermission();
      setAccessibilityEnabled(isEnabled);
    }
  };

  const toggleScreenCapture = async () => {
    if (!AgentModule) return;
    if (capturing) {
      AgentModule.stopScreenCapture();
      setCapturing(false);
    } else {
      try {
        const started = await AgentModule.requestScreenCapture();
        if (started) {
          setCapturing(true);
        }
      } catch (err) {
        console.error("Screen capture error", err);
      }
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
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.background}
      />
      
      <View style={styles.content}>
        <Text style={styles.title}>AI Mobile Operator</Text>
        <Text style={styles.subtitle}>Autonomous Device Control</Text>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Agent Core Services</Text>
          
          {/* Tactical Controller Service */}
          <View style={styles.serviceRow}>
            <View>
              <Text style={styles.serviceName}>Tactical Controller</Text>
              <Text style={styles.serviceDesc}>Injects advanced touch gestures</Text>
            </View>
            <View style={[styles.statusBadge, accessibilityEnabled ? styles.statusEnabled : styles.statusDisabled]}>
              <Text style={styles.statusText}>{accessibilityEnabled ? "ACTIVE" : "OFFLINE"}</Text>
            </View>
          </View>

          {!accessibilityEnabled && (
            <TouchableOpacity 
              style={styles.button}
              onPress={() => AgentModule?.openAccessibilitySettings()}
            >
              <LinearGradient
                colors={['#e94560', '#d83a56']}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Enable Agent Controller</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Real-time Video Streamer */}
          <View style={[styles.serviceRow, { marginTop: 20 }]}>
            <View>
              <Text style={styles.serviceName}>Live Video Streamer</Text>
              <Text style={styles.serviceDesc}>60 FPS hardware screen mirror</Text>
            </View>
            <View style={[styles.statusBadge, capturing ? styles.statusEnabled : styles.statusDisabled]}>
              <Text style={styles.statusText}>{capturing ? "STREAMING" : "OFFLINE"}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.button}
            onPress={toggleScreenCapture}
          >
            <LinearGradient
              colors={capturing ? ['#ff4757', '#e84118'] : ['#00d2d3', '#01a3a4']}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>
                {capturing ? "Stop Live Video Stream" : "Start Live Video Stream (60 FPS)"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0aab2',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  serviceDesc: {
    fontSize: 13,
    color: '#8b9bb4',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusEnabled: {
    backgroundColor: 'rgba(46, 213, 115, 0.2)',
  },
  statusDisabled: {
    backgroundColor: 'rgba(255, 71, 87, 0.2)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  }
});

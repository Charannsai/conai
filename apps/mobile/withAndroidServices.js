const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withAndroidServices(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];

    // Add Accessibility Service
    const accessibilityService = {
      $: {
        "android:name": ".AgentAccessibilityService",
        "android:permission": "android.permission.BIND_ACCESSIBILITY_SERVICE",
        "android:exported": "true",
      },
      "intent-filter": [
        {
          action: [
            {
              $: {
                "android:name": "android.accessibilityservice.AccessibilityService",
              },
            },
          ],
        },
      ],
      "meta-data": [
        {
          $: {
            "android:name": "android.accessibilityservice",
            "android:resource": "@xml/accessibility_service_config",
          },
        },
      ],
    };

    // Add MediaProjection Foreground Service
    const mediaProjectionService = {
      $: {
        "android:name": ".AgentScreenCaptureService",
        "android:enabled": "true",
        "android:exported": "false",
        "android:foregroundServiceType": "mediaProjection",
      },
    };

    if (!application.service) {
      application.service = [];
    }
    
    // Avoid duplicates
    const hasAccessibility = application.service.some(s => s.$["android:name"] === ".AgentAccessibilityService");
    if (!hasAccessibility) {
      application.service.push(accessibilityService);
    }
    
    const hasMedia = application.service.some(s => s.$["android:name"] === ".AgentScreenCaptureService");
    if (!hasMedia) {
      application.service.push(mediaProjectionService);
    }

    return config;
  });
};

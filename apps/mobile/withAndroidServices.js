const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");

const withAndroidServices = (config) => {
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

const withStrings = (config) => {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const fs = require("fs");
      const path = require("path");

      const stringsPath = path.join(
        config.modRequest.platformProjectRoot,
        "app/src/main/res/values/strings.xml"
      );

      if (fs.existsSync(stringsPath)) {
        let content = fs.readFileSync(stringsPath, "utf8");
        if (!content.includes("accessibility_service_description")) {
          content = content.replace(
            "</resources>",
            `    <string name="accessibility_service_description">AI Agent Touch Controller</string>\n</resources>`
          );
          fs.writeFileSync(stringsPath, content);
        }
      }
      return config;
    },
  ]);
};

const withAccessibilityServiceXml = (config) => {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const fs = require("fs");
      const path = require("path");

      const resDir = path.join(
        config.modRequest.platformProjectRoot,
        "app/src/main/res/xml"
      );
      
      if (!fs.existsSync(resDir)) {
        fs.mkdirSync(resDir, { recursive: true });
      }

      const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeAllMask"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagDefault"
    android:canPerformGestures="true"
    android:canRetrieveWindowContent="true"
    android:description="@string/accessibility_service_description" />
`;

      fs.writeFileSync(path.join(resDir, "accessibility_service_config.xml"), xmlContent);
      return config;
    },
  ]);
};

module.exports = function withAndroidConfig(config) {
  config = withAndroidServices(config);
  config = withAccessibilityServiceXml(config);
  config = withStrings(config);
  return config;
};

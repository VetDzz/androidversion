package dz.vet.vetdz;

import android.os.Bundle;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "VetDzMain";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Get FCM token and inject into WebView
        initializeFCM();
    }

    private void initializeFCM() {
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Log.w(TAG, "Fetching FCM token failed", task.getException());
                    return;
                }

                String token = task.getResult();
                Log.d(TAG, "FCM Token: " + token);
                
                // Inject token into WebView
                injectFCMToken(token);
            });
    }

    private void injectFCMToken(String token) {
        runOnUiThread(() -> {
            try {
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    // Store token in localStorage and dispatch event
                    String js = "javascript:(function() {" +
                        "localStorage.setItem('fcm_token', '" + token + "');" +
                        "window.dispatchEvent(new CustomEvent('fcmTokenReceived', { detail: { token: '" + token + "' } }));" +
                        "console.log('FCM token injected');" +
                    "})()";
                    webView.evaluateJavascript(js, null);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error injecting FCM token", e);
            }
        });
    }

    // JavaScript interface for WebView to call native methods
    public class AndroidBridge {
        @JavascriptInterface
        public String getFCMToken() {
            return VetDzFirebaseMessagingService.getSavedToken(MainActivity.this);
        }

        @JavascriptInterface
        public void setNotificationsEnabled(boolean enabled) {
            getSharedPreferences("VetDzPrefs", MODE_PRIVATE)
                .edit()
                .putBoolean("notifications_enabled", enabled)
                .apply();
        }
    }
}

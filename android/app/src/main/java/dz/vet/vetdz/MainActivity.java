package dz.vet.vetdz;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "VetDzMain";
    private String fcmToken = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Get FCM token
        initializeFCM();
    }

    @Override
    public void onResume() {
        super.onResume();
        // Re-inject token when app resumes
        if (fcmToken != null) {
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                injectFCMToken(fcmToken);
            }, 1000);
        }
    }

    private void initializeFCM() {
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Log.w(TAG, "Fetching FCM token failed", task.getException());
                    return;
                }

                fcmToken = task.getResult();
                Log.d(TAG, "FCM Token: " + fcmToken);
                
                // Save to SharedPreferences
                getSharedPreferences("VetDzPrefs", MODE_PRIVATE)
                    .edit()
                    .putString("fcm_token", fcmToken)
                    .apply();
                
                // Wait for WebView to be ready, then inject token
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    injectFCMToken(fcmToken);
                }, 2000);
            });
    }

    private void injectFCMToken(String token) {
        if (token == null) return;
        
        runOnUiThread(() -> {
            try {
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    // Store token in localStorage and dispatch event
                    String js = "javascript:(function() {" +
                        "try {" +
                        "  localStorage.setItem('fcm_token', '" + token + "');" +
                        "  console.log('FCM token stored in localStorage');" +
                        "  var event = new CustomEvent('fcmTokenReceived', { detail: { token: '" + token + "' } });" +
                        "  window.dispatchEvent(event);" +
                        "  console.log('FCM token event dispatched');" +
                        "} catch(e) { console.error('FCM inject error:', e); }" +
                        "})()";
                    webView.evaluateJavascript(js, null);
                    Log.d(TAG, "FCM token injected into WebView");
                }
            } catch (Exception e) {
                Log.e(TAG, "Error injecting FCM token", e);
            }
        });
    }
}

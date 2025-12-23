package dz.vet.vetdz;

import android.content.Intent;
import android.net.Uri;
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
        
        // Handle deep link if app was opened via URL
        handleIntent(getIntent());
        
        // Get FCM token
        initializeFCM();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
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

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        
        Uri data = intent.getData();
        if (data != null) {
            String url = data.toString();
            Log.d(TAG, "Deep link received: " + url);
            
            // Handle OAuth callback from custom scheme (dz.vet.vetdz://auth/callback)
            if (url.startsWith("dz.vet.vetdz://")) {
                Log.d(TAG, "Custom scheme OAuth callback");
                // Extract the fragment/query from the URL
                String fragment = data.getFragment();
                String query = data.getQuery();
                
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    try {
                        WebView webView = getBridge().getWebView();
                        if (webView != null) {
                            String js;
                            if (fragment != null && fragment.contains("access_token")) {
                                // Has hash params (implicit flow)
                                js = "javascript:(function() {" +
                                    "window.location.hash = '#" + fragment + "';" +
                                    "window.dispatchEvent(new HashChangeEvent('hashchange'));" +
                                    "console.log('OAuth hash set');" +
                                    "})()";
                            } else if (query != null && query.contains("code=")) {
                                // Has query params (PKCE flow)
                                js = "javascript:(function() {" +
                                    "window.location.href = '/#/auth/callback?" + query + "';" +
                                    "console.log('OAuth code redirect');" +
                                    "})()";
                            } else {
                                // Just navigate to callback
                                js = "javascript:window.location.href = '/#/auth/callback';";
                            }
                            webView.evaluateJavascript(js, null);
                            Log.d(TAG, "OAuth callback processed");
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error processing OAuth callback", e);
                    }
                }, 500);
                return;
            }
            
            // Handle other deep links (https scheme)
            if (url.contains("auth/v1/callback") || url.contains("access_token") || url.contains("code=")) {
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    navigateToUrl(url);
                }, 500);
            }
        }
    }

    private void navigateToUrl(String url) {
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                // Extract the hash/query params and navigate
                String js;
                if (url.contains("#")) {
                    // Has hash params (implicit flow)
                    String hash = url.substring(url.indexOf("#"));
                    js = "javascript:window.location.hash = '" + hash + "'; window.dispatchEvent(new HashChangeEvent('hashchange'));";
                } else if (url.contains("?")) {
                    // Has query params (PKCE flow)
                    js = "javascript:window.location.href = '" + url + "';";
                } else {
                    js = "javascript:window.location.href = '" + url + "';";
                }
                webView.evaluateJavascript(js, null);
                Log.d(TAG, "Navigated to OAuth callback");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error navigating to URL", e);
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

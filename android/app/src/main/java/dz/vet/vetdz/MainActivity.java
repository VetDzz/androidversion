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
                String fragment = data.getFragment();
                String query = data.getQuery();
                
                // Wait longer for WebView to be fully ready
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    try {
                        WebView webView = getBridge().getWebView();
                        if (webView != null) {
                            String targetUrl;
                            
                            if (fragment != null && fragment.contains("access_token")) {
                                // Implicit flow - has access_token in fragment
                                targetUrl = "/#/auth/callback#" + fragment;
                            } else if (query != null && query.contains("access_token")) {
                                // Access token in query
                                targetUrl = "/#/auth/callback#" + query.replace("&", "&");
                            } else if (query != null && query.contains("code=")) {
                                // PKCE flow - has code in query
                                targetUrl = "/#/auth/callback?" + query;
                            } else if (query != null) {
                                // Other query params
                                targetUrl = "/#/auth/callback?" + query;
                            } else if (fragment != null) {
                                // Other fragment
                                targetUrl = "/#/auth/callback#" + fragment;
                            } else {
                                // Fallback
                                targetUrl = "/#/auth/callback";
                            }
                            
                            Log.d(TAG, "Navigating to: " + targetUrl);
                            String js = "javascript:window.location.href = '" + targetUrl + "';";
                            webView.evaluateJavascript(js, null);
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error processing OAuth callback", e);
                    }
                }, 1000);
                return;
            }
            
            // Handle https scheme OAuth callbacks
            if (url.contains("access_token") || url.contains("code=")) {
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    try {
                        WebView webView = getBridge().getWebView();
                        if (webView != null) {
                            // Extract tokens and navigate to auth callback
                            String targetUrl;
                            if (url.contains("#access_token") || url.contains("#/auth/callback#access_token")) {
                                int tokenStart = url.indexOf("access_token");
                                String tokenPart = url.substring(tokenStart);
                                targetUrl = "/#/auth/callback#" + tokenPart;
                            } else if (url.contains("?code=")) {
                                int codeStart = url.indexOf("?code=");
                                String codePart = url.substring(codeStart + 1);
                                targetUrl = "/#/auth/callback?" + codePart;
                            } else {
                                targetUrl = "/#/auth/callback";
                            }
                            
                            Log.d(TAG, "HTTPS OAuth navigating to: " + targetUrl);
                            String js = "javascript:window.location.href = '" + targetUrl + "';";
                            webView.evaluateJavascript(js, null);
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error navigating OAuth", e);
                    }
                }, 1000);
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

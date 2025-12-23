package dz.vet.vetdz;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.app.Activity;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.widget.ProgressBar;
import android.widget.FrameLayout;
import android.graphics.Bitmap;
import android.os.Build;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.app.DownloadManager;
import android.content.Context;
import android.os.Environment;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.splashscreen.SplashScreen;

import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "VetDZ";
    private static final String WEB_URL = "https://vet-dzz.vercel.app";
    private static final String AUTH_URL = "https://vet-dzz.vercel.app/#/auth";
    
    private WebView webView;
    private ProgressBar progressBar;
    private ValueCallback<Uri[]> fileUploadCallback;
    private static final int FILE_CHOOSER_REQUEST_CODE = 1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Handle splash screen
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        // Make status bar transparent
        getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        
        // Initialize views
        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);
        
        // Setup WebView
        setupWebView();
        
        // Setup Firebase
        setupFirebase();
        
        // Handle intent (for OAuth callbacks)
        handleIntent(getIntent());
        
        // Always start at auth page - the web app will redirect if already logged in
        // This ensures proper session handling from localStorage
        webView.loadUrl(AUTH_URL);
    }
    
    private void setupWebView() {
        WebSettings webSettings = webView.getSettings();
        
        // Enable JavaScript
        webSettings.setJavaScriptEnabled(true);
        
        // Enable DOM storage
        webSettings.setDomStorageEnabled(true);
        
        // Enable database
        webSettings.setDatabaseEnabled(true);
        
        // Enable caching
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        
        // Enable zoom
        webSettings.setSupportZoom(true);
        webSettings.setBuiltInZoomControls(true);
        webSettings.setDisplayZoomControls(false);
        
        // Enable responsive design
        webSettings.setUseWideViewPort(true);
        webSettings.setLoadWithOverviewMode(true);
        
        // Enable file access
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        
        // Enable mixed content (for OAuth)
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        
        // Enable cookies
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);
        
        // Set user agent to include app identifier
        String userAgent = webSettings.getUserAgentString();
        webSettings.setUserAgentString(userAgent + " VetDZ-Android/1.0");
        
        // WebView client for handling navigation
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                progressBar.setVisibility(View.VISIBLE);
                Log.d(TAG, "Loading: " + url);
            }
            
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                progressBar.setVisibility(View.GONE);
                
                // Inject JavaScript to pass FCM token to web app
                injectFCMToken();
            }
            
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                
                // Handle OAuth callbacks
                if (url.contains("auth/callback") || url.contains("oauth")) {
                    Log.d(TAG, "OAuth callback detected: " + url);
                    view.loadUrl(url);
                    return false;
                }
                
                // Handle external links (phone, email, maps)
                if (url.startsWith("tel:") || url.startsWith("mailto:") || 
                    url.startsWith("geo:") || url.contains("maps.google.com") ||
                    url.contains("google.com/maps")) {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                }
                
                // Handle Google/Facebook OAuth
                if (url.contains("accounts.google.com") || 
                    url.contains("facebook.com/login") ||
                    url.contains("facebook.com/v") ||
                    url.contains("m.facebook.com")) {
                    // Let WebView handle OAuth
                    return false;
                }
                
                // Keep navigation within WebView for our domain
                if (url.contains("vet-dzz.vercel.app") || 
                    url.contains("supabase.co") ||
                    url.contains("localhost")) {
                    return false;
                }
                
                // Open other external links in browser
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                startActivity(intent);
                return true;
            }
        });
        
        // Chrome client for file uploads and progress
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
            }
            
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = filePathCallback;
                
                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                } catch (Exception e) {
                    fileUploadCallback = null;
                    return false;
                }
                return true;
            }
        });
        
        // Handle file downloads
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                request.setMimeType(mimeType);
                request.addRequestHeader("User-Agent", userAgent);
                request.setDescription("Downloading file...");
                request.setTitle(Uri.parse(url).getLastPathSegment());
                request.allowScanningByMediaScanner();
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, Uri.parse(url).getLastPathSegment());
                
                DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                dm.enqueue(request);
                
                Toast.makeText(getApplicationContext(), "Téléchargement en cours...", Toast.LENGTH_SHORT).show();
            }
        });
    }
    
    private void setupFirebase() {
        // Get FCM token
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Log.w(TAG, "Fetching FCM registration token failed", task.getException());
                    return;
                }
                
                String token = task.getResult();
                Log.d(TAG, "FCM Token: " + token);
                
                // Store token for later injection
                getSharedPreferences("VetDZ", MODE_PRIVATE)
                    .edit()
                    .putString("fcm_token", token)
                    .apply();
            });
        
        // Subscribe to topics
        FirebaseMessaging.getInstance().subscribeToTopic("all_users");
    }
    
    private void injectFCMToken() {
        String token = getSharedPreferences("VetDZ", MODE_PRIVATE)
            .getString("fcm_token", null);
        
        if (token != null) {
            String js = "javascript:(function() { " +
                "if (window.localStorage) { " +
                "  window.localStorage.setItem('fcm_token', '" + token + "'); " +
                "  window.dispatchEvent(new CustomEvent('fcmTokenReceived', { detail: '" + token + "' })); " +
                "} " +
                "})()";
            webView.evaluateJavascript(js, null);
        }
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }
    
    private void handleIntent(Intent intent) {
        if (intent == null) return;
        
        Uri data = intent.getData();
        if (data != null) {
            String url = data.toString();
            Log.d(TAG, "Deep link received: " + url);
            
            // Handle OAuth callback deep links
            if (url.contains("auth") || url.contains("callback")) {
                // Convert deep link to web URL
                String webUrl = WEB_URL + "/#/auth/callback" + (data.getQuery() != null ? "?" + data.getQuery() : "");
                webView.loadUrl(webUrl);
            }
        }
        
        // Handle notification click
        Bundle extras = intent.getExtras();
        if (extras != null && extras.containsKey("notification_url")) {
            String notificationUrl = extras.getString("notification_url");
            if (notificationUrl != null) {
                webView.loadUrl(notificationUrl);
            }
        }
    }
    
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (fileUploadCallback != null) {
                Uri[] results = null;
                if (resultCode == Activity.RESULT_OK && data != null) {
                    String dataString = data.getDataString();
                    if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    }
                }
                fileUploadCallback.onReceiveValue(results);
                fileUploadCallback = null;
            }
        }
    }
    
    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}

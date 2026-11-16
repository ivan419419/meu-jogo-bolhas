"""Build a disposable Android debug project from the checked-out web game.
No keys, secrets, web production files, or generated assets are committed.
"""
from pathlib import Path
import shutil, subprocess
root=Path(__file__).resolve().parent
app=root/'android-preview'
if app.exists(): shutil.rmtree(app)
assets=app/'app/src/main/assets/web'
assets.mkdir(parents=True)
for name in ['index.html','icon-192.png','icon-512.png','manifest.json','sw.js']:
    shutil.copy2(root/name,assets/name)
# Adapt a TEMPORARY copy of the TypeScript and HTML for Android, keeping web source unchanged.
source=(root/'game/browser.ts').read_text(encoding='utf-8')
old='const url = new URL(window.location.href);'
assert source.count(old)==1
source=source.replace(old,'const url = new URL(window.location.hostname === "appassets.androidplatform.net" ? "https://meu-jogo-bolhas.vercel.app/" : window.location.href);')
old='window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);'
assert source.count(old)==1
source=source.replace(old,'window.history.replaceState(window.history.state, "", `${window.location.pathname}${url.search}${window.location.hash}`);')
tmp=root/'game/browser-android-temp.ts'
try:
    tmp.write_text(source,encoding='utf-8')
    result=subprocess.run(['./node_modules/.bin/esbuild',str(tmp.relative_to(root)),'--bundle','--format=iife','--target=es2020','--minify','--legal-comments=none'],cwd=root,capture_output=True,text=True,check=True)
finally:
    tmp.unlink(missing_ok=True)
template=(root/'scripts/index.template.html').read_text(encoding='utf-8')
assert template.count('__GAME_BUNDLE__')==1
html=template.replace('__GAME_BUNDLE__',result.stdout).replace('<script defer src="/_vercel/insights/script.js"></script>','')
# Web Share -> Android chooser, exposed only to our own bundled local page.
bridge='''<script>if(window.AndroidShare){try{Object.defineProperty(navigator,"share",{configurable:true,value:async function(v){window.AndroidShare.share(String(v.title||""),String(v.text||""),String(v.url||""));}});}catch(e){}}</script>'''
html=html.replace('</head>',bridge+'\n</head>')
(assets/'index.html').write_text(html,encoding='utf-8')
settings='''pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }\ndependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }\nrootProject.name = "BolhasAndroidPreview"\ninclude(":app")\n'''
(app/'settings.gradle').write_text(settings)
(app/'build.gradle').write_text("plugins { id 'com.android.application' version '8.9.2' apply false }\n")
(app/'gradle.properties').write_text('android.useAndroidX=true\norg.gradle.jvmargs=-Xmx2g -Dfile.encoding=UTF-8\n')
(app/'app/build.gradle').write_text('''plugins { id 'com.android.application' }\nandroid { namespace 'br.com.ivanmoreira.bolhas.preview'\n compileSdk 36\n defaultConfig { applicationId 'br.com.ivanmoreira.bolhas.preview'; minSdk 23; targetSdk 36; versionCode 1; versionName '0.1-preview' }\n}\ndependencies { implementation 'androidx.webkit:webkit:1.12.1' }\n''')
manifest='''<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application android:label="Bolhas em Órbita (teste)" android:theme="@android:style/Theme.Material.NoActionBar" android:usesCleartextTraffic="false" android:allowBackup="false" android:icon="@drawable/ic_launcher"><activity android:name=".MainActivity" android:exported="true"><intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter></activity></application></manifest>'''
(app/'app/src/main/AndroidManifest.xml').write_text(manifest)
draw=app/'app/src/main/res/drawable';draw.mkdir(parents=True);shutil.copy2(root/'icon-192.png',draw/'ic_launcher.png')
java=app/'app/src/main/java/br/com/ivanmoreira/bolhas/preview/MainActivity.java';java.parent.mkdir(parents=True)
java.write_text(r'''package br.com.ivanmoreira.bolhas.preview;
import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.view.View;
import androidx.webkit.WebViewAssetLoader;

public final class MainActivity extends Activity {
  private WebView web;
  private final class ShareBridge {
    @JavascriptInterface public void share(String title, String text, String url) {
      if (!url.startsWith("https://meu-jogo-bolhas.vercel.app/")) return;
      runOnUiThread(() -> { Intent send = new Intent(Intent.ACTION_SEND); send.setType("text/plain"); send.putExtra(Intent.EXTRA_SUBJECT, title); send.putExtra(Intent.EXTRA_TEXT, text + "\n" + url); startActivity(Intent.createChooser(send, "Compartilhar desafio")); });
    }
  }
  @Override public void onCreate(Bundle state) { super.onCreate(state);
    web = new WebView(this); setContentView(web);
    web.getSettings().setJavaScriptEnabled(true); web.getSettings().setDomStorageEnabled(true);
    web.getSettings().setAllowFileAccess(false); web.getSettings().setAllowContentAccess(false);
    web.getSettings().setJavaScriptCanOpenWindowsAutomatically(false);
    web.addJavascriptInterface(new ShareBridge(), "AndroidShare");
    WebViewAssetLoader loader = new WebViewAssetLoader.Builder().addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
    web.setWebViewClient(new WebViewClient() {
      @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) { return loader.shouldInterceptRequest(request.getUrl()); }
      @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        Uri u=request.getUrl(); if ("https".equals(u.getScheme()) && "appassets.androidplatform.net".equals(u.getHost()) && u.getPath()!=null && u.getPath().startsWith("/assets/")) return false;
        if ("https".equals(u.getScheme()) || "http".equals(u.getScheme())) { try { startActivity(new Intent(Intent.ACTION_VIEW,u)); } catch (Exception ignored) {} }
        return true;
      }
    });
    web.loadUrl("https://appassets.androidplatform.net/assets/web/index.html");
  }
  @Override @SuppressWarnings("deprecation") public void onBackPressed() { if(web.canGoBack()) web.goBack(); else super.onBackPressed(); }
}
''',encoding='utf-8')
print('Android debug project generated in',app)

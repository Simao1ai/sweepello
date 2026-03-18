import SwiftUI
import WebKit

struct WebAuthView: UIViewRepresentable {
    let url: URL
    let onAuthenticated: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onAuthenticated: onAuthenticated)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    class Coordinator: NSObject, WKNavigationDelegate {
        let onAuthenticated: () -> Void
        private let baseHost: String?

        init(onAuthenticated: @escaping () -> Void) {
            self.onAuthenticated = onAuthenticated
            self.baseHost = URL(string: Configuration.apiBaseURL)?.host
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            guard let url = webView.url, let baseHost = baseHost else { return }

            // After OIDC flow completes, user is redirected back to the app's base URL
            if url.host == baseHost && (url.path == "/" || url.path.isEmpty) {
                // Transfer cookies from WKWebView to URLSession's cookie storage
                webView.configuration.websiteDataStore.httpCookieStore.getAllCookies { cookies in
                    for cookie in cookies {
                        HTTPCookieStorage.shared.setCookie(cookie)
                    }
                    DispatchQueue.main.async {
                        self.onAuthenticated()
                    }
                }
            }
        }
    }
}

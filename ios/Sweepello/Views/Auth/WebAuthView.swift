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
        private var didComplete = false

        init(onAuthenticated: @escaping () -> Void) {
            self.onAuthenticated = onAuthenticated
            self.baseHost = URL(string: Configuration.apiBaseURL)?.host?.lowercased()
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            guard !didComplete,
                  let url = webView.url,
                  let baseHost = baseHost,
                  let urlHost = url.host?.lowercased() else { return }

            // Must be on our domain
            guard urlHost == baseHost else { return }

            // Skip auth flow endpoints — still in the OIDC process
            let authPaths = ["/api/login", "/api/callback"]
            if authPaths.contains(url.path) { return }

            // Auth complete — user was redirected back to the app
            didComplete = true

            // Transfer cookies from WKWebView to URLSession's shared cookie storage
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

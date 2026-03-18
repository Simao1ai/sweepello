import Foundation

enum Configuration {
    // MARK: - API Configuration
    // Update this to your Sweepello backend URL
    static let apiBaseURL: String = {
        if let url = ProcessInfo.processInfo.environment["SWEEPELLO_API_URL"] {
            return url
        }
        #if DEBUG
        return "http://localhost:5000"
        #else
        return "https://your-sweepello-app.replit.app"
        #endif
    }()

    static let wsBaseURL: String = {
        let base = apiBaseURL
            .replacingOccurrences(of: "https://", with: "wss://")
            .replacingOccurrences(of: "http://", with: "ws://")
        return "\(base)/ws"
    }()

    // MARK: - App Info
    static let appName = "Sweepello"
    static let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"

    // MARK: - Timeouts
    static let requestTimeout: TimeInterval = 30
    static let wsReconnectDelay: TimeInterval = 3
    static let jobOfferExpiry: TimeInterval = 30 * 60 // 30 minutes
}
